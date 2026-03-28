import type { Sentinel2Config } from "./fetcher";

export interface CesiumSentinel2Config {
  url: string;
  layer: string;
  style: string;
  format: string;
  tileMatrixSetID: string;
  maximumLevel: number;
  credit: string;
}

/**
 * Creates a CesiumJS imagery provider configuration for the
 * EOX Sentinel-2 cloudless mosaic WMTS layer.
 */
export function createSentinel2ImageryProvider(
  config: Sentinel2Config
): CesiumSentinel2Config {
  return {
    url: config.url,
    layer: config.layer,
    style: "",
    format: config.format,
    tileMatrixSetID: config.tileMatrixSetID,
    maximumLevel: config.maximumLevel,
    credit: `Sentinel-2 cloudless — s2maps.eu by EOX (${config.year})`,
  };
}
