import { NextRequest } from 'next/server';

// Allow up to 5 minutes for simulation
export const maxDuration = 300;
export const revalidate = 0;

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map<string, { data: SimulationResult; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ── Types ────────────────────────────────────────────────────────────────────

interface SimulationConfig {
  agentCount: number;
  durationMinutes: number;
  focusSectors: string[];
  geographicScope: string[];
}

interface AgentAction {
  agentId: string;
  agentRole: string;
  action: string;
  simulatedTime: string;
}

interface SectorImpact {
  sector: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedEntities: string[];
  confidence: number;
}

interface MarketImpact {
  ticker: string;
  name: string;
  predictedChange: number;
  confidence: number;
  reasoning: string;
}

interface SimulationResult {
  simulationId: string;
  agentActions: AgentAction[];
  impacts: SectorImpact[];
  marketImpacts: MarketImpact[];
  report: string;
  totalAgents: number;
  elapsed: number;
}

// ── JSON extraction ──────────────────────────────────────────────────────────

function extractJSON(content: string): any | null {
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;
  const jsonStr = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try fixing trailing commas
    const fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    try { return JSON.parse(fixed); } catch { return null; }
  }
}

// ── Gemini API call ──────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  messages: object[]
): Promise<any> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages,
        temperature: 0.8,
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(120_000),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API error ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

// ── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(config: SimulationConfig): string {
  const sectors = config.focusSectors.length > 0
    ? config.focusSectors.join(', ')
    : 'all sectors';
  const regions = config.geographicScope.length > 0
    ? config.geographicScope.join(', ')
    : 'global';

  return `You are a global event simulation engine. Given a seed event, you simulate how it propagates through the global system.

SIMULATION PARAMETERS:
- Target agent count: ${config.agentCount}
- Simulation duration: ${config.durationMinutes} minutes of simulated time
- Focus sectors: ${sectors}
- Geographic scope: ${regions}

You will generate a realistic simulation with:
1. Agent actions: How different actors (companies, governments, logistics operators, financial analysts) respond to the event over time
2. Cascading impacts: How the event ripples across sectors (rated HIGH/MEDIUM/LOW severity)
3. Market impacts: Predicted stock price changes for affected companies with confidence scores
4. A final analysis report summarizing the simulation outcomes

Output your simulation as a JSON object with this EXACT structure:
{
  "agentActions": [
    {"agentId": "agent-1", "agentRole": "TSMC Procurement", "action": "Seeking alternative Nd sources from Australia", "simulatedTime": "+1 month"},
    {"agentId": "agent-2", "agentRole": "US DoD Logistics", "action": "Activating strategic reserves of rare earth elements", "simulatedTime": "+2 weeks"}
  ],
  "impacts": [
    {"sector": "Defense", "severity": "HIGH", "description": "67% of defense agents report critical supply disruption", "affectedEntities": ["Lockheed Martin", "Raytheon", "BAE Systems"], "confidence": 0.85}
  ],
  "marketImpacts": [
    {"ticker": "LMT", "name": "Lockheed Martin", "predictedChange": -12.5, "confidence": 0.7, "reasoning": "Supply chain disruption for rare earth dependent systems"}
  ],
  "report": "Detailed multi-paragraph analysis report text covering key findings, cascading effects, timeline, and recommendations..."
}

RULES:
- Generate at least ${Math.max(10, Math.floor(config.agentCount / 5))} agent actions across the full simulation timeline
- Generate at least 5 sector impacts with varied severity levels
- Generate at least 8 market impacts with realistic ticker symbols, price change percentages, and confidence scores
- Agent actions should span the full simulated duration (e.g., "+1 week", "+1 month", "+3 months", "+6 months")
- Consider: supply chain dependencies, geopolitical alliances, financial interconnections, second-order effects, and cascading failures
- Severity: HIGH = critical disruption (>50% probability of major impact), MEDIUM = significant but manageable, LOW = minor or indirect
- Market changes should be realistic percentages (typically -30% to +20% range)
- Confidence scores range from 0.0 to 1.0
- The report should be 3-5 paragraphs with actionable analysis
- Output ONLY valid JSON — no markdown, no explanation outside the JSON`;
}

