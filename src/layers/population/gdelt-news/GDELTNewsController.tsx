"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchGDELTNews } from "./fetcher";

/**
 * Invisible controller component that manages GDELT news event data fetching.
 * Refreshes every 15 minutes to match GDELT update frequency.
 */
export default function GDELTNewsController() {
  useLayerData("population.gdelt-news", fetchGDELTNews, 900_000);
  return null;
}
