"use client";

import { useMemo } from "react";
import { useStore } from "@/store";

interface TickerEntry {
  symbol: string;
  change?: number;
  value?: number;
}

const TICKER_SYMBOLS = ["SPY", "QQQ", "BTC-USD", "^VIX", "CL=F", "GC=F", "TLT"];
const DISPLAY_NAMES: Record<string, string> = {
  "SPY": "SPY",
  "QQQ": "QQQ",
  "BTC-USD": "BTC",
  "^VIX": "VIX",
  "CL=F": "OIL",
  "GC=F": "GOLD",
  "TLT": "10Y",
};

function TickerItem({ entry }: { entry: TickerEntry }) {
  const hasChange = entry.change !== undefined;
  const isPositive = hasChange && entry.change! > 0;
  const isNegative = hasChange && entry.change! < 0;

  let valueClass = "text-text-disabled";
  let displayValue: string;

  if (!hasChange) {
    displayValue = String(entry.value ?? "");
    valueClass = "text-text-disabled";
  } else if (isPositive) {
    displayValue = `+${entry.change!.toFixed(2)}%`;
    valueClass = "text-positive";
  } else if (isNegative) {
    displayValue = `${entry.change!.toFixed(2)}%`;
    valueClass = "text-negative";
  } else {
    displayValue = `${entry.change!.toFixed(2)}%`;
    valueClass = "text-text-disabled";
  }

  return (
    <span className="inline-flex items-center gap-1 px-3">
      <span className="text-text-tertiary">{entry.symbol}</span>
      <span className={valueClass}>{displayValue}</span>
    </span>
  );
}

export function MarketTicker() {
  const marketQuotes = useStore((s) => s.marketQuotes);

  const tickers = useMemo<TickerEntry[]>(() => {
    const hasQuotes = Object.keys(marketQuotes).length > 0;
    if (!hasQuotes) {
      // Fallback static data until real data loads
      return [
        { symbol: "SPY", change: 0 },
        { symbol: "QQQ", change: 0 },
        { symbol: "BTC", change: 0 },
        { symbol: "VIX", value: 0 },
        { symbol: "OIL", change: 0 },
        { symbol: "GOLD", change: 0 },
        { symbol: "10Y", value: 0 },
      ];
    }
    return TICKER_SYMBOLS.map((sym) => {
      const q = marketQuotes[sym];
      const displayName = DISPLAY_NAMES[sym] || sym;
      if (!q) return { symbol: displayName, change: 0 };
      // VIX shows absolute value, others show % change
      if (sym === "^VIX") {
        return { symbol: displayName, value: q.price };
      }
      return { symbol: displayName, change: q.changePct };
    });
  }, [marketQuotes]);

  const tickersDoubled = [...tickers, ...tickers];

  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap text-[9px]">
        {tickersDoubled.map((entry, idx) => (
          <TickerItem key={`${entry.symbol}-${idx}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export default MarketTicker;
