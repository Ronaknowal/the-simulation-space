"use client";
import { useLayerData } from "@/hooks/useLayerData";
import { fetchWhoAlerts } from "./fetcher";

export default function WhoAlertsLayerController() {
  useLayerData("health.who-alerts", fetchWhoAlerts, 3_600_000, true); // auto-start for alert panel
  return null;
}
