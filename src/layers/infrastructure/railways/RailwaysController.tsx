"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchRailways } from "./fetcher";

/**
 * Invisible controller component that manages railway data fetching.
 * Mount this when the railways layer is available.
 */
export default function RailwaysController() {
  useLayerData("infrastructure.railways", fetchRailways);
  return null;
}
