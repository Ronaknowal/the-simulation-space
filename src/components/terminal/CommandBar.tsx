"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Terminal, TrendingUp, TrendingDown } from "lucide-react";

interface Suggestion {
  symbol: string;
  shortname: string;
  quoteType: string;
  exchange: string;
}

interface Props {
  symbol: string;
  onSymbol: (s: string) => void;
  marketState?: string;
  price?: number;
  change?: number;
  changePct?: number;
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const utc = now.toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" });
  const local = now.toLocaleTimeString("en-US", { hour12: false });
  return (
    <div className="flex items-center gap-3 font-mono text-[11px]">
      <span className="text-[#888]">UTC</span>
      <span className="text-[#d4952b] tabular-nums">{utc}</span>
      <span className="text-[#888]">LOCAL</span>
      <span className="text-[#ddd] tabular-nums">{local}</span>
    </div>
  );
}

export default function CommandBar({ symbol, onSymbol, marketState, price, change, changePct }: Props) {
  const [input, setInput] = useState(symbol);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setInput(symbol); }, [symbol]);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setSuggestions([]); return; }
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`;
      const r = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!r.ok) return;
      const data = await r.json();
      setSuggestions(
        (data?.quotes || [])
          .filter((s: any) => s.quoteType === "EQUITY" || s.quoteType === "ETF" || s.quoteType === "FUTURE")
          .slice(0, 6)
      );
    } catch { /* ignore */ }
  }, []);

  function handleChange(v: string) {
    setInput(v.toUpperCase());
    setIdx(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 200);
    setOpen(true);
  }

  function handleSelect(s: Suggestion) {
    setInput(s.symbol);
    setSuggestions([]);
    setOpen(false);
    onSymbol(s.symbol);
  }

  function handleSubmit() {
    const sym = input.trim().toUpperCase();
    if (sym) {
      onSymbol(sym);
      setSuggestions([]);
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (idx >= 0 && suggestions[idx]) handleSelect(suggestions[idx]);
      else handleSubmit();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setSuggestions([]);
    }
  }

  const isOpen = marketState === "REGULAR";
  const isUp = (change ?? 0) >= 0;
  const priceColor = isUp ? "#2ecc71" : "#e74c3c";

  return (
    <div className="relative flex h-9 w-full items-center border-b border-[#222] bg-[#000] px-3 gap-3 z-50">
      {/* Brand */}
      <div className="flex items-center gap-2 border-r border-[#333] pr-3 shrink-0">
        <Terminal className="h-3.5 w-3.5 text-[#d4952b]" />
        <span className="font-mono text-[11px] font-bold text-[#d4952b] tracking-widest">TERM</span>
        <span className="font-mono text-[9px] text-[#444]">TERMINAL</span>
      </div>

      {/* Command input */}
      <div className="relative flex items-center gap-1.5 shrink-0">
        <ChevronRight className="h-3 w-3 text-[#d4952b] shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => input && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="TICKER"
          className="w-24 bg-transparent font-mono text-[13px] font-bold text-[#d4952b] placeholder-[#444] outline-none uppercase tracking-widest caret-[#d4952b]"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="font-mono text-[9px] text-[#555]">US EQUITY</span>

        {/* Autocomplete dropdown */}
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 min-w-[280px] border border-[#333] bg-[#0a0a0a] shadow-2xl">
            {suggestions.map((s, i) => (
              <button
                key={s.symbol}
                onMouseDown={() => handleSelect(s)}
                className={`flex w-full items-center gap-3 px-3 py-1.5 text-left font-mono ${
                  i === idx ? "bg-[#d4952b] text-black" : "hover:bg-[#1a1a1a] text-white"
                }`}
              >
                <span className="text-[12px] font-bold w-16 shrink-0" style={{ color: i === idx ? 'black' : '#d4952b' }}>
                  {s.symbol}
                </span>
                <span className="text-[10px] truncate text-[#aaa]" style={{ color: i === idx ? '#333' : '#888' }}>
                  {s.shortname}
                </span>
                <span className="ml-auto text-[9px] shrink-0" style={{ color: i === idx ? '#555' : '#555' }}>
                  {s.exchange}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current price display */}
      {price !== undefined && (
        <div className="flex items-center gap-2 border-l border-[#222] pl-3 shrink-0">
          <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: priceColor }}>
            {price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: priceColor }}>
            {isUp ? "+" : ""}{change?.toFixed(2)} ({isUp ? "+" : ""}{changePct?.toFixed(2)}%)
          </span>
          {isUp ? (
            <TrendingUp className="h-3.5 w-3.5" style={{ color: priceColor }} />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" style={{ color: priceColor }} />
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Market status */}
      <div className="flex items-center gap-2 border-l border-[#222] pl-3 shrink-0">
        <span
          className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-[#2ecc71] animate-pulse" : "bg-[#555]"}`}
        />
        <span className="font-mono text-[10px]" style={{ color: isOpen ? "#2ecc71" : "#666" }}>
          {isOpen ? "MKTS OPEN" : "MKTS CLOSED"}
        </span>
      </div>

      <Clock />
    </div>
  );
}
