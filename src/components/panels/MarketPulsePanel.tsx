"use client";

import PanelContainer from "@/components/panels/PanelContainer";
import { useStore } from "@/store";

const INDICES = [
  { label: "NASDAQ", value: "+0.67%", positive: true },
  { label: "DOW", value: "+0.18%", positive: true },
  { label: "RUSSELL", value: "-0.32%", positive: false },
];

export function MarketPulsePanel() {
  const setActiveModule = useStore((s) => s.setActiveModule);

  return (
    <PanelContainer
      id="market-pulse"
      title="Market Pulse"
      expandLabel="TERMINAL"
      onExpand={() => setActiveModule("terminal")}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Chart area */}
        <div
          className="h-12 flex-shrink-0 border-b border-border-subtle"
          style={{
            background: "linear-gradient(to top, rgba(46,204,113,0.03), transparent)",
          }}
        />
        {/* S&P 500 summary */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-border-subtle">
          <span className="text-[9px] text-text-disabled uppercase tracking-widest">S&P 500</span>
          <span className="text-[9px] text-positive font-mono">5,842.30 +0.42%</span>
        </div>
        {/* Index list */}
        <div className="flex flex-col overflow-y-auto flex-1">
          {INDICES.map((index) => (
            <div
              key={index.label}
              className="flex justify-between items-center px-2 py-0.5 border-b border-border-subtle"
            >
              <span className="text-[9px] text-text-disabled uppercase tracking-widest">
                {index.label}
              </span>
              <span className={`text-[9px] font-mono ${index.positive ? "text-positive" : "text-negative"}`}>
                {index.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PanelContainer>
  );
}

export default MarketPulsePanel;
