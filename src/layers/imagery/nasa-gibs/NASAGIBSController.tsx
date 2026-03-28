"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import { getGIBSImageryConfig } from "./fetcher";

const DEFAULT_PRODUCT = "MODIS_Terra_CorrectedReflectance_TrueColor";

/**
 * Yesterday's date in YYYY-MM-DD (GIBS imagery is typically 1 day behind).
 */
function yesterdayISO(): string {
  return new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
}

/**
 * Controller that keeps NASA GIBS imagery config in sync with store filters.
 *
 * Reacts to filter changes (productId, date) and regenerates the config
 * so that useCesiumLayers can detect the fingerprint change and swap providers.
 */
export default function NASAGIBSController() {
  const enabled = useStore((s) => s.layers["imagery.nasa-gibs"]?.enabled ?? false);
  const filterProductId = useStore((s) => (s.layers["imagery.nasa-gibs"]?.filters?.productId as string) || DEFAULT_PRODUCT);
  const filterDate = useStore((s) => (s.layers["imagery.nasa-gibs"]?.filters?.date as string) || yesterdayISO());
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);
  const initializedRef = useRef(false);

  // Initialize layer on mount
  useEffect(() => {
    initLayer("imagery.nasa-gibs");
  }, [initLayer]);

  // Fetch config whenever enabled state or filters change
  useEffect(() => {
    if (!enabled) return;

    setLayerLoading("imagery.nasa-gibs", true);

    try {
      const config = getGIBSImageryConfig(filterProductId, filterDate);
      if (!config) {
        setLayerError("imagery.nasa-gibs", `Product not found: ${filterProductId}`);
        return;
      }
      setLayerData("imagery.nasa-gibs", config);
    } catch (err) {
      setLayerError("imagery.nasa-gibs", (err as Error).message);
    }

    initializedRef.current = true;
  }, [enabled, filterProductId, filterDate, setLayerData, setLayerLoading, setLayerError]);

  return null;
}
