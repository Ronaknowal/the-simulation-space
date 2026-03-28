"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchPopulationDensity } from "./fetcher";

/**
 * Invisible controller component that manages population density config loading.
 * Mount this when the population density layer is available.
 */
export default function DensityController() {
  useLayerData("population.density", fetchPopulationDensity);
  return null;
}
