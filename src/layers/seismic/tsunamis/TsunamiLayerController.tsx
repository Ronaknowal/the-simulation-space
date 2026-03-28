"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchTsunamis } from "./fetcher";

/**
 * Invisible controller component that manages tsunami data fetching.
 * Mount this when the tsunami layer is available.
 */
export default function TsunamiLayerController() {
  useLayerData("seismic.tsunamis", fetchTsunamis, 300_000);
  return null;
}
