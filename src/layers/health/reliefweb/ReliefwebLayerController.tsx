"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchReliefwebData } from "./fetcher";

export default function ReliefwebLayerController() {
  useLayerData("health.reliefweb", fetchReliefwebData, 3_600_000, true); // auto-start for alert panel
  return null;
}