// ── Simulation runner ────────────────────────────────────────────────────────

function generateSimId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `sim-${ts}-${rand}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runSimulation(
  seed: string,
  config: SimulationConfig,
  sendEvent: (event: string, data: object) => void
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendEvent('error', {
      message: 'GEMINI_API_KEY is not configured. Add it to .env.local to enable simulation. Get a free key at https://aistudio.google.com/apikey',
    });
    return;
  }

  const simId = generateSimId();
  const startTime = Date.now();

  // Check cache
  const cacheKey = `${seed}::${JSON.stringify(config)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    sendEvent('status', { phase: 'cached', message: 'Loaded simulation from cache.' });
    // Re-stream cached results with brief delays for UI effect
    for (const action of cached.data.agentActions) {
      sendEvent('agent_action', action);
      await delay(50);
    }
    for (const impact of cached.data.impacts) {
      sendEvent('impact', impact);
      await delay(50);
    }
    for (const mi of cached.data.marketImpacts) {
      sendEvent('market_impact', mi);
      await delay(50);
    }
    sendEvent('complete', {
      simulationId: cached.data.simulationId,
      report: cached.data.report,
      totalAgents: cached.data.totalAgents,
      elapsed: (Date.now() - startTime) / 1000,
    });
    return;
  }

  // Phase 1: Initializing
  sendEvent('status', { phase: 'initializing', message: 'Setting up simulation environment...' });
  await delay(300);

  sendEvent('status', { phase: 'initializing', message: `Seed event: "${seed}"` });
  await delay(200);

  sendEvent('status', {
    phase: 'initializing',
    message: `Configuring ${config.agentCount} agents across ${config.focusSectors.length > 0 ? config.focusSectors.join(', ') : 'all sectors'}...`,
  });
  await delay(400);

  // Phase 2: Running LLM simulation
  sendEvent('status', { phase: 'simulating', message: 'Initializing multi-agent simulation engine (Gemini 2.5 Flash)...' });
  await delay(200);

  const systemPrompt = buildSystemPrompt(config);
  const userPrompt = `Simulate the following global event and its cascading effects:\n\nSEED EVENT: ${seed}\n\nRun the full simulation with ${config.agentCount} agents over ${config.durationMinutes} minutes of simulated time. Focus on ${config.focusSectors.length > 0 ? config.focusSectors.join(', ') : 'all sectors'} in ${config.geographicScope.length > 0 ? config.geographicScope.join(', ') : 'global scope'}.\n\nOutput ONLY the JSON result.`;

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  sendEvent('status', { phase: 'simulating', message: 'Agents are analyzing the seed event and computing cascading effects...' });

  let response: any;
  try {
    response = await callGemini(apiKey, messages);
  } catch (e: any) {
    sendEvent('error', { message: `Simulation engine error: ${e.message}` });
    return;
  }

  const content: string = response.choices?.[0]?.message?.content ?? '';
  if (!content) {
    sendEvent('error', { message: 'No response from simulation engine.' });
    return;
  }

  // Phase 3: Parse results
  sendEvent('status', { phase: 'processing', message: 'Parsing simulation results...' });
  await delay(200);

  let parsed = extractJSON(content);

  // If first attempt fails, ask the model to fix its output
  if (!parsed || !parsed.agentActions) {
    sendEvent('status', { phase: 'processing', message: 'Restructuring simulation output...' });
    messages.push({ role: 'assistant', content });
    messages.push({
      role: 'user',
      content: 'Your output was not valid JSON. Please output ONLY the JSON object with agentActions, impacts, marketImpacts, and report fields. No markdown, no explanation.',
    });

    try {
      response = await callGemini(apiKey, messages);
      const retryContent = response.choices?.[0]?.message?.content ?? '';
      parsed = extractJSON(retryContent);
    } catch (e: any) {
      sendEvent('error', { message: `Retry failed: ${e.message}` });
      return;
    }
  }

  if (!parsed || !parsed.agentActions) {
    sendEvent('error', { message: 'Failed to parse simulation results. Please try again.' });
    return;
  }

  // Phase 4: Stream results back to client with delays
  sendEvent('status', { phase: 'streaming', message: 'Streaming agent actions...' });
  await delay(150);

  // Validate and stream agent actions
  const agentActions: AgentAction[] = (parsed.agentActions ?? []).map((a: any, i: number) => ({
    agentId: a.agentId ?? `agent-${i + 1}`,
    agentRole: a.agentRole ?? 'Unknown Agent',
    action: a.action ?? 'No action recorded',
    simulatedTime: a.simulatedTime ?? '+unknown',
  }));

  for (const action of agentActions) {
    sendEvent('agent_action', action);
    await delay(150 + Math.random() * 200); // 150-350ms between actions
  }

  // Stream sector impacts
  sendEvent('status', { phase: 'streaming', message: 'Computing sector impacts...' });
  await delay(200);

  const impacts: SectorImpact[] = (parsed.impacts ?? []).map((imp: any) => ({
    sector: imp.sector ?? 'Unknown',
    severity: (['HIGH', 'MEDIUM', 'LOW'].includes(imp.severity) ? imp.severity : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
    description: imp.description ?? 'Impact detected',
    affectedEntities: Array.isArray(imp.affectedEntities) ? imp.affectedEntities : [],
    confidence: typeof imp.confidence === 'number' ? Math.min(1, Math.max(0, imp.confidence)) : 0.5,
  }));

  for (const impact of impacts) {
    sendEvent('impact', impact);
    await delay(200 + Math.random() * 300); // 200-500ms between impacts
  }

  // Stream market impacts
  sendEvent('status', { phase: 'streaming', message: 'Projecting market impacts...' });
  await delay(200);

  const marketImpacts: MarketImpact[] = (parsed.marketImpacts ?? []).map((mi: any) => ({
    ticker: mi.ticker ?? '???',
    name: mi.name ?? 'Unknown',
    predictedChange: typeof mi.predictedChange === 'number' ? mi.predictedChange : 0,
    confidence: typeof mi.confidence === 'number' ? Math.min(1, Math.max(0, mi.confidence)) : 0.5,
    reasoning: mi.reasoning ?? 'No reasoning provided',
  }));

  for (const mi of marketImpacts) {
    sendEvent('market_impact', mi);
    await delay(100 + Math.random() * 200); // 100-300ms between market impacts
  }

  // Build final result
  const elapsed = (Date.now() - startTime) / 1000;
  const result: SimulationResult = {
    simulationId: simId,
    agentActions,
    impacts,
    marketImpacts,
    report: parsed.report ?? 'Simulation complete. No detailed report generated.',
    totalAgents: agentActions.length,
    elapsed,
  };

  // Cache the result
  cache.set(cacheKey, { data: result, ts: Date.now() });

  // Stream completion
  sendEvent('complete', {
    simulationId: simId,
    report: result.report,
    totalAgents: result.totalAgents,
    elapsed: result.elapsed,
  });
}

// ── SSE Route (POST) ─────────────────────────────────────────────────────────

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

  const config: SimulationConfig = {
    agentCount: typeof body.config?.agentCount === 'number' ? body.config.agentCount : 500,
    durationMinutes: typeof body.config?.durationMinutes === 'number' ? body.config.durationMinutes : 30,
    focusSectors: Array.isArray(body.config?.focusSectors) ? body.config.focusSectors : [],
    geographicScope: Array.isArray(body.config?.geographicScope) ? body.config.geographicScope : [],
  };

  const encoder = new TextEncoder();
  let ctrl: ReadableStreamDefaultController<Uint8Array>;

  function sendEvent(event: string, data: object) {
    try {
      ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch { /* stream already closed */ }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      ctrl = controller;
      try {
        await runSimulation(seed, config, sendEvent);
      } catch (e: any) {
        sendEvent('error', { message: e.message });
      } finally {
        try { controller.close(); } catch { /* ignore */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
