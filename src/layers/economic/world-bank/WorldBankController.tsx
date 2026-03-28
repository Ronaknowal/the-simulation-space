"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchWorldBankIndicators } from "./fetcher";

export default function WorldBankController() {
  useLayerData("economic.world-bank", fetchWorldBankIndicators);
  return null;
}
