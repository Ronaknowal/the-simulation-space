"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchYahooFinance } from "./fetcher";

export default function YahooFinanceLayerController() {
  useLayerData("markets.yahoo-finance", fetchYahooFinance, 60_000, true); // 1min refresh; auto-start for market ticker
  return null;
}
