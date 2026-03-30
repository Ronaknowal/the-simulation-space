"use client";

import { useEffect } from "react";
import { useStore } from "@/store";
import { LAYER_REGISTRY } from "@/layers/registry";

/**
 * Background data layers that feed PULSE dashboard panels.
 * These are NOT visual globe layers — they fetch market/news/social/health data
 * that the PULSE panels read from the store. Auto-enabled on startup.
 */
const PULSE_DATA_LAYERS = new Set([
  // Markets — feed Risk Gauges + Market Pulse + Market Ticker
  "markets.yahoo-finance",
  "markets.fred",
  "markets.bls",
  "markets.eia",
  "markets.treasury",
  "markets.gscpi",
  "markets.usaspending",
  // News — feeds News panel + alert engine
  "news.rss-feeds",
  // Social — feeds News panel + Social sidebar + alert engine
  "social.reddit",
  "social.bluesky",
  "social.telegram",
  // Health — feeds Events panel + alert engine
  "health.who-alerts",
  "health.reliefweb",
  // Signals — feed alert engine
  "signals.kiwisdr",
  "signals.patents",
]);

/**
 * Registers all layers in the store.
 * - PULSE data layers: auto-enabled (they feed dashboard panels, not visible on globe)
 * - Globe layers: disabled by default (user enables manually via LAYERS panel)
 */
export function useDataBootstrap() {
  const initLayer = useStore((s) => s.initLayer);

  useEffect(() => {
    for (const layer of LAYER_REGISTRY) {
      const autoEnable = PULSE_DATA_LAYERS.has(layer.id);
      initLayer(layer.id, autoEnable);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
