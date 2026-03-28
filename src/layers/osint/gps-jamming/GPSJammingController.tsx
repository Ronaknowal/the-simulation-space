"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchGPSInterference } from "./fetcher";

export default function GPSJammingController() {
  useLayerData("osint.gps-jamming", fetchGPSInterference, 86_400_000);
  return null;
}
