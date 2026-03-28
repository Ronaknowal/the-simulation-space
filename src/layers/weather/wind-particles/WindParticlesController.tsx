"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchWindData } from "./fetcher";

export default function WindParticlesController() {
  // Refresh every hour — wind data updates slowly
  useLayerData("weather.wind-particles", fetchWindData, 3_600_000);
  return null;
}
