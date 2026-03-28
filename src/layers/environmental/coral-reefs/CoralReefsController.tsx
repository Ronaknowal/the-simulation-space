"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchCoralReefs } from "./fetcher";

/**
 * Invisible controller component that manages coral reef data fetching.
 * Mount this when the coral reefs layer is available.
 */
export default function CoralReefsController() {
  useLayerData("environmental.coral-reefs", fetchCoralReefs);
  return null;
}
