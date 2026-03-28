"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchUsaspendingData } from "./fetcher";

export default function UsaspendingLayerController() {
  useLayerData("markets.usaspending", fetchUsaspendingData, 3_600_000, true);
  return null;
}
