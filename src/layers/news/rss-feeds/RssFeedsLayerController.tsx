"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchRssFeeds } from "./fetcher";

export default function RssFeedsLayerController() {
  useLayerData("news.rss-feeds", fetchRssFeeds, 600_000, true); // 10min; auto-start for news alerts
  return null;
}
