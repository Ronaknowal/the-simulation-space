export interface NightlightsConfig {
  url: string;
  layer: string;
  style: string;
  tileMatrixSetID: string;
  format: string;
  time: string;
  maximumLevel: number;
  /** Human-readable product name for UI display */
  productName: string;
  /** Native resolution string */
  resolution: string;
  /** Product description for metadata display */
  description: string;
}

const GIBS_WMTS_BASE =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi";

/**
 * Returns GIBS WMTS configuration for the VIIRS Day/Night Band layer.
 * Product: VIIRS_SNPP_DayNightBand_At_Sensor_Radiance
 * (ENCC product was discontinued — At_Sensor_Radiance is the active replacement)
 * Defaults to yesterday's imagery (latest typically available).
 */
export function getNightlightsConfig(date?: string): NightlightsConfig {
  const effectiveDate =
    date ??
    new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  return {
    url: GIBS_WMTS_BASE,
    layer: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance",
    style: "",
    tileMatrixSetID: "GoogleMapsCompatible_Level8",
    format: "image/png",
    time: effectiveDate,
    maximumLevel: 8,
    productName: "VIIRS Day/Night Band",
    resolution: "500m",
    description: "Nighttime at-sensor radiance imagery from Suomi NPP/VIIRS",
  };
}

/**
 * Async wrapper for useLayerData compatibility.
 * Returns the nightlights WMTS configuration.
 */
export async function fetchNightlightsConfig(): Promise<NightlightsConfig> {
  return getNightlightsConfig();
}
