"use client";

import type { SimulationState } from "@/types/simulation";

interface SimulationCardProps {
  simulation: SimulationState;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const STATUS_CONFIG = {
  running: {
    borderColor: "var(--color-warning)",
    bgColor: "rgba(212,149,43,0.03)",
    textClass: "text-warning",
    label: "RUNNING",
  },
  completed: {
    borderColor: "var(--color-positive)",
    bgColor: "rgba(46,204,113,0.03)",
    textClass: "text-positive",
    label: "COMPLETED",
  },
  failed: {
    borderColor: "var(--color-negative)",
    bgColor: "rgba(231,76,60,0.03)",
    textClass: "text-negative",
    label: "FAILED",
  },
  configuring: {
    borderColor: "var(--color-accent)",
    bgColor: "rgba(74,158,186,0.03)",
    textClass: "text-accent",
    label: "CONFIGURING",
  },
} as const;

function formatAgentCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(count);
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h${mins}m` : `${hrs}h`;
}

export default function SimulationCard({ simulation, isSelected, onSelect }: SimulationCardProps) {
  const config = STATUS_CONFIG[simulation.status];
  const truncatedSeed =
    simulation.seed.length > 60 ? simulation.seed.slice(0, 57) + "..." : simulation.seed;

  return (
    <button
      onClick={() => onSelect(simulation.id)}
      className={`w-full text-left p-2 transition-colors ${
        isSelected ? "bg-accent/5" : "hover:bg-surface"
      }`}
      style={{
        borderLeft: `2px solid ${config.borderColor}`,
        background: isSelected ? undefined : config.bgColor,
      }}
    >
      {/* Seed title */}
      <p className="text-text-secondary text-[10px] leading-snug mb-1">{truncatedSeed}</p>

      {/* Status line */}
      <p className={`text-[8px] uppercase tracking-widest ${config.textClass}`}>
        {config.label}
        {simulation.agentCount > 0 && ` ${formatAgentCount(simulation.agentCount)} agents`}
        {simulation.elapsed > 0 && ` ${formatElapsed(simulation.elapsed)}`}
      </p>

      {/* Error message */}
      {simulation.status === "failed" && simulation.error && (
        <p className="text-[8px] text-negative/70 mt-0.5 line-clamp-2">{simulation.error}</p>
      )}

      {/* Live status message + progress bar for running simulations */}
      {simulation.status === "running" && (
        <>
          {simulation.statusMessage && (
            <p className="text-[7px] text-text-disabled mt-0.5 truncate">
              {simulation.statusMessage}
            </p>
          )}
          <div className="mt-1 h-[2px] bg-border overflow-hidden">
            <div
              className="h-full bg-warning transition-all duration-1000 ease-linear"
              style={{ width: `${simulation.progress}%` }}
            />
          </div>
        </>
      )}
    </button>
  );
}
