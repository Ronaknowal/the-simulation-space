"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchTreasuryData } from "./fetcher";

export default function TreasuryLayerController() {
  useLayerData("markets.treasury", fetchTreasuryData, 3_600_000, true);
  return null;
}
