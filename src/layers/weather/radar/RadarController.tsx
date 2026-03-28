"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchRadarConfig } from "./fetcher";

/**
 * Invisible controller component that manages radar WMS config fetching.
 * The actual CesiumJS imagery layer is managed by the globe component
 * using the config stored in layer data.
 */
export default function RadarController() {
  useLayerData("weather.radar", fetchRadarConfig, 120_000);
  return null;
}
