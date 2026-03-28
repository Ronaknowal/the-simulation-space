"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { OHLCVBar, StockMeta } from "./types";
import { fmtNumber, fmtPrice, sma, bollingerBands, mapRange } from "./utils";

const RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "MAX"] as const;
type Range = typeof RANGES[number];

interface Props {
  bars: OHLCVBar[];
  meta: StockMeta | null;
  onRangeChange: (r: Range) => void;
  currentRange: Range;
  isLoading: boolean;
}

// Custom candlestick rendered via SVG in a layer above recharts
function CandlestickCanvas({
  bars, width, height, padding,
}: {
  bars: OHLCVBar[];
  width: number; height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}) {
  if (!bars.length) return null;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const priceMin = Math.min(...bars.map(b => b.l)) * 0.999;
  const priceMax = Math.max(...bars.map(b => b.h)) * 1.001;
  const candleW = Math.max(1, (chartW / bars.length) * 0.7);

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      width={width}
      height={height}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {bars.map((b, i) => {
          const x = mapRange(i + 0.5, 0, bars.length, 0, chartW);
          const yH = mapRange(b.h, priceMin, priceMax, chartH, 0);
          const yL = mapRange(b.l, priceMin, priceMax, chartH, 0);
          const yO = mapRange(b.o, priceMin, priceMax, chartH, 0);
          const yC = mapRange(b.c, priceMin, priceMax, chartH, 0);
          const isUp = b.c >= b.o;
          const color = isUp ? "#2ecc71" : "#e74c3c";
          const bodyTop = Math.min(yO, yC);
          const bodyH = Math.max(Math.abs(yC - yO), 1);
          return (
            <g key={b.t}>
              <line x1={x} x2={x} y1={yH} y2={yL} stroke={color} strokeWidth={1} />
              <rect
                x={x - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={isUp ? color : "transparent"}
                stroke={color}
                strokeWidth={1}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

type ChartMode = "line" | "candle";

interface Indicator { sma20: boolean; sma50: boolean; sma200: boolean; bb: boolean }

function formatXLabel(t: number, range: Range): string {
  const d = new Date(t);
  if (range === "1D" || range === "5D") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (range === "1Y" || range === "5Y" || range === "MAX") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.c >= d.o;
  const color = isUp ? "#2ecc71" : "#e74c3c";
  return (
    <div className="bg-[#0a0a0a] border border-[#333] p-2 font-mono text-[10px] shadow-2xl min-w-[140px]">
      <div className="text-[#888] mb-1">{new Date(d.t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-[#555]">O</span><span style={{ color }}>{fmtPrice(d.o)}</span>
        <span className="text-[#555]">H</span><span style={{ color: "#2ecc71" }}>{fmtPrice(d.h)}</span>
        <span className="text-[#555]">L</span><span style={{ color: "#e74c3c" }}>{fmtPrice(d.l)}</span>
        <span className="text-[#555]">C</span><span style={{ color }} className="font-bold">{fmtPrice(d.c)}</span>
        <span className="text-[#555]">VOL</span><span className="text-[#888]">{fmtNumber(d.v, 0)}</span>
      </div>
    </div>
  );
};

const VolumeTooltip = () => null;

export default function PriceChart({ bars, meta, onRangeChange, currentRange, isLoading }: Props) {
  const [mode, setMode] = useState<ChartMode>("line");
  const [indicators, setIndicators] = useState<Indicator>({ sma20: false, sma50: true, sma200: false, bb: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const chartData = useMemo(() => {
    if (!bars.length) return [];
    const closes = bars.map(b => b.c);
    const s20 = sma(closes, 20);
    const s50 = sma(closes, 50);
    const s200 = sma(closes, 200);
    const bb = bollingerBands(closes, 20, 2);
    return bars.map((b, i) => ({
      ...b,
      sma20: s20[i],
      sma50: s50[i],
      sma200: s200[i],
      bbUpper: bb.upper[i],
      bbLower: bb.lower[i],
      bbMiddle: bb.middle[i],
    }));
  }, [bars]);

  const volData = useMemo(() => bars.map(b => ({ t: b.t, v: b.v, up: b.c >= b.o })), [bars]);

  const priceMin = useMemo(() => {
    if (!bars.length) return 0;
    const base = Math.min(...bars.map(b => b.l));
    return base * 0.997;
  }, [bars]);

  const priceMax = useMemo(() => {
    if (!bars.length) return 1;
    const base = Math.max(...bars.map(b => b.h));
    return base * 1.003;
  }, [bars]);

  const xTickCount = containerSize.w > 600 ? 8 : 4;

  const prevClose = meta?.regularMarketPreviousClose;

  function toggleInd(key: keyof Indicator) {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const buttonBase = "font-mono text-[9px] px-2 py-0.5 border transition-colors";
  const activeBtn = `${buttonBase} border-[#d4952b] bg-[#d4952b] text-black font-bold`;
  const inactiveBtn = `${buttonBase} border-[#333] text-[#666] hover:border-[#d4952b] hover:text-[#d4952b]`;

  return (
    <div className="flex flex-col h-full bg-[#000]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1c1c1c] bg-[#020202] shrink-0">
        {/* Range buttons */}
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={currentRange === r ? activeBtn : inactiveBtn}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="mx-2 h-4 w-px bg-[#222]" />
        {/* Chart type */}
        <button onClick={() => setMode("line")} className={mode === "line" ? activeBtn : inactiveBtn}>LINE</button>
        <button onClick={() => setMode("candle")} className={mode === "candle" ? activeBtn : inactiveBtn}>CANDLE</button>
        <div className="mx-2 h-4 w-px bg-[#222]" />
        {/* Indicators */}
        {(["sma20", "sma50", "sma200", "bb"] as const).map(ind => (
          <button
            key={ind}
            onClick={() => toggleInd(ind)}
            className={indicators[ind] ? activeBtn : inactiveBtn}
          >
            {ind === "bb" ? "BOLL" : ind.toUpperCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="font-mono text-[11px] text-[#d4952b] animate-pulse">FETCHING DATA…</span>
        </div>
      ) : !bars.length ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="font-mono text-[11px] text-[#444]">NO DATA</span>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Main chart */}
          <div ref={containerRef} className="relative flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickCount={xTickCount}
                  tickFormatter={t => formatXLabel(t, currentRange)}
                  tick={{ fill: "#555", fontFamily: "monospace", fontSize: 9 }}
                  axisLine={{ stroke: "#222" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[priceMin, priceMax]}
                  orientation="right"
                  tickFormatter={v => fmtPrice(v)}
                  tick={{ fill: "#555", fontFamily: "monospace", fontSize: 9 }}
                  axisLine={{ stroke: "#222" }}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />

                {prevClose && (
                  <ReferenceLine y={prevClose} stroke="#333" strokeDasharray="4 2" />
                )}

                {/* Bollinger bands */}
                {indicators.bb && (
                  <>
                    <Area dataKey="bbUpper" stroke="#666" fill="transparent" strokeWidth={1} strokeDasharray="3 2" dot={false} activeDot={false} />
                    <Area dataKey="bbLower" stroke="#666" fill="#d4952b" fillOpacity={0.03} strokeWidth={1} strokeDasharray="3 2" dot={false} activeDot={false} />
                  </>
                )}

                {/* Price area (line mode) */}
                {mode === "line" && (
                  <Area
                    dataKey="c"
                    stroke="#d4952b"
                    strokeWidth={1.5}
                    fill="url(#priceGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#d4952b", stroke: "#000" }}
                  />
                )}

                {/* SMA lines */}
                {indicators.sma20 && (
                  <Area dataKey="sma20" stroke="#44ccff" strokeWidth={1} fill="transparent" dot={false} activeDot={false} />
                )}
                {indicators.sma50 && (
                  <Area dataKey="sma50" stroke="#ff8c42" strokeWidth={1.5} fill="transparent" dot={false} activeDot={false} />
                )}
                {indicators.sma200 && (
                  <Area dataKey="sma200" stroke="#ff5f63" strokeWidth={1} fill="transparent" dot={false} activeDot={false} />
                )}

                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4952b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#d4952b" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>

            {/* Candlestick overlay */}
            {mode === "candle" && bars.length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ paddingTop: 8, paddingRight: 70, paddingBottom: 0, paddingLeft: 0 }}>
                <CandlestickCanvas
                  bars={bars}
                  width={containerSize.w - 70}
                  height={containerSize.h - 8}
                  padding={{ top: 0, right: 0, bottom: 20, left: 0 }}
                />
              </div>
            )}
          </div>

          {/* Volume bars */}
          <div className="h-[60px] shrink-0 border-t border-[#111]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={volData} margin={{ top: 2, right: 12, bottom: 0, left: 0 }}>
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" hide />
                <YAxis orientation="right" tick={false} axisLine={false} tickLine={false} width={70} />
                <Bar
                  dataKey="v"
                  fill="#d4952b"
                  opacity={0.4}
                  radius={[1, 1, 0, 0]}
                />
                <Tooltip content={<VolumeTooltip />} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Indicator legend */}
      <div className="flex items-center gap-3 px-3 py-1 border-t border-[#111] bg-[#020202] shrink-0">
        {indicators.sma20 && <span className="font-mono text-[9px]"><span style={{ color: "#44ccff" }}>■</span> SMA20</span>}
        {indicators.sma50 && <span className="font-mono text-[9px]"><span style={{ color: "#ff8c42" }}>■</span> SMA50</span>}
        {indicators.sma200 && <span className="font-mono text-[9px]"><span style={{ color: "#ff5f63" }}>■</span> SMA200</span>}
        {indicators.bb && <span className="font-mono text-[9px] text-[#666]">■ BOLL(20,2)</span>}
        {prevClose && <span className="font-mono text-[9px] text-[#444]">--- PREV CLOSE {fmtPrice(prevClose)}</span>}
      </div>
    </div>
  );
}
