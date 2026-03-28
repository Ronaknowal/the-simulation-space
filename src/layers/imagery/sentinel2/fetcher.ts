export interface Sentinel2Config {
  url: string;
  layer: string;
  tileMatrixSetID: string;
  format: string;
  maximumLevel: number;
  year: number;
  /** Human-readable product name for UI display */
  productName: string;
  /** Approximate native resolution */
  resolution: string;
  /** Product description for metadata display */
  description: string;
}

/**
 * EOX Sentinel-2 Cloudless Mosaic — free WMTS endpoint, no auth required.
 * https://s2maps.eu — global cloudless composite from Sentinel-2 imagery.
 *
 * Available years: 2016-2024. Uses EPSG:4326 (WGS84) tile matrix set.
 * Attribution: "Sentinel-2 cloudless — https://s2maps.eu by EOX IT Services GmbH"
 */
const EOX_WMTS_URL =
  "https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml";

/**
 * Returns WMTS configuration for the Sentinel-2 cloudless mosaic.
 * Defaults to the latest available year (2024).
 */
export async function fetchSentinel2Config(
  year: number = 2024
): Promise<Sentinel2Config> {
  const layerName = year === 2016 ? "s2cloudless" : `s2cloudless-${year}`;

  return {
    url: EOX_WMTS_URL,
    layer: layerName,
    tileMatrixSetID: "WGS84",
    format: "image/jpeg",
    maximumLevel: 12,
    year,
    productName: "Sentinel-2 Cloudless",
    resolution: "~10m",
    description: `Global cloudless composite from Sentinel-2 imagery (${year})`,
  };
}
