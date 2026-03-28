"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchWildfires } from "./fetcher";

/**
 * Invisible controller component that manages wildfire data fetching.
 * Mount this when the wildfires layer is available.
 */
export default function WildfiresController() {
  useLayerData("environmental.wildfires", fetchWildfires, 3_600_000);
  return null;
}
