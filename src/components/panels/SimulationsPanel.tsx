"use client";

import PanelContainer from "@/components/panels/PanelContainer";

const MOCK_SIMS = [
  { id: "1", name: "China Rare Earth Export Ban", status: "running" as const, agents: 847, time: "12min" },
  { id: "2", name: "Suez Canal 30-Day Closure", status: "running" as const, agents: 1200, time: "4min" },
  { id: "3", name: "Fed Rate Cut 75bps", status: "completed" as const, agents: 2100, time: "45min" },
  { id: "4", name: "TSMC Fab Fire Scenario", status: "completed" as const, agents: 950, time: "28min" },
];

export function SimulationsPanel() {
  return (
    <PanelContainer id="simulations" title="Active Simulations" expandLabel="+ NEW SIM">
      <div className="grid grid-cols-2 gap-px h-full p-px">
        {MOCK_SIMS.map((sim) => {
          const isRunning = sim.status === "running";
          const borderColor = isRunning ? "var(--color-warning)" : "var(--color-positive)";
          const bgColor = isRunning ? "rgba(245,158,11,0.02)" : "rgba(46,204,113,0.03)";
          const textClass = isRunning ? "text-warning" : "text-positive";

          return (
            <div
              key={sim.id}
              className="flex flex-col justify-between p-1.5 overflow-hidden"
              style={{
                borderLeft: `2px solid ${borderColor}`,
                background: bgColor,
              }}
            >
              <span className="text-text-secondary text-[9px] leading-snug line-clamp-2">{sim.name}</span>
              <span className={`text-[8px] uppercase tracking-widest ${textClass}`}>
                {isRunning
                  ? `RUNNING ${sim.agents} agents ${sim.time}`
                  : `DONE ${sim.agents} agents`}
              </span>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}

export default SimulationsPanel;
