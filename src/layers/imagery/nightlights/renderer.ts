import type { NightlightsConfig } from "./fetcher";

export interface CesiumNightlightsConfig {
  url: string;
  layer: string;
  style: string;
  tileMatrixSetID: string;
  format: string;
  time: string;
  maximumLevel: number;
  credit: string;
}

/**
 * Creates a CesiumJS WebMapTileServiceImageryProvider configuration
 * for the VIIRS Day/Night Band nightlights layer.
 *
 * Usage with CesiumJS:
 *   const config = createNightlightsImageryProvider(nightlightsConfig);
 *   viewer.imageryLayers.addImageryProvider(
 *     new Cesium.WebMapTileServiceImageryProvider(config)
 *   );
 */
export function createNightlightsImageryProvider(
  config: NightlightsConfig
): CesiumNightlightsConfig {
  return {
    url: config.url,
    layer: config.layer,
    style: config.style,
    tileMatrixSetID: config.tileMatrixSetID,
    format: config.format,
    time: config.time,
    maximumLevel: config.maximumLevel,
    credit: "NASA EOSDIS GIBS — VIIRS Day/Night Band",
  };
}
