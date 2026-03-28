"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store";

/**
 * Hook that fetches data for a layer when it's enabled.
 * Handles polling intervals and cleanup.
 *
 * @param startEnabled - If true, auto-enables the layer on first mount so it
 *   starts fetching immediately (used by dashboard-panel background layers
 *   like market data, health alerts, RSS feeds).
 */
export function useLayerData(
  layerId: string,
  fetchFn: () => Promise<any>,
  refreshInterval?: number,
  startEnabled = false
) {
  const enabled = useStore((s) => s.layers[layerId]?.enabled ?? false);
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initLayer(layerId, startEnabled);
  }, [layerId, initLayer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const doFetch = async () => {
      setLayerLoading(layerId, true);
      try {
        const data = await fetchFn();
        setLayerData(layerId, data);
      } catch (err) {
        setLayerError(layerId, (err as Error).message);
      }
    };

    doFetch();

    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(doFetch, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, layerId, refreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps
}
