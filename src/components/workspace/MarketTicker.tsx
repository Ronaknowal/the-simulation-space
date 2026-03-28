"use client";

interface TickerEntry {
  symbol: string;
  change?: number;
  value?: number;
}

const TICKERS: TickerEntry[] = [
  { symbol: "SPY", change: 0.42 },
  { symbol: "QQQ", change: 0.67 },
  { symbol: "BTC", change: -1.2 },
  { symbol: "VIX", value: 16.3 },
  { symbol: "OIL", change: 1.8 },
  { symbol: "GOLD", change: 0.3 },
  { symbol: "10Y", value: 4.28 },
];

// Duplicate for seamless loop
const TICKERS_DOUBLED = [...TICKERS, ...TICKERS];

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
  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap text-[9px]">
        {TICKERS_DOUBLED.map((entry, idx) => (
          <TickerItem key={`${entry.symbol}-${idx}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export default MarketTicker;
