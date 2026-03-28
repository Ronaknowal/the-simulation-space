import type { StateCreator } from "zustand";
import type { MarketQuoteData, RiskGaugeData } from "@/types/store";
import type { AppStore } from "../index";

export interface MarketSlice {
  marketQuotes: Record<string, MarketQuoteData>;
  riskGauges: RiskGaugeData;
  setMarketQuotes: (quotes: Record<string, MarketQuoteData>) => void;
  setRiskGauges: (gauges: Partial<RiskGaugeData>) => void;
}

export const createMarketSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  MarketSlice
> = (set) => ({
  marketQuotes: {},
  riskGauges: {
    vix: null,
    hySpread: null,
    gscpi: null,
    yieldCurve10y2y: null,
    lastUpdated: 0,
  },

  setMarketQuotes: (quotes) =>
    set((state) => {
      state.marketQuotes = quotes;
    }),

  setRiskGauges: (gauges) =>
    set((state) => {
      Object.assign(state.riskGauges, gauges);
      state.riskGauges.lastUpdated = Date.now();
    }),
});
