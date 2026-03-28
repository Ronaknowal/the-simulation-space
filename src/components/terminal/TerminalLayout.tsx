"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CommandBar from "./CommandBar";
import FunctionMenu from "./FunctionMenu";
import KeyStats from "./KeyStats";
import PriceChart from "./PriceChart";
import CompanyProfile from "./CompanyProfile";
import FinancialTabs from "./FinancialTabs";
import NewsFeed from "./NewsFeed";
import SupplyChainResearch from "./SupplyChainResearch";
import OwnershipPanel from "./OwnershipPanel";
import { TerminalData } from "./types";
import { RANGE_TO_INTERVAL } from "./utils";

const DEFAULT_SYMBOL = "AAPL";

const EMPTY: TerminalData = {
  symbol: DEFAULT_SYMBOL,
  isLoading: false,
  error: null,
  bars: [],
  meta: null,
  profile: null,
  quarterlyIncome: [],
  annualIncome: [],
  quarterlyBalance: [],
  annualBalance: [],
  quarterlyCashflow: [],
  annualCashflow: [],
  news: [],
  supplyChain: null,
  holders: [],
  insiders: [],
  recommendations: [],
};

type Range = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";

export default function TerminalLayout() {
  const [data, setData] = useState<TerminalData>(EMPTY);
  const [range, setRange] = useState<Range>("1Y");
  const [activeFunc, setActiveFunc] = useState("GP");
  const abortRef = useRef<AbortController | null>(null);

  // --- Data fetching ---

  const loadQuote = useCallback(async (symbol: string, r: Range) => {
    const { range: yfRange, interval } = RANGE_TO_INTERVAL[r];
    try {
      const res = await fetch(`/api/terminal/quote?symbol=${symbol}&range=${yfRange}&interval=${interval}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(prev => ({
        ...prev,
        bars: json.bars ?? [],
        meta: json.meta ?? null,
        isLoading: false,
        error: json.error || null,
      }));
    } catch (e: any) {
      setData(prev => ({ ...prev, isLoading: false, error: e.message }));
    }
  }, []);

  const loadProfile = useCallback(async (symbol: string) => {
    try {
      const res = await fetch(`/api/terminal/profile?symbol=${symbol}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(prev => ({
        ...prev,
        profile: json.profile ?? null,
        quarterlyIncome: json.quarterlyIncome ?? [],
        annualIncome: json.annualIncome ?? [],
        quarterlyBalance: json.quarterlyBalance ?? [],
        annualBalance: json.annualBalance ?? [],
        quarterlyCashflow: json.quarterlyCashflow ?? [],
        annualCashflow: json.annualCashflow ?? [],
        holders: json.holders ?? [],
        insiders: json.insiders ?? [],
        recommendations: json.recommendations ?? [],
      }));
    } catch { /* silent */ }
  }, []);

  const loadNews = useCallback(async (symbol: string) => {
    try {
      const res = await fetch(`/api/terminal/news?symbol=${symbol}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(prev => ({ ...prev, news: json.news ?? [] }));
    } catch { /* silent */ }
  }, []);

  const loadSupplyChain = useCallback(async (symbol: string) => {
    try {
      const res = await fetch(`/api/terminal/supply-chain?symbol=${symbol}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(prev => ({ ...prev, supplyChain: json }));
    } catch { /* silent */ }
  }, []);

  const loadAll = useCallback(async (symbol: string, r: Range) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setData(prev => ({
      ...EMPTY,
      symbol,
      isLoading: true,
      error: null,
      // Keep old data while loading
      meta: prev.symbol === symbol ? prev.meta : null,
    }));

    // Load quote first (fast), then profile + news + supply chain in parallel
    await loadQuote(symbol, r);
    loadProfile(symbol);
    loadNews(symbol);
    loadSupplyChain(symbol);
  }, [loadQuote, loadProfile, loadNews, loadSupplyChain]);

  // Initial load
  useEffect(() => {
    loadAll(DEFAULT_SYMBOL, "1Y");
  }, [loadAll]);

  function handleSymbol(sym: string) {
    setData(prev => ({ ...prev, symbol: sym }));
    loadAll(sym, range);
  }

  function handleRangeChange(r: Range) {
    setRange(r);
    loadQuote(data.symbol, r);
  }

  function handleFunctionSelect(fn: string) {
    setActiveFunc(fn);
    // Scroll to section
    const el = document.getElementById(`terminal-section-${fn}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div
      className="flex flex-col bg-[#000] text-white overflow-hidden"
      style={{
        height: "100%",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      }}
    >
      {/* Top command bar */}
      <CommandBar
        symbol={data.symbol}
        onSymbol={handleSymbol}
        marketState={data.meta?.marketState}
        price={data.meta?.regularMarketPrice}
        change={data.meta?.regularMarketChange}
        changePct={data.meta?.regularMarketChangePercent}
      />

      {/* Stats bar */}
      <KeyStats meta={data.meta} />

      {/* Error banner */}
      {data.error && (
        <div className="bg-[#1a0000] border-b border-[#e74c3c] px-4 py-1.5 font-mono text-[10px] text-[#e74c3c] shrink-0">
          ERROR: {data.error} — Check symbol or try again.
        </div>
      )}

      {/* Main body */}
      <div className="flex flex-1 min-h-0">
        {/* Function sidebar */}
        <FunctionMenu active={activeFunc} onSelect={handleFunctionSelect} />

        {/* Content grid */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Top row: chart + right stack */}
          <div className="flex flex-1 min-h-0">
            {/* LEFT: Price chart */}
            <div
              id="terminal-section-GP"
              className="flex-1 min-w-0 flex flex-col border-r border-[#1c1c1c]"
              style={{ minWidth: 0 }}
            >
              <PriceChart
                bars={data.bars}
                meta={data.meta}
                onRangeChange={handleRangeChange}
                currentRange={range}
                isLoading={data.isLoading}
              />
            </div>

            {/* RIGHT stack */}
            <div
              className="flex flex-col border-l border-[#1c1c1c]"
              style={{ width: 360, minWidth: 300, maxWidth: 420 }}
            >
              {/* Company profile - top half */}
              <div
                id="terminal-section-DES"
                className="flex-1 min-h-0 overflow-hidden"
                style={{ maxHeight: "50%" }}
              >
                <CompanyProfile
                  profile={data.profile}
                  meta={data.meta}
                  symbol={data.symbol}
                />
              </div>
              {/* Financials - bottom half */}
              <div
                id="terminal-section-FA"
                className="flex-1 min-h-0 overflow-hidden border-t border-[#1c1c1c]"
                style={{ maxHeight: "50%" }}
              >
                <FinancialTabs
                  quarterlyIncome={data.quarterlyIncome}
                  annualIncome={data.annualIncome}
                  quarterlyBalance={data.quarterlyBalance}
                  annualBalance={data.annualBalance}
                  quarterlyCashflow={data.quarterlyCashflow}
                  annualCashflow={data.annualCashflow}
                />
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div
            className="flex border-t border-[#1c1c1c] shrink-0"
            style={{ height: 480 }}
          >
            {/* News */}
            <div
              id="terminal-section-NEWS"
              className="flex flex-col border-r border-[#1c1c1c]"
              style={{ width: "30%", minWidth: 200 }}
            >
              <NewsFeed news={data.news} symbol={data.symbol} />
            </div>

            {/* Supply chain */}
            <div
              id="terminal-section-SPLC"
              className="flex flex-col border-r border-[#1c1c1c]"
              style={{ flex: 1, minWidth: 0 }}
            >
              <SupplyChainResearch
                data={data.supplyChain}
                symbol={data.symbol}
                onNodeClick={handleSymbol}
              />
            </div>

            {/* Ownership */}
            <div
              id="terminal-section-OWN"
              className="flex flex-col"
              style={{ width: "28%", minWidth: 200 }}
            >
              <OwnershipPanel
                holders={data.holders}
                insiders={data.insiders}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-3 h-5 border-t border-[#111] bg-[#020202] shrink-0">
        <span className="font-mono text-[8px] text-[#444]">
          {data.meta ? `${data.symbol} · ${data.meta.currency} · ${data.meta.exchange}` : "LOADING…"}
        </span>
        <span className="font-mono text-[8px] text-[#333]">
          {data.bars.length > 0 ? `${data.bars.length} BARS · ${range}` : ""}
        </span>
        <div className="flex-1" />
        <span className="font-mono text-[8px] text-[#333]">
          DATA: YAHOO FINANCE · SEC EDGAR
        </span>
      </div>
    </div>
  );
}
