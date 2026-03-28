"use client";

import PanelContainer from "@/components/panels/PanelContainer";

const GAUGES = [
  { label: "VIX", value: 16.3, color: "positive" as const },
  { label: "HY SPRD", value: 3.42, color: "warning" as const },
  { label: "YLD CRV", value: -0.18, color: "negative" as const },
  { label: "GSCPI", value: 48.2, color: "positive" as const },
];

const colorClass: Record<"positive" | "warning" | "negative", string> = {
  positive: "text-positive",
  warning: "text-warning",
  negative: "text-negative",
};

export function RiskGaugesPanel() {
  return (
    <PanelContainer id="risk-gauges" title="Risk Gauges">
      <div className="grid grid-cols-2 grid-rows-2 gap-px h-full p-px">
        {GAUGES.map((gauge) => (
          <div
            key={gauge.label}
            className="bg-surface flex flex-col items-center justify-center gap-0.5"
          >
            <span className={`text-[14px] font-bold font-mono ${colorClass[gauge.color]}`}>
              {gauge.value}
            </span>
            <span className="text-[7px] uppercase tracking-widest text-text-disabled">
              {gauge.label}
            </span>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
}

export default RiskGaugesPanel;
