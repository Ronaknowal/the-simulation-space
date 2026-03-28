"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { getDeforestationImageryConfig } from "./fetcher";

/**
 * Invisible controller component that manages deforestation imagery config fetching.
 * Mount this when the deforestation layer is available.
 */
export default function DeforestationController() {
  useLayerData("environmental.deforestation", getDeforestationImageryConfig);
  return null;
}
