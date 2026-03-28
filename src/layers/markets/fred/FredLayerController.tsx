"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchFredData } from "./fetcher";

export default function FredLayerController() {
  useLayerData("markets.fred", fetchFredData, 3_600_000, true); // 1hr refresh; auto-start for risk gauges
  return null;
}
