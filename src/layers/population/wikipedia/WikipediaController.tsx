"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchGlobalWikipediaPOIs } from "./fetcher";

/**
 * Invisible controller component that manages Wikipedia POI data fetching.
 * Mount this when the Wikipedia layer is available.
 */
export default function WikipediaController() {
  useLayerData("population.wikipedia", fetchGlobalWikipediaPOIs);
  return null;
}
