"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchDarkVessels } from "./fetcher";

export default function DarkVesselsController() {
  useLayerData("maritime.dark-vessels", fetchDarkVessels, 60_000);
  return null;
}
