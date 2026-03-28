"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchLightningStrikes } from "./fetcher";

/**
 * Invisible controller component that manages lightning strike data fetching.
 * Polls every 10 seconds for near-real-time updates.
 */
export default function LightningController() {
  useLayerData("weather.lightning", fetchLightningStrikes, 10_000);
  return null;
}
