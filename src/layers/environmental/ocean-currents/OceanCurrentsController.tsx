"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchOceanCurrents } from "./fetcher";

/**
 * Invisible controller component that manages ocean current data fetching.
 * Mount this when the ocean currents layer is available.
 */
export default function OceanCurrentsController() {
  useLayerData("environmental.ocean-currents", fetchOceanCurrents, 86_400_000);
  return null;
}
