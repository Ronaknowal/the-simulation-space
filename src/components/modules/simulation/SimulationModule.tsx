"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useStore } from "@/store";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import SeedInput from "./SeedInput";
import SimulationCard from "./SimulationCard";
import SimulationOutput from "./SimulationOutput";
import { useSimulationSSE } from "./useSimulationSSE";
import ComparisonView from "./ComparisonView";

/* ── Mock data for demonstration ── */

const MOCK_AGENT_ACTIONS = [
  { agentId: "a1", agentRole: "Geopolitical Analyst", action: "Monitoring diplomatic channels for retaliatory measures", simulatedTime: "T+00:02", timestamp: 1 },
  { agentId: "a2", agentRole: "Energy Trader", action: "Evaluating crude oil futures exposure in affected region", simulatedTime: "T+00:05", timestamp: 2 },
  { agentId: "a3", agentRole: "Supply Chain Mgr", action: "Mapping Tier-1 supplier dependencies in Southeast Asia", simulatedTime: "T+00:08", timestamp: 3 },
  { agentId: "a4", agentRole: "Defense Analyst", action: "Assessing naval force repositioning patterns", simulatedTime: "T+00:12", timestamp: 4 },
  { agentId: "a5", agentRole: "Macro Economist", action: "Projecting GDP impact on regional trading partners", simulatedTime: "T+00:15", timestamp: 5 },
  { agentId: "a6", agentRole: "Tech Analyst", action: "Semiconductor supply disruption probability rising to 68%", simulatedTime: "T+00:18", timestamp: 6 },
];

const MOCK_IMPACTS = [
  { sector: "Energy", severity: "HIGH" as const, description: "Crude oil price spike expected as shipping routes through Strait of Malacca face 72-hour delays", affectedEntities: ["OPEC+", "Shell", "BP", "Aramco"], confidence: 0.87 },
  { sector: "Technology", severity: "HIGH" as const, description: "Semiconductor fabrication disruption likely affecting global chip supply for 6-8 weeks", affectedEntities: ["TSMC", "Samsung", "Intel", "NVIDIA"], confidence: 0.82 },
  { sector: "Agriculture", severity: "MEDIUM" as const, description: "Rice and palm oil export disruptions from Southeast Asian producers", affectedEntities: ["Thailand", "Vietnam", "Indonesia"], confidence: 0.65 },
  { sector: "Financial", severity: "LOW" as const, description: "Regional banking sector volatility within normal correction bounds", affectedEntities: ["DBS", "OCBC", "UOB"], confidence: 0.45 },
];

const MOCK_MARKET_IMPACTS = [
  { ticker: "CL=F", name: "Crude Oil", predictedChange: 8.42, confidence: 0.89, reasoning: "Supply disruption in major shipping lane" },
  { ticker: "TSM", name: "TSMC", predictedChange: -12.3, confidence: 0.84, reasoning: "Fab operations at risk from regional instability" },
  { ticker: "NVDA", name: "NVIDIA", predictedChange: -7.8, confidence: 0.76, reasoning: "Supply chain dependency on TSMC" },
  { ticker: "LMT", name: "Lockheed Martin", predictedChange: 4.2, confidence: 0.72, reasoning: "Defense spending likely to increase" },
  { ticker: "GLD", name: "Gold ETF", predictedChange: 3.1, confidence: 0.81, reasoning: "Flight to safety assets" },
  { ticker: "AAPL", name: "Apple", predictedChange: -5.4, confidence: 0.68, reasoning: "Manufacturing exposure in affected region" },
];

