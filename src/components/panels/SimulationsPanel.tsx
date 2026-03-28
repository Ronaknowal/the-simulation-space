"use client";

import { useMemo } from "react";
import PanelContainer from "@/components/panels/PanelContainer";
import { useStore } from "@/store";

interface DisplaySim {
  id: string;
  name: string;
  status: "running" | "completed" | "configuring" | "failed";
  agents: number;
  time: string;
}

const MOCK_SIMS: DisplaySim[] = [
  { id: "mock-1", name: "China Rare Earth Export Ban", status: "running", agents: 847, time: "12min" },
  { id: "mock-2", name: "Suez Canal 30-Day Closure", status: "running", agents: 1200, time: "4min" },
  { id: "mock-3", name: "Fed Rate Cut 75bps", status: "completed", agents: 2100, time: "45min" },
  { id: "mock-4", name: "TSMC Fab Fire Scenario", status: "completed", agents: 950, time: "28min" },
];

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}min`;
}

export function SimulationsPanel() {
  const simulations = useStore((s) => s.simulations);
  const setActiveModule = useStore((s) => s.setActiveModule);

  const displaySims: DisplaySim[] = useMemo(() => {
    const realSims = Object.values(simulations);
    if (realSims.length === 0) return MOCK_SIMS;
    return realSims.map((sim) => ({
      id: sim.id,
      name: sim.seed,
      status: sim.status,
      agents: sim.agentCount,
      time: formatElapsed(sim.elapsed),
    }));
  }, [simulations]);

  const realCount = Object.keys(simulations).length;
  const title = `Active Simulations${realCount > 0 ? ` (${realCount})` : ""}`;

  return (
    <PanelContainer
      id="simulations"
      title={title}
      expandLabel="+ NEW SIM"
      onExpand={() => setActiveModule("simulation")}
    >
      <div className="grid grid-cols-2 gap-px h-full p-px">
        {displaySims.map((sim) => {
          const isActive = sim.status === "running" || sim.status === "configuring";
          const isFailed = sim.status === "failed";
          const borderColor = isFailed
            ? "var(--color-danger, #ef4444)"
            : isActive
              ? "var(--color-warning)"
              : "var(--color-positive)";
          const bgColor = isFailed
            ? "rgba(239,68,68,0.03)"
            : isActive
              ? "rgba(245,158,11,0.02)"
              : "rgba(46,204,113,0.03)";
          const textClass = isFailed
            ? "text-danger"
            : isActive
              ? "text-warning"
              : "text-positive";

          const statusLabel = isFailed
            ? "FAILED"
            : sim.status === "configuring"
              ? "CONFIGURING"
              : sim.status === "running"
                ? `RUNNING ${sim.agents} agents ${sim.time}`
                : `DONE ${sim.agents} agents`;

          return (
            <button
              key={sim.id}
              type="button"
              onClick={() => setActiveModule("simulation")}
              className="flex flex-col justify-between p-1.5 overflow-hidden text-left hover:brightness-125 transition-all cursor-pointer"
              style={{
                borderLeft: `2px solid ${borderColor}`,
                background: bgColor,
              }}
            >
              <span className="text-text-secondary text-[9px] leading-snug line-clamp-2">{sim.name}</span>
              <span className={`text-[8px] uppercase tracking-widest ${textClass}`}>
                {statusLabel}
              </span>
            </button>
          );
        })}
      </div>
    </PanelContainer>
  );
}

export default SimulationsPanel;
