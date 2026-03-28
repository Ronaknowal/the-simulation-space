"use client";

import { StockMeta } from "./types";
import { fmtNumber, fmtPrice } from "./utils";

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 border-r border-[#1c1c1c] last:border-r-0">
      <span className="font-mono text-[8px] text-[#555] uppercase tracking-widest whitespace-nowrap">{label}</span>
      <span className="font-mono text-[11px] font-bold tabular-nums whitespace-nowrap" style={{ color: color || "#fff" }}>
        {value}
      </span>
    </div>
  );
}

export default function KeyStats({ meta }: { meta: StockMeta | null }) {
  if (!meta) {
    return (
      <div className="flex items-center h-9 border-b border-[#1c1c1c] bg-[#050505] px-3">
        <span className="font-mono text-[10px] text-[#333]">Loading stats…</span>
      </div>
    );
  }

  const chg = meta.regularMarketChange ?? 0;

  const open = meta.regularMarketOpen;
  const prevClose = meta.regularMarketPreviousClose;
  const high = meta.regularMarketDayHigh;
  const low = meta.regularMarketDayLow;
  const vol = meta.regularMarketVolume;
  const avgVol = meta.averageVolume;
  const mc = meta.marketCap;
  const pe = meta.trailingPE;
  const w52h = meta.fiftyTwoWeekHigh;
  const w52l = meta.fiftyTwoWeekLow;
  const beta = meta.beta;
  const eps = meta.epsTrailingTwelveMonths;
  const dy = meta.dividendYield;

  return (
    <div className="flex items-center h-9 border-b border-[#1c1c1c] bg-[#050505] overflow-x-auto scrollbar-none">
      <Stat label="OPEN" value={fmtPrice(open)} />
      <Stat label="PREV CLOSE" value={fmtPrice(prevClose)} />
      <Stat label="DAY HIGH" value={fmtPrice(high)} color="#2ecc71" />
      <Stat label="DAY LOW" value={fmtPrice(low)} color="#e74c3c" />
      <Stat label="VOLUME" value={fmtNumber(vol, 0)} />
      <Stat label="AVG VOL" value={fmtNumber(avgVol, 0)} />
      <Stat label="MKT CAP" value={fmtNumber(mc)} color="#d4952b" />
      <Stat label="P/E (TTM)" value={pe > 0 ? pe.toFixed(1) : "N/A"} />
      <Stat label="EPS (TTM)" value={eps !== undefined ? `$${eps?.toFixed(2)}` : "N/A"} />
      <Stat label="52W HIGH" value={fmtPrice(w52h)} color="#2ecc71" />
      <Stat label="52W LOW" value={fmtPrice(w52l)} color="#e74c3c" />
      <Stat label="BETA" value={beta > 0 ? beta.toFixed(2) : "N/A"} />
      {dy > 0 && <Stat label="DIV YIELD" value={`${(dy * 100).toFixed(2)}%`} color="#d4952b" />}
      <Stat label="EXCHANGE" value={meta.exchange || "—"} />
    </div>
  );
}