export default function SimulationModule() {
  const simulations = useStore((s) => s.simulations);
  const startSimulation = useStore((s) => s.startSimulation);
  const updateSimulation = useStore((s) => s.updateSimulation);
  const compareSimulations = useStore((s) => s.compareSimulations);

  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const progressTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Connect SSE for the selected simulation
  useSimulationSSE(selectedSimId);

  // Get sorted simulation list (newest first)
  const simList = Object.values(simulations).sort((a, b) => b.createdAt - a.createdAt);

  // Check if any simulation is currently running
  const hasRunning = simList.some((s) => s.status === "running");

  // Completed simulations available for comparison
  const completedSims = simList.filter((s) => s.status === "completed");
  const canCompare = completedSims.length >= 2;

  // Selected simulation data
  const selectedSim = selectedSimId ? simulations[selectedSimId] : null;

  // Clean up progress timers on unmount
  useEffect(() => {
    return () => {
      progressTimers.current.forEach((timer) => clearInterval(timer));
      progressTimers.current.clear();
    };
  }, []);

  const handleRun = useCallback(
    (seed: string, config: { agentCount: number; durationMinutes: number; focusSectors: string[] }) => {
      const id = startSimulation(seed, {
        agentCount: config.agentCount,
        durationMinutes: config.durationMinutes,
        focusSectors: config.focusSectors,
        geographicScope: [],
      });

      // Transition to running
      updateSimulation(id, { status: "running" });
      setSelectedSimId(id);

      // Mock progress animation: increment progress + feed mock data over time
      let tick = 0;
      const totalTicks = 30; // complete in ~30 seconds for demo
      const timer = setInterval(() => {
        tick++;
        const progress = Math.min((tick / totalTicks) * 100, 100);
        const elapsed = Math.round((tick / totalTicks) * config.durationMinutes);

        // Feed mock agent actions progressively
        const actionIndex = Math.min(
          Math.floor((tick / totalTicks) * MOCK_AGENT_ACTIONS.length),
          MOCK_AGENT_ACTIONS.length
        );

        // Feed mock impacts at ~40% progress
        const impactIndex =
          progress > 40
            ? Math.min(
                Math.floor(((progress - 40) / 60) * MOCK_IMPACTS.length),
                MOCK_IMPACTS.length
              )
            : 0;

        // Feed mock market impacts at ~60% progress
        const marketIndex =
          progress > 60
            ? Math.min(
                Math.floor(((progress - 60) / 40) * MOCK_MARKET_IMPACTS.length),
                MOCK_MARKET_IMPACTS.length
              )
            : 0;

        const updates: Partial<typeof simulations[string]> = {
          progress,
          elapsed,
          agentFeed: MOCK_AGENT_ACTIONS.slice(0, actionIndex),
          impacts: MOCK_IMPACTS.slice(0, impactIndex),
          marketImpacts: MOCK_MARKET_IMPACTS.slice(0, marketIndex),
        };

        if (tick >= totalTicks) {
          updates.status = "completed";
          updates.progress = 100;
          updates.elapsed = config.durationMinutes;
          updates.agentFeed = [...MOCK_AGENT_ACTIONS];
          updates.impacts = [...MOCK_IMPACTS];
          updates.marketImpacts = [...MOCK_MARKET_IMPACTS];
          updates.report = generateMockReport(seed, config);
          clearInterval(timer);
          progressTimers.current.delete(id);
        }

        updateSimulation(id, updates);
      }, 1000);

      progressTimers.current.set(id, timer);
    },
    [startSimulation, updateSimulation]
  );

  const handleCompare = () => {
    // Use the two most recent completed simulations
    const ids = completedSims.slice(0, 2).map((s) => s.id);
    compareSimulations(ids);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      {/* Comparison overlay */}
      <ComparisonView />

      {/* Header */}
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

      {/* Main content: seed input (left 60%) + sim cards (right 40%) */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Seed Input */}
        <div className="w-[60%] border-r border-border p-3 overflow-y-auto">
          <SeedInput onRun={handleRun} isRunning={hasRunning} />
        </div>

        {/* Right: Active Simulations */}
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

      {/* Bottom: Simulation Output (only when a simulation is selected) */}
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

/* ── Mock report generator ── */

function generateMockReport(
  seed: string,
  config: { agentCount: number; durationMinutes: number; focusSectors: string[] }
): string {
  return `SIMULATION REPORT
${"=".repeat(60)}

EVENT SEED:
${seed}

CONFIGURATION:
  Agents:    ${config.agentCount}
  Duration:  ${config.durationMinutes} minutes
  Sectors:   ${config.focusSectors.join(", ")}

${"=".repeat(60)}
EXECUTIVE SUMMARY

This simulation deployed ${config.agentCount} autonomous agents across
${config.focusSectors.length} sector(s) to model cascading impacts of
the described event over a ${config.durationMinutes}-minute window.

KEY FINDINGS:
  1. HIGH severity impacts detected in Energy and Technology sectors
  2. Supply chain disruptions estimated at 6-8 week recovery period
  3. Crude oil futures projected +8.4% on supply route disruption
  4. Semiconductor supply chain faces critical bottleneck risk
  5. Defense sector positioned for counter-cyclical gains

AGENT CONSENSUS:
  - 87% of agents predict sustained energy price volatility
  - 82% flag semiconductor supply as critical risk vector
  - 72% recommend increased defense sector allocation
  - 65% project agricultural commodity disruption in SE Asia

CONFIDENCE LEVEL: MODERATE-HIGH (0.78)

${"=".repeat(60)}
END OF REPORT`;
}
