"use client";

import { useStore } from "@/store";
import type { SimulationState, MarketImpact } from "@/types/simulation";

export default function ComparisonView() {
  const simulations = useStore((s) => s.simulations);
  const comparisonIds = useStore((s) => s.comparisonIds);
  const comparisonActive = useStore((s) => s.comparisonActive);
  const clearComparison = useStore((s) => s.clearComparison);

  if (!comparisonActive || comparisonIds.length < 2) return null;

  const sims = comparisonIds.map((id) => simulations[id]).filter(Boolean);

  if (sims.length < 2) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
      <div className="bg-bg border border-border w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <span className="text-[8px] uppercase tracking-widest text-text-disabled">
              Comparison:
            </span>
            <span className="text-[9px] text-accent">
              {sims
                .map((s) => truncate(s.seed, 30))
                .join(" vs ")}
            </span>
          </div>
          <button
            onClick={clearComparison}
            className="text-[8px] uppercase tracking-widest text-text-disabled border border-border px-2 py-0.5 hover:text-negative hover:border-negative transition-colors"
          >
            Close
          </button>
        </div>

        {/* Columns */}
        <div
          className="flex flex-1 overflow-hidden min-h-0 divide-x divide-border"
          style={{ gridTemplateColumns: `repeat(${sims.length}, 1fr)` }}
        >
          {sims.map((sim, idx) => (
            <SimColumn key={sim.id} sim={sim} sims={sims} colIndex={idx} />
          ))}
        </div>

        {/* Footer: verdict + select buttons */}
        <ComparisonFooter sims={sims} onClose={clearComparison} />
      </div>
    </div>
  );
}

/* ── Single simulation column ── */

