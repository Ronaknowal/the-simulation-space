"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchEiaData } from "./fetcher";

export default function EiaLayerController() {
  useLayerData("markets.eia", fetchEiaData, 3_600_000, true);
  return null;
}
