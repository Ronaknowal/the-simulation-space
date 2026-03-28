"use client";

import { useEffect } from "react";
import { useStore } from "@/store";
import { fetchSentinel2Config } from "./fetcher";

/**
 * Controller that keeps Sentinel-2 config in sync with store filters.
 *
 * Reacts to year filter changes and regenerates the config so that
 * useCesiumLayers can detect the fingerprint change and swap providers.
 */
export default function Sentinel2Controller() {
  const enabled = useStore((s) => s.layers["imagery.sentinel2"]?.enabled ?? false);
  const filterYear = useStore((s) => (s.layers["imagery.sentinel2"]?.filters?.year as number) || 2024);
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);

  useEffect(() => {
    initLayer("imagery.sentinel2");
  }, [initLayer]);

  useEffect(() => {
    if (!enabled) return;

    setLayerLoading("imagery.sentinel2", true);
    fetchSentinel2Config(filterYear)
      .then((config) => {
        setLayerData("imagery.sentinel2", config);
      })
      .catch((err) => {
        setLayerError("imagery.sentinel2", (err as Error).message);
      });
  }, [enabled, filterYear, setLayerData, setLayerLoading, setLayerError]);

  return null;
}
