"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { getSeaIceImageryConfig } from "./fetcher";

/**
 * Invisible controller component that manages sea ice imagery config fetching.
 * Mount this when the sea ice layer is available.
 */
export default function SeaIceController() {
  useLayerData("environmental.sea-ice", getSeaIceImageryConfig);
  return null;
}
