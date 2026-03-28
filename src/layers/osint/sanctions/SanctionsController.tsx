"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchSanctions } from "./fetcher";

export default function SanctionsController() {
  useLayerData("osint.sanctions", fetchSanctions);
  return null;
}
