"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchBlueskyData } from "./fetcher";

export default function BlueskyLayerController() {
  useLayerData("social.bluesky", fetchBlueskyData, 300_000, true); // 5min; auto-start
  return null;
}
