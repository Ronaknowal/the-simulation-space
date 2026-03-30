import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Force Node.js runtime — required for child_process.spawn
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * POST /api/simulate
 *
 * Spawns Python simulation engine, proxies stdout SSE to client.
 * Uses TransformStream for proper Next.js streaming support.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const seed = typeof body.seed === 'string' ? body.seed.trim() : '';
  if (!seed) {
    return Response.json({ error: 'Missing required field: seed' }, { status: 400 });
  }

  const config = {
    agentCount: typeof body.config?.agentCount === 'number' ? body.config.agentCount : 10,
    durationMinutes: typeof body.config?.durationMinutes === 'number' ? body.config.durationMinutes : 30,
    focusSectors: Array.isArray(body.config?.focusSectors) ? body.config.focusSectors : [],
    geographicScope: Array.isArray(body.config?.geographicScope) ? body.config.geographicScope : [],
  };

  const engineDir = path.join(process.cwd(), 'src', 'simulation-engine');
  const scriptPath = path.join(engineDir, 'run_simulation.py');

  const venvPython = process.platform === 'win32'
    ? path.join(engineDir, '.venv', 'Scripts', 'python.exe')
    : path.join(engineDir, '.venv', 'bin', 'python');

  const pythonPath = process.env.SIMULATION_PYTHON
    || (fs.existsSync(venvPython) ? venvPython : 'python');

  const inputJson = JSON.stringify({
    simId: body.simId || `sim-${Date.now()}`,
    seed,
    config,
  });

  const env = {
    ...process.env,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    LLM_API_KEY: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '',
    LLM_BASE_URL: process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
    LLM_MODEL_NAME: process.env.LLM_MODEL_NAME || 'gemini-2.5-flash',
    ZEP_API_KEY: process.env.ZEP_API_KEY || '',
    PYTHONUNBUFFERED: '1',
  };

  // Use TransformStream — works with Next.js streaming
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Start Python process in the background
  (async () => {
    try {
      const child = spawn(pythonPath, [scriptPath], {
        cwd: engineDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.stdin.write(inputJson);
      child.stdin.end();

      // Send an initial keepalive comment so the browser knows the stream is alive
      await writer.write(encoder.encode(': keepalive\n\n'));

      child.stdout.on('data', async (chunk: Buffer) => {
        try {
          await writer.write(encoder.encode(chunk.toString()));
        } catch { /* closed */ }
      });

      let stderrBuffer = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
        if (stderrBuffer.length > 5000) stderrBuffer = stderrBuffer.slice(-2000);
      });

      await new Promise<void>((resolve) => {
        child.on('close', async (code) => {
          if (code !== 0 && code !== null) {
            const errMsg = stderrBuffer.trim().split('\n').pop() || `Exit code ${code}`;
            try {
              await writer.write(encoder.encode(
                `event: error\ndata: ${JSON.stringify({ message: errMsg })}\n\n`
              ));
            } catch { /* closed */ }
          }
          resolve();
        });

        child.on('error', async (err) => {
          try {
            await writer.write(encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
            ));
          } catch { /* closed */ }
          resolve();
        });
      });
    } catch (err: any) {
      try {
        await writer.write(encoder.encode(
          `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
        ));
      } catch { /* closed */ }
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
