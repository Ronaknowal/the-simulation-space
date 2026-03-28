"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchSolarWind } from "./fetcher";

/**
 * Invisible controller component that manages solar wind data fetching.
 * Refreshes every 60 seconds for near-real-time DSCOVR data.
 */
export default function SolarWindController() {
  useLayerData("space-weather.solar-wind", fetchSolarWind, 60_000);
  return null;
}
