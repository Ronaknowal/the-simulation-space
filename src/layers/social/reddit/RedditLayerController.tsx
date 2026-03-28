"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchRedditData } from "./fetcher";

export default function RedditLayerController() {
  useLayerData("social.reddit", fetchRedditData, 900_000, true); // 15min; auto-start
  return null;
}
