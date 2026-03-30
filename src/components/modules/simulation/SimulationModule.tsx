"use client";

import { useState, useCallback, useRef } from "react";
import { useStore } from "@/store";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import SeedInput from "./SeedInput";
import SimulationCard from "./SimulationCard";
import SimulationOutput from "./SimulationOutput";
import ComparisonView from "./ComparisonView";
import type { AgentAction, CascadeImpact, MarketImpact } from "@/types/simulation";

export default function SimulationModule() {
  const startSimulation = useStore((s) => s.startSimulation);
  const updateSimulation = useStore((s) => s.updateSimulation);
  const compareSimulations = useStore((s) => s.compareSimulations);

  const simulations = useStore((s) => s.simulations);

  // Force re-render on any simulation data change
  useStore((s) => {
    let v = 0;
    for (const id in s.simulations) {
      const sim = s.simulations[id];
      v += sim.progress + sim.agentFeed.length + sim.impacts.length +
           sim.marketImpacts.length + (sim.status === "completed" ? 1000 : 0) +
           (sim.status === "failed" ? 2000 : 0);
    }
    return v;
  });

  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const simList = Object.values(simulations).sort((a, b) => b.createdAt - a.createdAt);
  const hasRunning = simList.some((s) => s.status === "running");
  const completedSims = simList.filter((s) => s.status === "completed");
  const canCompare = completedSims.length >= 2;
  const selectedSim = selectedSimId ? simulations[selectedSimId] : null;

  // Direct SSE connection — no useEffect hook, called directly from handleRun
  const connectSSE = useCallback((simId: string, seed: string, config: any) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const response = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simId, seed, config }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => response.statusText);
          updateSimulation(simId, { status: "failed", error: `HTTP ${response.status}: ${errText.slice(0, 200)}` });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // Normalize \r\n to \n (Windows Python outputs \r\n)
          buffer = buffer.replace(/\r\n/g, "\n");
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            if (!frame.trim()) continue;
            let eventType = "message";
            let data = "";
            for (const line of frame.split("\n")) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith("event: ")) eventType = trimmedLine.slice(7).trim();
              else if (trimmedLine.startsWith("data: ")) data = trimmedLine.slice(6);
            }
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              handleEvent(simId, eventType, parsed);
            } catch { /* skip */ }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        updateSimulation(simId, {
          status: "failed",
          error: err instanceof Error ? err.message : "SSE connection failed",
        });
      }
    })();
  }, [updateSimulation]);

  const handleEvent = useCallback((simId: string, eventType: string, data: any) => {
    const current = useStore.getState().simulations[simId];
    if (!current) return;
    const update = useStore.getState().updateSimulation;

    switch (eventType) {
      case "status": {
        update(simId, {
          progress: data.progress ?? current.progress,
          elapsed: data.elapsed ?? current.elapsed,
          statusMessage: data.message ?? current.statusMessage,
        });
        break;
      }
      case "agent_action": {
        update(simId, { agentFeed: [...current.agentFeed, data] });
        break;
      }
      case "impact": {
        update(simId, { impacts: [...current.impacts, data] });
        break;
      }
      case "market_impact": {
        update(simId, { marketImpacts: [...current.marketImpacts, data] });
        break;
      }
      case "complete": {
        const finalUpdate: Record<string, unknown> = {
          status: "completed",
          progress: 100,
          report: data.report ?? null,
          agentCount: current.config.agentCount,
          elapsed: data.elapsed ?? current.elapsed,
          statusMessage: "Simulation complete",
        };
        if (data.actions?.length > current.agentFeed.length) finalUpdate.agentFeed = data.actions;
        if (data.impacts?.length > current.impacts.length) finalUpdate.impacts = data.impacts;
        if (data.marketImpacts?.length > current.marketImpacts.length) finalUpdate.marketImpacts = data.marketImpacts;
        update(simId, finalUpdate);
        break;
      }
      case "error": {
        update(simId, { status: "failed", error: data.message ?? "Unknown error" });
        break;
      }
    }
  }, []);

  const handleRun = useCallback(
    (seed: string, config: { agentCount: number; durationMinutes: number; focusSectors: string[] }) => {
      const fullConfig = { ...config, geographicScope: [] as string[] };
      const id = startSimulation(seed, fullConfig);
      updateSimulation(id, { status: "running" });
      setSelectedSimId(id);
      // Connect SSE directly — no useEffect dance
      connectSSE(id, seed, fullConfig);
    },
    [startSimulation, updateSimulation, connectSSE]
  );

  const handleCompare = () => {
    const ids = completedSims.slice(0, 2).map((s) => s.id);
    compareSimulations(ids);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      <ComparisonView />

      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-[9px] uppercase tracking-widest text-text-disabled">
          Simulation Engine
        </span>
        <div className="flex items-center gap-2">
          {canCompare && (
            <button
              onClick={handleCompare}
              className="text-[8px] uppercase tracking-widest text-positive border border-positive/30 px-2 py-0.5 hover:bg-positive/10 transition-colors"
            >
              Compare ({completedSims.length})
            </button>
          )}
          <button
            onClick={() => setSelectedSimId(null)}
            className="text-[8px] uppercase tracking-widest text-accent border border-accent/30 px-2 py-0.5 hover:bg-accent/10 transition-colors"
          >
            + New Simulation
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-[60%] border-r border-border p-3 overflow-y-auto">
          <SeedInput onRun={handleRun} isRunning={hasRunning} />
        </div>

        <div className="w-[40%] flex flex-col overflow-hidden">
          <div className="px-2 py-1.5 border-b border-border flex-shrink-0">
            <span className="text-[8px] uppercase tracking-widest text-text-disabled">
              Active Simulations ({simList.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {simList.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-disabled text-[9px] uppercase tracking-widest">
                  No simulations yet
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border-subtle">
                {simList.map((sim) => (
                  <ErrorBoundary key={sim.id} name={`sim-card-${sim.id}`}>
                    <SimulationCard
                      simulation={sim}
                      isSelected={selectedSimId === sim.id}
                      onSelect={setSelectedSimId}
                    />
                  </ErrorBoundary>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSim && (
        <div className="border-t border-border h-[45%] flex-shrink-0 overflow-hidden">
          <ErrorBoundary name="sim-output">
            <SimulationOutput simulation={selectedSim} />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
