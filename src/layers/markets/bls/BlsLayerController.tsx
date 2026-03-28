"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchBlsData } from "./fetcher";

export default function BlsLayerController() {
  useLayerData("markets.bls", fetchBlsData, 3_600_000, true);
  return null;
}
