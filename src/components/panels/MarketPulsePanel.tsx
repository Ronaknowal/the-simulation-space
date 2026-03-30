"use client";

import PanelContainer from "@/components/panels/PanelContainer";
import { useStore } from "@/store";

const INDEX_SYMBOLS = ["QQQ", "DIA", "IWM", "TLT"];

export function MarketPulsePanel() {
  const setActiveModule = useStore((s) => s.setActiveModule);
  const marketQuotes = useStore((s) => s.marketQuotes);

  const spy = marketQuotes["SPY"];
  const hasData = !!spy;

  return (
    <PanelContainer
      id="market-pulse"
      title="Market Pulse"
      expandLabel="TERMINAL"
      onExpand={() => setActiveModule("terminal")}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Chart area placeholder */}
        <div
          className="h-12 flex-shrink-0 border-b border-border-subtle"
          style={{
            background: hasData && spy.changePct >= 0
              ? "linear-gradient(to top, rgba(46,204,113,0.03), transparent)"
              : "linear-gradient(to top, rgba(231,76,60,0.03), transparent)",
          }}
        />
        {/* S&P 500 summary */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-border-subtle">
          <span className="text-[9px] text-text-disabled uppercase tracking-widest">S&P 500</span>
          {hasData ? (
            <span className={`text-[9px] font-mono ${spy.changePct >= 0 ? "text-positive" : "text-negative"}`}>
              {spy.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {spy.changePct >= 0 ? "+" : ""}{spy.changePct.toFixed(2)}%
            </span>
          ) : (
            <span className="text-[9px] font-mono text-text-disabled animate-pulse">Loading...</span>
          )}
        </div>
        {/* Index list */}
        <div className="flex flex-col overflow-y-auto flex-1">
          {INDEX_SYMBOLS.map((sym) => {
            const q = marketQuotes[sym];
            return (
              <div
                key={sym}
                className="flex justify-between items-center px-2 py-0.5 border-b border-border-subtle"
              >
                <span className="text-[9px] text-text-disabled uppercase tracking-widest">
                  {sym}
                </span>
                {q ? (
                  <span className={`text-[9px] font-mono ${q.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                    {q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-text-disabled">--</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PanelContainer>
  );
}

export default MarketPulsePanel;
