import type { SeaIceImageryConfig } from "./fetcher";

/**
 * Creates configuration parameters for a CesiumJS WebMapTileServiceImageryProvider.
 * This is consumed by the Cesium viewer to render the sea ice imagery layer.
 *
 * Usage with CesiumJS:
 *   const config = createSeaIceImageryConfig(data);
 *   const provider = new Cesium.WebMapTileServiceImageryProvider(config);
 */
export function createSeaIceImageryConfig(data: SeaIceImageryConfig) {
  const today = new Date().toISOString().split("T")[0];

  return {
    url: `${data.wmtsUrl}?TIME=${today}`,
    layer: data.layerName,
    style: "default",
    format: data.format,
    tileMatrixSetID: data.tileMatrixSetID,
    maximumLevel: 8,
    credit: "NASA GIBS",
  };
}
