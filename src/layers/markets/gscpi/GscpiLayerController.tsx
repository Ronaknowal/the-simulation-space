"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchGscpiData } from "./fetcher";

export default function GscpiLayerController() {
  useLayerData("markets.gscpi", fetchGscpiData, 86_400_000, true); // daily; auto-start for risk gauges
  return null;
}
