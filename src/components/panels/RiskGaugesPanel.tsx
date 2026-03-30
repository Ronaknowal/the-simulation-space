"use client";

import PanelContainer from "@/components/panels/PanelContainer";
import { useStore } from "@/store";

function getGaugeColor(label: string, value: number | null): "positive" | "warning" | "negative" {
  if (value === null) return "positive";
  switch (label) {
    case "VIX":
      if (value < 20) return "positive";
      if (value < 30) return "warning";
      return "negative";
    case "HY SPRD":
      if (value < 4) return "positive";
      if (value < 6) return "warning";
      return "negative";
    case "YLD CRV":
      if (value < 0) return "negative";
      if (value < 0.5) return "warning";
      return "positive";
    case "GSCPI":
      if (value < 0) return "positive";
      if (value < 1) return "warning";
      return "negative";
    default:
      return "positive";
  }
}

const colorClass: Record<"positive" | "warning" | "negative", string> = {
  positive: "text-positive",
  warning: "text-warning",
  negative: "text-negative",
};

export function RiskGaugesPanel() {
  const riskGauges = useStore((s) => s.riskGauges);

  const gauges = [
    { label: "VIX", value: riskGauges.vix },
    { label: "HY SPRD", value: riskGauges.hySpread },
    { label: "YLD CRV", value: riskGauges.yieldCurve10y2y },
    { label: "GSCPI", value: riskGauges.gscpi },
  ];

  return (
    <PanelContainer id="risk-gauges" title="Risk Gauges">
      <div className="grid grid-cols-2 grid-rows-2 gap-px h-full p-px">
        {gauges.map((gauge) => {
          const color = getGaugeColor(gauge.label, gauge.value);
          return (
            <div
              key={gauge.label}
              className="bg-surface flex flex-col items-center justify-center gap-0.5"
            >
              {gauge.value !== null ? (
                <span className={`text-[14px] font-bold font-mono ${colorClass[color]}`}>
                  {gauge.value.toFixed(2)}
                </span>
              ) : (
                <span className="text-[14px] font-mono text-text-disabled animate-pulse">--</span>
              )}
              <span className="text-[7px] uppercase tracking-widest text-text-disabled">
                {gauge.label}
              </span>
            </div>
          );
        })}
      </div>
    </PanelContainer>
  );
}

export default RiskGaugesPanel;
