"use client";

import { useEffect } from "react";
import { useStore } from "@/store";
import { getNightlightsConfig } from "./fetcher";

/**
 * Yesterday's date in YYYY-MM-DD.
 */
function yesterdayISO(): string {
  return new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
}

/**
 * Controller that keeps VIIRS Nightlights config in sync with store filters.
 *
 * Reacts to date filter changes and regenerates the config so that
 * useCesiumLayers can detect the fingerprint change and swap providers.
 */
export default function NightlightsController() {
  const enabled = useStore((s) => s.layers["imagery.nightlights"]?.enabled ?? false);
  const filterDate = useStore((s) => (s.layers["imagery.nightlights"]?.filters?.date as string) || yesterdayISO());
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);

  useEffect(() => {
    initLayer("imagery.nightlights");
  }, [initLayer]);

  useEffect(() => {
    if (!enabled) return;

    setLayerLoading("imagery.nightlights", true);
    try {
      const config = getNightlightsConfig(filterDate);
      setLayerData("imagery.nightlights", config);
    } catch (err) {
      setLayerError("imagery.nightlights", (err as Error).message);
    }
  }, [enabled, filterDate, setLayerData, setLayerLoading, setLayerError]);

  return null;
}
