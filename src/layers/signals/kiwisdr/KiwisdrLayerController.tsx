"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchKiwisdrData } from "./fetcher";

export default function KiwisdrLayerController() {
  useLayerData("signals.kiwisdr", fetchKiwisdrData, 600_000, true); // 10min; auto-start for globe + alerts
  return null;
}
