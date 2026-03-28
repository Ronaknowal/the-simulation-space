"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchRadiationData } from "./fetcher";

export default function RadiationController() {
  useLayerData("osint.radiation", fetchRadiationData, 3_600_000);
  return null;
}
