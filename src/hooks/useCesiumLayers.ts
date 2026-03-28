"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import * as Cesium from "cesium";
import { useStore } from "@/store";

// ─────────────────────────────────────────────────────────────
// GIBS helpers
// ─────────────────────────────────────────────────────────────

/**
 * Yesterday's date in YYYY-MM-DD format (GIBS imagery typically has 1-day delay).
 */
function yesterdayISO(): string {
  return new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────
// Provider creation
// ─────────────────────────────────────────────────────────────

interface ActiveLayerEntry {
  imageryLayer: Cesium.ImageryLayer;
  /** Additional sub-layers (e.g. radar has both GIBS global + NEXRAD US) */
  extraLayers?: Cesium.ImageryLayer[];
  fingerprint: string;
}

/**
 * Compute a fingerprint for detecting when imagery config has changed.
 */
function computeFingerprint(data: any, filters: Record<string, any>): string {
  return JSON.stringify({ d: data, f: filters });
}

/**
 * Create a GIBS WMTS imagery provider using EPSG:3857 (WebMercator).
 *
 * GIBS provides EPSG:3857 tiles using the standard GoogleMapsCompatible
 * tile matrix set, which uses the exact same power-of-2 tile grid that
 * CesiumJS's WebMercatorTilingScheme expects natively. No custom tiling
 * scheme is needed.
 *
 * Caveat: GIBS returns blank tiles at zoom level 0 (known server issue).
 * We set minimumLevel: 1 to work around this.
 *
 * Reference: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
 */
function createGibsProvider(
  layerName: string,
  time: string,
  tileMatrixSet: string,
  format: string,
  maximumLevel: number,
  creditText: string
): Cesium.WebMapTileServiceImageryProvider {
  // Some GIBS layers (e.g. GPW_Population_Density_2020) have no TIME dimension
  const timeParam = time ? `?TIME=${time}` : "";
  const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi${timeParam}`;
  return new Cesium.WebMapTileServiceImageryProvider({
    url,
    layer: layerName,
    style: "",
    tileMatrixSetID: tileMatrixSet,
    format,
    maximumLevel,
    minimumLevel: 1,
    tileWidth: 256,
    tileHeight: 256,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    credit: new Cesium.Credit(creditText),
  });
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

/**
 * Manages CesiumJS imagery layers (WMTS/WMS overlays) in sync with the store.
 *
 * Features:
 * - Adds/removes imagery providers when layers are toggled
 * - GIBS layers use EPSG:3857 (WebMercator) for proper globe wrapping
 * - Fingerprint-based change detection: recreates providers when data/filters change
 * - Real-time opacity updates without provider recreation
 */
// Stable fingerprint for Cesium imagery layers only
function getCesiumLayerFingerprint(): string {
  const layers = useStore.getState().layers;
  const ids = [
    "weather.radar", "environmental.sea-ice", "environmental.deforestation",
    "imagery.nightlights", "imagery.nasa-gibs", "imagery.sentinel2", "population.density"
  ];
  return ids.map(id => {
    const s = layers[id];
    if (!s) return `${id}:0`;
    return `${id}:${s.enabled ? 1 : 0}:${s.lastUpdated}:${s.opacity}`;
  }).join("|");
}

export function useCesiumLayers(viewer: Cesium.Viewer | null) {
  // Use stable fingerprint to avoid React 19 infinite loop
  useSyncExternalStore(
    useStore.subscribe,
    getCesiumLayerFingerprint,
    getCesiumLayerFingerprint
  );
  const layers = useStore.getState().layers;
  const activeCesiumLayersRef = useRef<Record<string, ActiveLayerEntry>>({});

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const cesiumLayerIds = [
      "weather.radar",
      "environmental.sea-ice",
      "environmental.deforestation",
      "imagery.nightlights",
      "imagery.nasa-gibs",
      "imagery.sentinel2",
      "population.density",
    ];

    for (const layerId of cesiumLayerIds) {
      const layerState = layers[layerId];
      const isEnabled = layerState?.enabled ?? false;
      const hasData = layerState?.data != null;
      const isActive = layerId in activeCesiumLayersRef.current;

      if (isEnabled && hasData && !isActive) {
        addImageryLayer(viewer, layerId, layerState);
      } else if (!isEnabled && isActive) {
        removeImageryLayer(viewer, layerId);
      } else if (isEnabled && isActive && hasData) {
        const entry = activeCesiumLayersRef.current[layerId];
        const newFingerprint = computeFingerprint(
          layerState.data,
          layerState.filters
        );

        if (entry.fingerprint !== newFingerprint) {
          removeImageryLayer(viewer, layerId);
          addImageryLayer(viewer, layerId, layerState);
        } else {
          entry.imageryLayer.alpha = layerState.opacity ?? 0.7;
        }
      }
    }
  }, [viewer, layers]);

  function addImageryLayer(
    viewer: Cesium.Viewer,
    layerId: string,
    layerState: any
  ) {
    try {
      let imageryLayer: Cesium.ImageryLayer | null = null;

      if (layerId === "weather.radar") {
        // ── Radar: array of configs (GIBS WMTS global + WMS US) ──
        const configs = Array.isArray(layerState.data)
          ? layerState.data
          : [layerState.data]; // backward compat with old single config

        // Add all radar sub-layers; track all of them for removal
        const radarSubLayers: Cesium.ImageryLayer[] = [];
        for (let ri = 0; ri < configs.length; ri++) {
          const config = configs[ri];
          let subLayer: Cesium.ImageryLayer;

          if (config.isGibs) {
            // NASA GIBS WMTS (global precipitation)
            const provider = createGibsProvider(
              config.layerName,
              config.time || yesterdayISO(),
              config.tileMatrixSetID || "GoogleMapsCompatible_Level6",
              config.format || "image/png",
              config.maximumLevel || 6,
              config.attribution || "NASA GIBS"
            );
            subLayer = viewer.imageryLayers.addImageryProvider(provider);
          } else {
            // WMS (e.g. NEXRAD)
            const provider = new Cesium.WebMapServiceImageryProvider({
              url: config.wmsUrl,
              layers: config.layerName,
              parameters: {
                transparent: config.transparent,
                format: config.format,
              },
              credit: new Cesium.Credit(config.attribution || ""),
            });
            subLayer = viewer.imageryLayers.addImageryProvider(provider);
          }

          subLayer.alpha = layerState.opacity ?? 0.6;
          radarSubLayers.push(subLayer);
        }

        if (radarSubLayers.length > 0) {
          imageryLayer = radarSubLayers[0];
          // Store extra sub-layers for cleanup
          if (radarSubLayers.length > 1) {
            // We'll attach extras after the main tracking entry is created below
            (imageryLayer as any).__extraRadarLayers = radarSubLayers.slice(1);
          }
        }
      } else if (layerId === "imagery.nightlights") {
        // ── VIIRS Day/Night Band (GIBS WMTS via EPSG:3857) ──
        const d = layerState.data;
        const time = d.time || yesterdayISO();
        const maximumLevel = d.maximumLevel || 8;
        const provider = createGibsProvider(
          d.layer,
          time,
          d.tileMatrixSetID,
          d.format,
          maximumLevel,
          "NASA GIBS — VIIRS Day/Night Band"
        );
        imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
        imageryLayer.alpha = layerState.opacity ?? 0.7;
      } else if (layerId === "imagery.nasa-gibs") {
        // ── NASA GIBS product (GIBS WMTS via EPSG:3857) ──
        const d = layerState.data;
        const time = d.time || yesterdayISO();
        const maximumLevel = d.maximumLevel || 9;
        const provider = createGibsProvider(
          d.layer,
          time,
          d.tileMatrixSetID,
          d.format,
          maximumLevel,
          d.productName
            ? `NASA GIBS — ${d.productName}`
            : "NASA EOSDIS GIBS"
        );
        imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
        imageryLayer.alpha = layerState.opacity ?? 0.7;
      } else if (layerId === "imagery.sentinel2") {
        // ── EOX Sentinel-2 cloudless mosaic (standard tile grid) ──
        const d = layerState.data;
        const maximumLevel = d.maximumLevel || 12;
        const url =
          `https://tiles.maps.eox.at/wmts/1.0.0/` +
          `${d.layer}/default/${d.tileMatrixSetID}/{z}/{y}/{x}.jpg`;
        const provider = new Cesium.UrlTemplateImageryProvider({
          url,
          maximumLevel,
          tilingScheme: new Cesium.GeographicTilingScheme(),
          credit: new Cesium.Credit(
            `Sentinel-2 cloudless — s2maps.eu by EOX (${d.year || 2024})`
          ),
        });
        imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
        imageryLayer.alpha = layerState.opacity ?? 0.7;
      } else if (layerId === "environmental.sea-ice") {
        // ── Sea Ice (GIBS WMTS via EPSG:3857) ──
        const d = layerState.data;
        const time = d.time || yesterdayISO();
        const tileMatrixSet = d.tileMatrixSetID || "GoogleMapsCompatible_Level9";
        const maximumLevel = d.maximumLevel || 9;
        const provider = createGibsProvider(
          d.layerName,
          time,
          tileMatrixSet,
          d.format || "image/png",
          maximumLevel,
          "NASA GIBS — Sea Ice"
        );
        imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
        imageryLayer.alpha = layerState.opacity ?? 0.7;
      } else if (layerId === "environmental.deforestation") {
        // ── Deforestation / NDVI (GIBS WMTS via EPSG:3857) ──
        const d = layerState.data;
        const time = d.time || yesterdayISO();
        const tileMatrixSet = d.tileMatrixSetID || "GoogleMapsCompatible_Level9";
        const maximumLevel = d.maximumLevel || 9;
        const provider = createGibsProvider(
          d.layerName,
          time,
          tileMatrixSet,
          d.format || "image/png",
          maximumLevel,
          "NASA GIBS — Vegetation Index"
        );
        imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
        imageryLayer.alpha = layerState.opacity ?? 0.7;
      } else if (layerId === "population.density") {
        // ── Population Density (GIBS/SEDAC WMTS via EPSG:3857) ──
        // GPW_Population_Density_2020 has NO time dimension — pass empty string
        const d = layerState.data;
        const time = d.time || "";
        const tileMatrixSet = d.tileMatrixSetID || "GoogleMapsCompatible_Level7";
        const maximumLevel = d.maximumLevel || 7;
        const provider = createGibsProvider(
          d.layer,
          time,
          tileMatrixSet,
          d.format || "image/png",
          maximumLevel,
          d.attribution || "NASA GIBS / SEDAC"
        );
        imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
        imageryLayer.alpha = layerState.opacity ?? 0.7;
      }

      if (imageryLayer) {
        const fingerprint = computeFingerprint(
          layerState.data,
          layerState.filters
        );
        const extras = (imageryLayer as any).__extraRadarLayers as Cesium.ImageryLayer[] | undefined;
        delete (imageryLayer as any).__extraRadarLayers;
        activeCesiumLayersRef.current[layerId] = {
          imageryLayer,
          extraLayers: extras,
          fingerprint,
        };
      }
    } catch (err) {
      console.warn(`Failed to add Cesium layer ${layerId}:`, err);
    }
  }

  function removeImageryLayer(viewer: Cesium.Viewer, layerId: string) {
    const entry = activeCesiumLayersRef.current[layerId];
    if (entry) {
      // Remove extra sub-layers first (e.g. radar NEXRAD alongside GIBS)
      if (entry.extraLayers) {
        for (const extra of entry.extraLayers) {
          try { viewer.imageryLayers.remove(extra); } catch { /* ok */ }
        }
      }
      try {
        viewer.imageryLayers.remove(entry.imageryLayer);
      } catch {
        // may already be removed
      }
      delete activeCesiumLayersRef.current[layerId];
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!viewer || viewer.isDestroyed()) return;
      for (const [, entry] of Object.entries(activeCesiumLayersRef.current)) {
        try {
          viewer.imageryLayers.remove(entry.imageryLayer);
        } catch {
          // viewer may already be destroyed
        }
      }
      activeCesiumLayersRef.current = {};
    };
  }, [viewer]);
}
