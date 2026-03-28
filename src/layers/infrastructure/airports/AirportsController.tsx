"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchAirports } from "./fetcher";

/**
 * Invisible controller component that manages airport data fetching.
 * Mount this when the airports layer is available.
 */
export default function AirportsController() {
  useLayerData("infrastructure.airports", fetchAirports);
  return null;
}
