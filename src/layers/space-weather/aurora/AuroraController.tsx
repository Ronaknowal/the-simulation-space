"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchAuroraForecast } from "./fetcher";

/**
 * Invisible controller component that manages aurora forecast data fetching.
 * Refreshes every 30 minutes.
 */
export default function AuroraController() {
  useLayerData("space-weather.aurora", fetchAuroraForecast, 1_800_000);
  return null;
}
