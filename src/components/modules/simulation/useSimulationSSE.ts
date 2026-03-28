"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import type { AgentAction, CascadeImpact, MarketImpact } from "@/types/simulation";

/**
 * Connects to the /api/simulate SSE endpoint for a running simulation.
 *
 * Since /api/simulate is a POST (not GET), we use fetch + ReadableStream
 * rather than EventSource. The stream returns SSE-formatted lines:
 *   event: <type>\ndata: <json>\n\n
 *
 * Event types:
 *   status        - { progress, elapsed, agentCount }
 *   agent_action  - AgentAction
 *   impact        - CascadeImpact
 *   market_impact - MarketImpact
 *   complete      - { report }
 *   error         - { message }
 */
export function useSimulationSSE(simId: string | null) {
  const updateSimulation = useStore((s) => s.updateSimulation);
  const simulations = useStore((s) => s.simulations);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!simId) return;

    const sim = simulations[simId];
    if (!sim || sim.status !== "running") return;

    const controller = new AbortController();
    abortRef.current = controller;

    async function connectSSE() {
      try {
        const response = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            simId,
            seed: sim!.seed,
            config: sim!.config,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          updateSimulation(simId!, {
            status: "failed",
            error: `HTTP ${response.status}: ${response.statusText}`,
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE frames: "event: xxx\ndata: {json}\n\n"
          const frames = buffer.split("\n\n");
          // Keep the last incomplete frame in the buffer
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            if (!frame.trim()) continue;

            let eventType = "message";
            let data = "";

            for (const line of frame.split("\n")) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                data = line.slice(6);
              }
            }

            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              handleSSEEvent(simId!, eventType, parsed);
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        updateSimulation(simId!, {
          status: "failed",
          error: err instanceof Error ? err.message : "SSE connection failed",
        });
      }
    }

    function handleSSEEvent(id: string, eventType: string, data: unknown) {
      switch (eventType) {
        case "status": {
          const d = data as { progress: number; elapsed: number; agentCount: number };
          updateSimulation(id, {
            progress: d.progress,
            elapsed: d.elapsed,
            agentCount: d.agentCount,
          });
          break;
        }
        case "agent_action": {
          const action = data as AgentAction;
          const current = useStore.getState().simulations[id];
          if (current) {
            updateSimulation(id, {
              agentFeed: [...current.agentFeed, action],
            });
          }
          break;
        }
        case "impact": {
          const impact = data as CascadeImpact;
          const current = useStore.getState().simulations[id];
          if (current) {
            updateSimulation(id, {
              impacts: [...current.impacts, impact],
            });
          }
          break;
        }
        case "market_impact": {
          const mi = data as MarketImpact;
          const current = useStore.getState().simulations[id];
          if (current) {
            updateSimulation(id, {
              marketImpacts: [...current.marketImpacts, mi],
            });
          }
          break;
        }
        case "complete": {
          const d = data as { report: string };
          updateSimulation(id, {
            status: "completed",
            progress: 100,
            report: d.report,
          });
          break;
        }
        case "error": {
          const d = data as { message: string };
          updateSimulation(id, {
            status: "failed",
            error: d.message,
          });
          break;
        }
      }
    }

    connectSSE();

    return () => {
      controller.abort();
      abortRef.current = null;
    };
    // We only want to fire when simId changes or when a sim transitions to "running"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simId, simulations[simId ?? ""]?.status]);
}
