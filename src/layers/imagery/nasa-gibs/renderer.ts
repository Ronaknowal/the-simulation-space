import type { GIBSProduct, GIBSImageryConfig } from "./fetcher";
import { getGIBSImageryConfig } from "./fetcher";

export interface CesiumWMTSConfig {
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
 * for a specific GIBS product and date.
 *
 * Usage with CesiumJS:
 *   const config = createGIBSImageryProvider(product, '2024-01-15');
 *   viewer.imageryLayers.addImageryProvider(
 *     new Cesium.WebMapTileServiceImageryProvider(config)
 *   );
 */
export function createGIBSImageryProvider(
  product: GIBSProduct,
  date?: string
): CesiumWMTSConfig | null {
  const config = getGIBSImageryConfig(product.id, date);
  if (!config) return null;

  return {
    url: config.url,
    layer: config.layer,
    style: config.style,
    tileMatrixSetID: config.tileMatrixSetID,
    format: config.format,
    time: config.time,
    maximumLevel: config.maximumLevel,
    credit: "NASA EOSDIS GIBS",
  };
}
