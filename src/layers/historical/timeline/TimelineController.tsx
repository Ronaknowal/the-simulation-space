"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchTimelineEvents } from "./fetcher";

export default function TimelineController() {
  // Fetch historical events; refresh daily
  useLayerData("historical.timeline", fetchTimelineEvents, 86_400_000);
  return null;
}
