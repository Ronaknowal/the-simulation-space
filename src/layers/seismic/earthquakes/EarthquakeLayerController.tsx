"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchEarthquakes } from "./fetcher";

/**
 * Invisible controller component that manages earthquake data fetching.
 * Mount this when the earthquake layer is available.
 */
export default function EarthquakeLayerController() {
  useLayerData("seismic.earthquakes", () => fetchEarthquakes(0), 60_000);
  return null;
}
