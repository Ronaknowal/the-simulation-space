export interface RadarConfig {
  wmsUrl?: string;
  layerName: string;
  transparent: boolean;
  format: string;
  attribution: string;
  /** If true, use GIBS WMTS instead of WMS */
  isGibs?: boolean;
  tileMatrixSetID?: string;
  time?: string;
  maximumLevel?: number;
}

/**
 * Iowa State Mesonet NEXRAD composite reflectivity WMS (US only).
 */
const MESONET_WMS =
  "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi";
const MESONET_LAYER = "nexrad-n0q-900913";

/**
 * Returns the WMS configuration for NOAA NEXRAD radar imagery (US only).
 */
export function getRadarImageryUrl(): string {
  return MESONET_WMS;
}

/**
 * Yesterday's date for GIBS time parameter.
 */
function recentDate(): string {
  // GIBS IMERG has ~6 hour latency; use yesterday to be safe
  return new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
}

/**
 * Returns radar configuration for CesiumJS.
 * Uses NASA GIBS IMERG (Global Precipitation Measurement) as the primary
 * global precipitation layer, plus NEXRAD as a US-specific detail overlay.
 *
 * IMERG_Precipitation_Rate shows near-real-time global precipitation.
 * It has ~10km resolution and global coverage (60°S to 60°N).
 */
export async function fetchRadarConfig(): Promise<RadarConfig[]> {
  return [
    // Global: NASA GIBS IMERG precipitation rate
    {
      layerName: "IMERG_Precipitation_Rate",
      tileMatrixSetID: "GoogleMapsCompatible_Level6",
      format: "image/png",
      transparent: true,
      attribution: "NASA GIBS — GPM IMERG Precipitation",
      isGibs: true,
      time: recentDate(),
      maximumLevel: 6,
    },
    // US detail: NEXRAD composite reflectivity
    {
      wmsUrl: MESONET_WMS,
      layerName: MESONET_LAYER,
      transparent: true,
      format: "image/png",
      attribution: "Iowa State Mesonet NEXRAD",
      isGibs: false,
    },
  ];
}
