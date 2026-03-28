"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchWebcams } from "./fetcher";

export default function WebcamsController() {
  useLayerData("cameras.webcams", fetchWebcams);
  return null;
}
