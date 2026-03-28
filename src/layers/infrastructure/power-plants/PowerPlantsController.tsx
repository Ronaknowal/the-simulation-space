"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchPowerPlants } from "./fetcher";

/**
 * Invisible controller component that manages power plant data fetching.
 * Mount this when the power plants layer is available.
 */
export default function PowerPlantsController() {
  useLayerData("infrastructure.power-plants", fetchPowerPlants);
  return null;
}
