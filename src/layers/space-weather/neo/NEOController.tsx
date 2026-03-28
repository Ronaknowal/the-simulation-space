"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchNearEarthObjects } from "./fetcher";

/**
 * Invisible controller component that manages Near-Earth Object data fetching.
 * Refreshes daily — NEO close approach data changes infrequently.
 */
export default function NEOController() {
  useLayerData("space-weather.neo", fetchNearEarthObjects, 86_400_000);
  return null;
}
