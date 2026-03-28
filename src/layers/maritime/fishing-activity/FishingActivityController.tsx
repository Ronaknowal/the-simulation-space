"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchFishingActivity } from "./fetcher";

export default function FishingActivityController() {
  useLayerData("maritime.fishing-activity", fetchFishingActivity, 3_600_000);
  return null;
}
