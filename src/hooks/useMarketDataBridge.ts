"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import type { MarketQuoteData } from "@/types/store";

/**
 * Bridges layer data (yahoo-finance, fred, gscpi) into the normalized
 * marketQuotes and riskGauges store entries that PULSE panels read.
 */
export function useMarketDataBridge() {
  const yahooData = useStore((s) => s.layers["markets.yahoo-finance"]?.data);
  const fredData = useStore((s) => s.layers["markets.fred"]?.data);
  const gscpiData = useStore((s) => s.layers["markets.gscpi"]?.data);
  const setMarketQuotes = useStore((s) => s.setMarketQuotes);
  const setRiskGauges = useStore((s) => s.setRiskGauges);
  const lastYahooRef = useRef<any>(null);
  const lastFredRef = useRef<any>(null);
  const lastGscpiRef = useRef<any>(null);

  // Bridge Yahoo Finance -> marketQuotes
  useEffect(() => {
    if (!yahooData || yahooData === lastYahooRef.current) return;
    lastYahooRef.current = yahooData;

    const quotes: Record<string, MarketQuoteData> = {};
    const rawQuotes = yahooData?.quotes;
    if (rawQuotes && typeof rawQuotes === "object") {
      // quotes is Record<string, MarketQuote> (an object keyed by symbol)
      const entries = Array.isArray(rawQuotes)
        ? rawQuotes
        : Object.values(rawQuotes);
      for (const q of entries) {
        if (q?.symbol && q.price > 0 && !q.error) {
          quotes[q.symbol] = {
            symbol: q.symbol,
            name: q.name || q.symbol,
            price: q.price,
            prevClose: q.prevClose || q.price,
            change: q.change || 0,
            changePct: q.changePct || 0,
            currency: q.currency || "USD",
            marketState: q.marketState || "REGULAR",
          };
        }
      }
    }
    if (Object.keys(quotes).length > 0) {
      setMarketQuotes(quotes);
    }
  }, [yahooData, setMarketQuotes]);

  // Bridge FRED + GSCPI + Yahoo -> riskGauges
  useEffect(() => {
    if (
      fredData === lastFredRef.current &&
      gscpiData === lastGscpiRef.current &&
      yahooData === lastYahooRef.current
    ) return;
    lastFredRef.current = fredData;
    lastGscpiRef.current = gscpiData;

    const gauges: Record<string, number | null> = {
      vix: null,
      hySpread: null,
      gscpi: null,
      yieldCurve10y2y: null,
    };

    // VIX from Yahoo (more real-time) or FRED fallback
    if (yahooData?.volatility && Array.isArray(yahooData.volatility)) {
      const vixQuote = yahooData.volatility[0];
      if (vixQuote?.price) gauges.vix = vixQuote.price;
    } else if (yahooData?.quotes) {
      // Fallback: check quotes record directly
      const vixQuote = yahooData.quotes["^VIX"] || yahooData.quotes["VIX"];
      if (vixQuote?.price) gauges.vix = vixQuote.price;
    }
    if (gauges.vix === null && Array.isArray(fredData?.indicators)) {
      const vixInd = fredData.indicators.find((i: any) => i?.id === "VIXCLS");
      if (vixInd?.value != null) gauges.vix = vixInd.value;
    }

    // HY Spread from FRED
    if (Array.isArray(fredData?.indicators)) {
      const hy = fredData.indicators.find((i: any) => i?.id === "BAMLH0A0HYM2");
      if (hy?.value != null) gauges.hySpread = hy.value;
    }

    // Yield Curve (10Y-2Y) from FRED
    if (Array.isArray(fredData?.indicators)) {
      const yc = fredData.indicators.find((i: any) => i?.id === "T10Y2Y");
      if (yc?.value != null) gauges.yieldCurve10y2y = yc.value;
    }

    // GSCPI from GSCPI layer
    if (gscpiData?.latest?.value != null) {
      gauges.gscpi = gscpiData.latest.value;
    }

    // Only update if we have at least one non-null value
    const hasData = Object.values(gauges).some((v) => v !== null);
    if (hasData) {
      setRiskGauges(gauges);
    }
  }, [yahooData, fredData, gscpiData, setRiskGauges]);
}
