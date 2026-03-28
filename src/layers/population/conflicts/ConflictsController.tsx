"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchConflicts } from "./fetcher";

/**
 * Invisible controller component that manages ACLED conflict data fetching.
 * Refreshes weekly since ACLED data updates are weekly.
 */
export default function ConflictsController() {
  useLayerData("population.conflicts", fetchConflicts, 604_800_000);
  return null;
}
