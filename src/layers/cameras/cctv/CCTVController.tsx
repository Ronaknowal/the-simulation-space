"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchCCTVCameras } from "./fetcher";

export default function CCTVController() {
  useLayerData("cameras.cctv", fetchCCTVCameras);
  return null;
}
