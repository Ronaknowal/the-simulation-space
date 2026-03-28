"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchPatentsData } from "./fetcher";

export default function PatentsLayerController() {
  useLayerData("signals.patents", fetchPatentsData, 86_400_000, true); // daily; auto-start for alerts
  return null;
}
