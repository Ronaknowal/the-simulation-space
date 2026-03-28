"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchCellTowers } from "./fetcher";

/**
 * Invisible controller component that manages cell tower data fetching.
 * Mount this when the cell towers layer is available.
 */
export default function CellTowersController() {
  useLayerData("infrastructure.cell-towers", fetchCellTowers);
  return null;
}