function SimColumn({
  sim,
  sims,
  colIndex,
}: {
  sim: SimulationState;
  sims: SimulationState[];
  colIndex: number;
}) {
  const highCount = sim.impacts.filter((i) => i.severity === "HIGH").length;
  const medCount = sim.impacts.filter((i) => i.severity === "MEDIUM").length;
  const lowCount = sim.impacts.filter((i) => i.severity === "LOW").length;

  const avgConfidence =
    sim.impacts.length > 0
      ? sim.impacts.reduce((sum, i) => sum + i.confidence, 0) / sim.impacts.length
      : 0;

  const top5Market = [...sim.marketImpacts]
    .sort((a, b) => Math.abs(b.predictedChange) - Math.abs(a.predictedChange))
    .slice(0, 5);

  // Determine if this col has "worse" outcome metrics vs others
  const allHighCounts = sims.map((s) => s.impacts.filter((i) => i.severity === "HIGH").length);
  const allAgentCounts = sims.map((s) => s.agentCount);
  const allAvgMarket = sims.map((s) =>
    s.marketImpacts.length > 0
      ? s.marketImpacts.reduce((sum, m) => sum + m.predictedChange, 0) / s.marketImpacts.length
      : 0
  );

  const isWorstHigh = highCount === Math.max(...allHighCounts) && highCount > 0;
  const isWorstMarket =
    allAvgMarket[colIndex] === Math.min(...allAvgMarket) && allAvgMarket[colIndex] < 0;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-3 min-w-0">
      {/* Title */}
      <div className="mb-3">
        <span className="text-[8px] uppercase tracking-widest text-text-disabled block mb-0.5">
          Simulation {colIndex + 1}
        </span>
        <p className="text-text-primary text-[10px] leading-snug">{truncate(sim.seed, 80)}</p>
      </div>

      {/* Agent count + duration */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Metric label="Agents" value={sim.agentCount.toLocaleString()} />
        <Metric label="Duration" value={`${sim.elapsed}min`} />
      </div>

      <Divider />

      {/* Impact summary */}
      <div className="mb-3">
        <span className="text-[8px] uppercase tracking-widest text-text-disabled block mb-1.5">
          Impact Summary
        </span>
        <div className="flex flex-col gap-1">
          <ImpactRow
            label="HIGH"
            count={highCount}
            colorClass="text-negative"
            isWorst={isWorstHigh}
          />
          <ImpactRow label="MED" count={medCount} colorClass="text-warning" />
          <ImpactRow label="LOW" count={lowCount} colorClass="text-positive" />
        </div>
      </div>

      <Divider />

      {/* Market impacts */}
      <div className="mb-3">
        <span className="text-[8px] uppercase tracking-widest text-text-disabled block mb-1.5">
          Market Impact
        </span>
        {top5Market.length === 0 ? (
          <p className="text-text-disabled text-[8px]">No data</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {top5Market.map((m) => (
              <MarketRow
                key={m.ticker}
                impact={m}
                allSims={sims}
                field="predictedChange"
              />
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Confidence */}
      <div
        className={`flex items-center justify-between px-2 py-1 ${
          isWorstMarket ? "bg-negative/5 border border-negative/20" : ""
        }`}
      >
        <span className="text-[8px] uppercase tracking-widest text-text-disabled">
          Avg Confidence
        </span>
        <span className="text-[10px] text-accent font-mono">{avgConfidence.toFixed(2)}</span>
      </div>
    </div>
  );
}

/* ── Footer verdict ── */

function ComparisonFooter({
  sims,
  onClose,
}: {
  sims: SimulationState[];
  onClose: () => void;
}) {
  const verdict = buildVerdict(sims);

  return (
    <div className="border-t border-border flex-shrink-0 px-4 py-3 bg-surface">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <span className="text-[8px] uppercase tracking-widest text-text-disabled block mb-0.5">
            Verdict
          </span>
          <p className="text-text-secondary text-[10px]">{verdict}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {sims.map((sim, idx) => (
            <button
              key={sim.id}
              onClick={onClose}
              className="text-[8px] uppercase tracking-widest border border-accent/40 text-accent px-2 py-1 hover:bg-accent/10 transition-colors"
            >
              Select {String.fromCharCode(65 + idx)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function buildVerdict(sims: SimulationState[]): string {
  const highCounts = sims.map((s) => s.impacts.filter((i) => i.severity === "HIGH").length);
  const avgMarkets = sims.map((s) =>
    s.marketImpacts.length > 0
      ? s.marketImpacts.reduce((sum, m) => sum + m.predictedChange, 0) / s.marketImpacts.length
      : 0
  );

  const worstHighIdx = highCounts.indexOf(Math.max(...highCounts));
  const worstMarketIdx = avgMarkets.indexOf(Math.min(...avgMarkets));

  const label = (idx: number) => `Simulation ${String.fromCharCode(65 + idx)}`;

  if (worstHighIdx === worstMarketIdx) {
    return `${label(worstHighIdx)} shows more severe impact with higher HIGH-severity cascades and worse market downside.`;
  }

  return `${label(worstHighIdx)} has more HIGH-severity cascades; ${label(worstMarketIdx)} shows greater market downside.`;
}

function truncate(text: string, len: number): string {
  return text.length > len ? text.slice(0, len - 1) + "…" : text;
}

/* ── Small primitives ── */

function Divider() {
  return <div className="border-t border-border-subtle mb-3" />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[7px] uppercase tracking-widest text-text-disabled block">{label}</span>
      <span className="text-[11px] text-text-primary font-mono">{value}</span>
    </div>
  );
}

function ImpactRow({
  label,
  count,
  colorClass,
  isWorst,
}: {
  label: string;
  count: number;
  colorClass: string;
  isWorst?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-2 py-0.5 ${
        isWorst ? "bg-negative/5 border-l-2 border-negative" : ""
      }`}
    >
      <span className={`text-[8px] uppercase tracking-widest ${colorClass}`}>{label} Impacts</span>
      <span className={`text-[10px] font-mono ${colorClass}`}>{count}</span>
    </div>
  );
}

function MarketRow({
  impact,
  allSims,
  field,
}: {
  impact: MarketImpact;
  allSims: SimulationState[];
  field: keyof MarketImpact;
}) {
  const changeColor =
    impact.predictedChange > 0
      ? "text-positive"
      : impact.predictedChange < 0
      ? "text-negative"
      : "text-text-secondary";

  const sign = impact.predictedChange > 0 ? "+" : "";

  // Find matching ticker across all sims to highlight the worst value
  const allChanges = allSims
    .flatMap((s) => s.marketImpacts.filter((m) => m.ticker === impact.ticker))
    .map((m) => m.predictedChange);

  const isWorst =
    allChanges.length > 1 && impact.predictedChange === Math.min(...allChanges) && impact.predictedChange < 0;

  return (
    <div
      className={`flex items-center justify-between ${
        isWorst ? "bg-negative/5 px-1" : ""
      }`}
    >
      <span className="text-accent text-[8px] font-mono">{impact.ticker}</span>
      <span className={`text-[9px] font-mono font-bold ${changeColor}`}>
        {sign}{impact.predictedChange.toFixed(1)}%
      </span>
    </div>
  );
}
