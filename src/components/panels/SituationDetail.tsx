"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "@/store";
import type { SituationSeverity } from "@/types/situation";

const SEVERITY_CONFIG: Record<
  SituationSeverity,
  { borderColor: string; badgeClass: string; bgClass: string }
> = {
  CRITICAL: {
    borderColor: "var(--color-negative)",
    badgeClass: "text-negative",
    bgClass: "bg-negative/5",
  },
  HIGH: {
    borderColor: "var(--color-warning)",
    badgeClass: "text-warning",
    bgClass: "bg-warning/5",
  },
  MEDIUM: {
    borderColor: "var(--color-accent)",
    badgeClass: "text-accent",
    bgClass: "bg-accent/5",
  },
  LOW: {
    borderColor: "var(--color-positive)",
    badgeClass: "text-positive",
    bgClass: "bg-positive/5",
  },
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function SituationDetail() {
  const activeSituationId = useStore((s) => s.activeSituationId);
  const situations = useStore((s) => s.situations);
  const alerts = useStore((s) => s.alerts);
  const simulations = useStore((s) => s.simulations);
  const setActiveSituation = useStore((s) => s.setActiveSituation);
  const resolveSituation = useStore((s) => s.resolveSituation);
  const updateSituation = useStore((s) => s.updateSituation);
  const startSimulation = useStore((s) => s.startSimulation);

  const situation = activeSituationId
    ? situations[activeSituationId]
    : null;

  const relatedAlerts = useMemo(() => {
    if (!situation) return [];
    return alerts.filter((a) => situation.relatedAlertIds.includes(a.id));
  }, [situation, alerts]);

  const relatedSims = useMemo(() => {
    if (!situation) return [];
    return situation.relatedSimulationIds
      .map((id) => simulations[id])
      .filter(Boolean);
  }, [situation, simulations]);

  const handleSimulate = useCallback(() => {
    if (!situation) return;
    const simId = startSimulation(situation.title, {
      agentCount: 500,
      durationMinutes: 30,
      focusSectors: [],
      geographicScope: [],
    });
    updateSituation(situation.id, {
      relatedSimulationIds: [...situation.relatedSimulationIds, simId],
    });
  }, [situation, startSimulation, updateSituation]);

  const handleResolve = useCallback(() => {
    if (!situation) return;
    resolveSituation(situation.id);
  }, [situation, resolveSituation]);

  if (!situation) {
    return (
      <div className="flex items-center justify-center h-full text-text-disabled text-[9px] uppercase tracking-widest">
        No situation selected
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[situation.severity];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border"
        style={{ borderLeft: `3px solid ${sev.borderColor}` }}
      >
        <button
          onClick={() => setActiveSituation(null)}
          className="text-text-disabled text-[9px] hover:text-accent transition-colors"
        >
          &lt; BACK
        </button>
        <span
          className={`text-[8px] uppercase tracking-widest font-bold ${sev.badgeClass}`}
        >
          {situation.severity}
        </span>
        <span className="text-text-secondary text-[10px] flex-1">
          {situation.title}
        </span>
        <span className="text-text-disabled text-[8px]">
          {formatTimestamp(situation.createdAt)}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Status + actions */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[8px] uppercase tracking-widest ${
              situation.status === "active"
                ? "text-negative"
                : situation.status === "monitoring"
                  ? "text-warning"
                  : "text-positive"
            }`}
          >
            {situation.status === "active" && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-negative mr-1 animate-pulse-status" />
            )}
            {situation.status.toUpperCase()}
          </span>
          <span className="text-text-disabled text-[8px]">|</span>
          <span className="text-text-disabled text-[8px]">
            {situation.source}
          </span>
          <div className="flex-1" />
          {situation.status !== "resolved" && (
            <button
              onClick={handleResolve}
              className="text-[7px] uppercase tracking-widest text-positive border border-positive/30 px-1.5 py-0.5 hover:bg-positive/10 transition-colors"
            >
              Resolve
            </button>
          )}
        </div>

        {/* Details */}
        <section>
          <h4 className="text-[8px] uppercase tracking-widest text-text-disabled mb-1">
            Details
          </h4>
          <p className="text-text-secondary text-[9px] leading-relaxed">
            {situation.details}
          </p>
        </section>

        {/* Intelligence */}
        {situation.intelligence.length > 0 && (
          <section>
            <h4 className="text-[8px] uppercase tracking-widest text-text-disabled mb-1">
              Intelligence ({situation.intelligence.length})
            </h4>
            <ul className="space-y-1">
              {situation.intelligence.map((item, i) => (
                <li
                  key={i}
                  className="text-text-secondary text-[9px] leading-snug pl-2 border-l border-accent/30"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Possible Activity */}
        {situation.possibleActivity.length > 0 && (
          <section>
            <h4 className="text-[8px] uppercase tracking-widest text-text-disabled mb-1">
              Possible Activity ({situation.possibleActivity.length})
            </h4>
            <ul className="space-y-1">
              {situation.possibleActivity.map((item, i) => (
                <li
                  key={i}
                  className="text-text-secondary text-[9px] leading-snug pl-2 border-l border-warning/30"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Simulate button */}
        <div className="pt-1">
          <button
            onClick={handleSimulate}
            className="w-full text-[8px] uppercase tracking-widest text-accent border border-accent/30 px-2 py-1.5 hover:bg-accent/10 transition-colors text-center"
          >
            Simulate this event
          </button>
        </div>

        {/* Related Alerts */}
        {relatedAlerts.length > 0 && (
          <section>
            <h4 className="text-[8px] uppercase tracking-widest text-text-disabled mb-1">
              Related Alerts ({relatedAlerts.length})
            </h4>
            <div className="space-y-1">
              {relatedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-2 px-1.5 py-1 border-l-2 border-border"
                  style={{
                    borderLeftColor:
                      alert.priority === "FLASH"
                        ? "var(--color-negative)"
                        : alert.priority === "PRIORITY"
                          ? "var(--color-warning)"
                          : "var(--color-positive)",
                  }}
                >
                  <span
                    className={`text-[7px] uppercase tracking-widest shrink-0 ${
                      alert.priority === "FLASH"
                        ? "text-negative font-bold"
                        : alert.priority === "PRIORITY"
                          ? "text-warning"
                          : "text-positive"
                    }`}
                  >
                    {alert.priority}
                  </span>
                  <span className="text-text-secondary text-[8px] flex-1 line-clamp-1">
                    {alert.title}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Simulations */}
        {relatedSims.length > 0 && (
          <section>
            <h4 className="text-[8px] uppercase tracking-widest text-text-disabled mb-1">
              Related Simulations ({relatedSims.length})
            </h4>
            <div className="space-y-1">
              {relatedSims.map((sim) => {
                const statusColor =
                  sim.status === "running"
                    ? "text-warning"
                    : sim.status === "completed"
                      ? "text-positive"
                      : sim.status === "failed"
                        ? "text-negative"
                        : "text-accent";
                return (
                  <div
                    key={sim.id}
                    className="flex items-center gap-2 px-1.5 py-1 border-l-2 border-border"
                  >
                    <span
                      className={`text-[7px] uppercase tracking-widest ${statusColor}`}
                    >
                      {sim.status}
                    </span>
                    <span className="text-text-secondary text-[8px] flex-1 line-clamp-1">
                      {sim.seed}
                    </span>
                    <span className="text-text-disabled text-[7px]">
                      {sim.agentCount} agents
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
