"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchVolcanoes } from "./fetcher";

/**
 * Invisible controller component that manages volcano data fetching.
 * Mount this when the volcano layer is available.
 */
export default function VolcanoLayerController() {
  useLayerData("seismic.volcanoes", fetchVolcanoes);
  return null;
}
