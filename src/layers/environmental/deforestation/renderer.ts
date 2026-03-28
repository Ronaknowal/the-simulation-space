import type { DeforestationImageryConfig } from "./fetcher";

/**
 * Creates configuration parameters for a CesiumJS WebMapTileServiceImageryProvider.
 * This is consumed by the Cesium viewer to render the NDVI vegetation index layer.
 *
 * Usage with CesiumJS:
 *   const config = createDeforestationImageryConfig(data);
 *   const provider = new Cesium.WebMapTileServiceImageryProvider(config);
 */
export function createDeforestationImageryConfig(
  data: DeforestationImageryConfig
) {
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
