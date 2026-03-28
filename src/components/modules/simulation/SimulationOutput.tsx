"use client";

import { useState, useRef, useEffect } from "react";
import type { SimulationState, AgentAction, CascadeImpact, MarketImpact } from "@/types/simulation";

type OutputTab = "feed" | "impacts" | "market" | "report";

interface SimulationOutputProps {
  simulation: SimulationState;
}

const TABS: { id: OutputTab; label: string }[] = [
  { id: "feed", label: "Agent Feed" },
  { id: "impacts", label: "Cascade Impacts" },
  { id: "market", label: "Market Impacts" },
  { id: "report", label: "Report" },
];

export default function SimulationOutput({ simulation }: SimulationOutputProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>("feed");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-[9px] uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? "text-accent border-b border-accent"
                : "text-text-disabled hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "feed" && <AgentFeedTab actions={simulation.agentFeed} />}
        {activeTab === "impacts" && <CascadeImpactsTab impacts={simulation.impacts} />}
        {activeTab === "market" && <MarketImpactsTab impacts={simulation.marketImpacts} />}
        {activeTab === "report" && <ReportTab report={simulation.report} />}
      </div>
    </div>
  );
}

/* ── Tab 1: Agent Feed ── */

function AgentFeedTab({ actions }: { actions: AgentAction[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions.length]);

  if (actions.length === 0) {
    return <EmptyState text="No agent actions yet" />;
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {actions.map((action, i) => (
        <div
          key={`${action.agentId}-${action.timestamp}-${i}`}
          className="flex items-start gap-2 px-2 py-1 border-b border-border-subtle"
        >
          <span className="text-accent text-[8px] uppercase tracking-wider shrink-0 w-[80px] truncate">
            {action.agentRole}
          </span>
          <span className="text-text-secondary text-[9px] flex-1 leading-snug">
            {action.action}
          </span>
          <span className="text-text-disabled text-[8px] shrink-0">
            {action.simulatedTime}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Tab 2: Cascade Impacts ── */

const SEVERITY_CLASS: Record<CascadeImpact["severity"], string> = {
  HIGH: "text-negative bg-negative/10",
  MEDIUM: "text-warning bg-warning/10",
  LOW: "text-positive bg-positive/10",
};

function CascadeImpactsTab({ impacts }: { impacts: CascadeImpact[] }) {
  if (impacts.length === 0) {
    return <EmptyState text="No cascade impacts detected" />;
  }

  return (
    <div className="h-full overflow-y-auto">
      {impacts.map((impact, i) => (
        <div
          key={`${impact.sector}-${i}`}
          className="px-3 py-2 border-b border-border-subtle"
        >
          {/* Header: severity + sector */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[7px] uppercase tracking-widest px-1.5 py-0.5 font-bold ${SEVERITY_CLASS[impact.severity]}`}
            >
              {impact.severity}
            </span>
            <span className="text-text-primary text-[10px] uppercase tracking-wider">
              {impact.sector}
            </span>
          </div>

          {/* Description */}
          <p className="text-text-secondary text-[9px] leading-snug mb-1.5">
            {impact.description}
          </p>

          {/* Affected entities */}
          <div className="flex flex-wrap gap-1 mb-1.5">
            {impact.affectedEntities.map((entity) => (
              <span
                key={entity}
                className="text-[7px] uppercase tracking-wider text-text-disabled border border-border px-1.5 py-0.5"
              >
                {entity}
              </span>
            ))}
          </div>

          {/* Confidence bar */}
          <div className="flex items-center gap-2">
            <span className="text-[7px] uppercase tracking-widest text-text-disabled">
              Confidence
            </span>
            <div className="flex-1 h-[3px] bg-border overflow-hidden max-w-[120px]">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${impact.confidence * 100}%` }}
              />
            </div>
            <span className="text-[8px] text-text-disabled">
              {(impact.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab 3: Market Impacts ── */

function MarketImpactsTab({ impacts }: { impacts: MarketImpact[] }) {
  if (impacts.length === 0) {
    return <EmptyState text="No market impacts predicted" />;
  }

  const sorted = [...impacts].sort(
    (a, b) => Math.abs(b.predictedChange) - Math.abs(a.predictedChange)
  );

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[9px]">
        <thead>
          <tr className="text-text-disabled text-[7px] uppercase tracking-widest border-b border-border">
            <th className="text-left px-2 py-1.5 font-normal">Ticker</th>
            <th className="text-left px-2 py-1.5 font-normal">Name</th>
            <th className="text-right px-2 py-1.5 font-normal">Change</th>
            <th className="text-right px-2 py-1.5 font-normal">Confidence</th>
            <th className="text-left px-2 py-1.5 font-normal">Reasoning</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((impact) => {
            const changeColor =
              impact.predictedChange > 0
                ? "text-positive"
                : impact.predictedChange < 0
                ? "text-negative"
                : "text-text-secondary";
            const sign = impact.predictedChange > 0 ? "+" : "";

            return (
              <tr
                key={impact.ticker}
                className="border-b border-border-subtle hover:bg-surface transition-colors"
              >
                <td className="px-2 py-1.5 text-accent font-bold">{impact.ticker}</td>
                <td className="px-2 py-1.5 text-text-secondary">{impact.name}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor}`}>
                  {sign}
                  {impact.predictedChange.toFixed(2)}%
                </td>
                <td className="px-2 py-1.5 text-right text-text-disabled">
                  {(impact.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-2 py-1.5 text-text-disabled max-w-[200px] truncate">
                  {impact.reasoning}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tab 4: Report ── */

function ReportTab({ report }: { report: string | null }) {
  if (!report) {
    return <EmptyState text="Report will be generated after simulation completes" />;
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[8px] uppercase tracking-widest text-text-disabled">
          Simulation Report
        </span>
        <button className="text-[7px] uppercase tracking-widest text-text-disabled border border-border px-2 py-0.5 hover:text-accent hover:border-accent transition-colors">
          Export
        </button>
      </div>
      <pre className="text-text-secondary text-[9px] leading-relaxed whitespace-pre-wrap font-mono">
        {report}
      </pre>
    </div>
  );
}

/* ── Empty state helper ── */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-text-disabled text-[9px] uppercase tracking-widest">{text}</p>
    </div>
  );
}
