"use client";

import { useState, useCallback } from "react";
import type { Situation, SituationSeverity } from "@/types/situation";
import { useStore } from "@/store";

interface SituationCardProps {
  situation: Situation;
  isActive: boolean;
  onClick: () => void;
}

const SEVERITY_CONFIG: Record<
  SituationSeverity,
  { borderColor: string; badgeClass: string; label: string }
> = {
  CRITICAL: {
    borderColor: "var(--color-negative)",
    badgeClass: "text-negative",
    label: "CRITICAL",
  },
  HIGH: {
    borderColor: "var(--color-warning)",
    badgeClass: "text-warning",
    label: "HIGH",
  },
  MEDIUM: {
    borderColor: "var(--color-accent)",
    badgeClass: "text-accent",
    label: "MEDIUM",
  },
  LOW: {
    borderColor: "var(--color-positive)",
    badgeClass: "text-positive",
    label: "LOW",
  },
};

const STATUS_CONFIG: Record<
  Situation["status"],
  { textClass: string; label: string; pulse: boolean }
> = {
  active: { textClass: "text-negative", label: "ACTIVE", pulse: true },
  monitoring: { textClass: "text-warning", label: "MONITORING", pulse: false },
  resolved: { textClass: "text-positive", label: "RESOLVED", pulse: false },
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SituationCard({
  situation,
  isActive,
  onClick,
}: SituationCardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const startSimulation = useStore((s) => s.startSimulation);
  const updateSituation = useStore((s) => s.updateSituation);

  const severity = SEVERITY_CONFIG[situation.severity];
  const status = STATUS_CONFIG[situation.status];

  const toggleSection = useCallback(
    (section: string) => {
      setExpandedSection((prev) => (prev === section ? null : section));
    },
    []
  );

  const handleSimulate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const simId = startSimulation(situation.title, {
        agentCount: 500,
        durationMinutes: 30,
        focusSectors: [],
        geographicScope: [],
      });
      updateSituation(situation.id, {
        relatedSimulationIds: [...situation.relatedSimulationIds, simId],
      });
    },
    [startSimulation, updateSituation, situation]
  );

  const linkedSimCount = situation.relatedSimulationIds.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`relative transition-colors cursor-pointer ${
        isActive ? "bg-accent/5" : "hover:bg-surface"
      }`}
      style={{
        borderLeft: `2px solid ${severity.borderColor}`,
        borderColor: isActive ? "var(--color-accent)" : undefined,
        borderWidth: isActive ? "1px 1px 1px 2px" : undefined,
        borderStyle: isActive ? "solid" : undefined,
        borderLeftColor: severity.borderColor,
      }}
    >
      <div className="p-2">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[7px] uppercase tracking-widest font-bold ${severity.badgeClass}`}
          >
            {severity.label}
          </span>
          <span className="text-text-secondary text-[9px] leading-snug flex-1 line-clamp-1">
            {situation.title}
          </span>
          <span className="text-text-disabled text-[7px] shrink-0">
            {timeAgo(situation.createdAt)}
          </span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {status.pulse && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse-status absolute inline-flex h-full w-full rounded-full bg-negative opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-negative" />
            </span>
          )}
          <span
            className={`text-[7px] uppercase tracking-widest ${status.textClass}`}
          >
            {status.label}
          </span>
          <span className="text-text-disabled text-[7px]">
            {situation.source}
          </span>
        </div>

        {/* Details section */}
        <div className="mb-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSection("details");
            }}
            className="flex items-center gap-1 w-full text-left group"
          >
            <span className="text-[7px] text-text-disabled uppercase tracking-widest group-hover:text-accent transition-colors">
              {expandedSection === "details" ? "[-]" : "[+]"} Details
            </span>
          </button>
          <p className="text-text-tertiary text-[8px] leading-snug mt-0.5">
            {expandedSection === "details"
              ? situation.details
              : situation.details.length > 80
                ? situation.details.slice(0, 80) + "..."
                : situation.details}
          </p>
        </div>

        {/* Intelligence section */}
        {situation.intelligence.length > 0 && (
          <div className="mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection("intel");
              }}
              className="flex items-center gap-1 w-full text-left group"
            >
              <span className="text-[7px] text-text-disabled uppercase tracking-widest group-hover:text-accent transition-colors">
                {expandedSection === "intel" ? "[-]" : "[+]"} Intelligence (
                {situation.intelligence.length})
              </span>
            </button>
            {expandedSection === "intel" && (
              <ul className="mt-0.5 space-y-0.5">
                {situation.intelligence.map((item, i) => (
                  <li
                    key={i}
                    className="text-text-tertiary text-[8px] leading-snug pl-2 border-l border-border-subtle"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Possible Activity section */}
        {situation.possibleActivity.length > 0 && (
          <div className="mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection("activity");
              }}
              className="flex items-center gap-1 w-full text-left group"
            >
              <span className="text-[7px] text-text-disabled uppercase tracking-widest group-hover:text-accent transition-colors">
                {expandedSection === "activity" ? "[-]" : "[+]"} Possible
                Activity ({situation.possibleActivity.length})
              </span>
            </button>
            {expandedSection === "activity" && (
              <ul className="mt-0.5 space-y-0.5">
                {situation.possibleActivity.map((item, i) => (
                  <li
                    key={i}
                    className="text-text-tertiary text-[8px] leading-snug pl-2 border-l border-border-subtle"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border-subtle">
          <button
            onClick={handleSimulate}
            className="text-[7px] uppercase tracking-widest text-accent border border-accent/30 px-1.5 py-0.5 hover:bg-accent/10 transition-colors"
          >
            Simulate
          </button>
          {linkedSimCount > 0 && (
            <span className="text-text-disabled text-[7px]">
              {linkedSimCount} sim{linkedSimCount !== 1 ? "s" : ""} linked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
