// Yahoo Finance — Live market quotes (no API key required)
// Fetched via CORS proxy: query1.finance.yahoo.com

import { proxyFetch } from "@/lib/proxy-fetch";

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  currency: string;
  exchange: string;
  marketState: string;
  history: Array<{ date: string; close: number }>;
  error?: string;
}

export interface YahooFinanceData {
  quotes: Record<string, MarketQuote>;
  indexes: MarketQuote[];
  rates: MarketQuote[];
  commodities: MarketQuote[];
  crypto: MarketQuote[];
  volatility: MarketQuote[];
  summary: {
    totalSymbols: number;
    ok: number;
    failed: number;
    timestamp: string;
  };
}

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const SYMBOLS: Record<string, string> = {
  SPY: "S&P 500",
  QQQ: "Nasdaq 100",
  DIA: "Dow Jones",
  IWM: "Russell 2000",
  TLT: "20Y+ Treasury",
  HYG: "High Yield Corp",
  "GC=F": "Gold",
  "CL=F": "WTI Crude",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "^VIX": "VIX",
};

async function fetchQuote(symbol: string): Promise<MarketQuote | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
    const res = await proxyFetch(url);
    if (!res.ok) return { symbol, name: SYMBOLS[symbol] || symbol, price: 0, prevClose: 0, change: 0, changePct: 0, currency: "USD", exchange: "", marketState: "UNKNOWN", history: [], error: `HTTP ${res.status}` };

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const timestamps = result.timestamp || [];

    const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2] ?? 0;
    const change = price && prevClose ? price - prevClose : 0;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    const history: Array<{ date: string; close: number }> = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        history.push({ date: new Date(timestamps[i] * 1000).toISOString().split("T")[0], close: Math.round(closes[i] * 100) / 100 });
      }
    }

    return {
      symbol,
      name: SYMBOLS[symbol] || meta.shortName || symbol,
      price: Math.round(price * 100) / 100,
      prevClose: Math.round((prevClose || 0) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || "",
      marketState: meta.marketState || "UNKNOWN",
      history,
    };
  } catch (e: any) {
    return { symbol, name: SYMBOLS[symbol] || symbol, price: 0, prevClose: 0, change: 0, changePct: 0, currency: "USD", exchange: "", marketState: "UNKNOWN", history: [], error: e.message };
  }
}

function pickGroup(quotes: Record<string, MarketQuote>, symbols: string[]): MarketQuote[] {
  return symbols.map((s) => quotes[s]).filter(Boolean);
}

export async function fetchYahooFinance(): Promise<YahooFinanceData> {
  const symbolList = Object.keys(SYMBOLS);
  const results = await Promise.allSettled(symbolList.map((s) => fetchQuote(s)));

  const quotes: Record<string, MarketQuote> = {};
  let ok = 0;
  let failed = 0;

  for (const r of results) {
    const q = r.status === "fulfilled" ? r.value : null;
    if (q && !q.error) {
      quotes[q.symbol] = q;
      ok++;
    } else {
      failed++;
      const sym = (q as any)?.symbol || "unknown";
      if (q) quotes[sym] = q;
    }
  }

  return {
    quotes,
    summary: { totalSymbols: symbolList.length, ok, failed, timestamp: new Date().toISOString() },
    indexes: pickGroup(quotes, ["SPY", "QQQ", "DIA", "IWM"]),
    rates: pickGroup(quotes, ["TLT", "HYG"]),
    commodities: pickGroup(quotes, ["GC=F", "CL=F"]),
    crypto: pickGroup(quotes, ["BTC-USD", "ETH-USD"]),
    volatility: pickGroup(quotes, ["^VIX"]),
  };
}
