"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchBorderWaitTimes } from "./fetcher";

export default function BorderWaitController() {
  useLayerData("osint.border-wait", fetchBorderWaitTimes, 300_000);
  return null;
}
