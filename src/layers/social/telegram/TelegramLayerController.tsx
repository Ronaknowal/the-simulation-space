"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchTelegramData } from "./fetcher";

export default function TelegramLayerController() {
  useLayerData("social.telegram", fetchTelegramData, 600_000, true); // 10min; auto-start for alert panel
  return null;
}
