export interface GIBSProduct {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string | "present";
  resolution: string;
  format: "image/png" | "image/jpeg";
  /** Short TileMatrixSet name for GIBS RESTful URLs (e.g. "250m", "500m") */
  tileMatrixSet: string;
}

/**
 * Curated catalog of NASA GIBS imagery products.
 * These are publicly available via WMTS without authentication.
 *
 * TileMatrixSet uses the EPSG:3857 GoogleMapsCompatible tile matrix set IDs
 * (e.g. "GoogleMapsCompatible_Level9") which use the standard power-of-2 tile
 * grid that CesiumJS's WebMercatorTilingScheme expects natively.
 *
 * Products verified working as of March 2026.
 */
export const GIBS_PRODUCTS: GIBSProduct[] = [
  {
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    name: "MODIS Terra True Color",
    description: "True color corrected reflectance from Terra/MODIS",
    startDate: "2000-02-24",
    endDate: "present",
    resolution: "250m",
    format: "image/jpeg",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
  },
  {
    id: "MODIS_Aqua_CorrectedReflectance_TrueColor",
    name: "MODIS Aqua True Color",
    description: "True color corrected reflectance from Aqua/MODIS",
    startDate: "2002-07-04",
    endDate: "present",
    resolution: "250m",
    format: "image/jpeg",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
  },
  {
    id: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    name: "VIIRS SNPP True Color",
    description: "True color corrected reflectance from Suomi NPP/VIIRS",
    startDate: "2015-11-24",
    endDate: "present",
    resolution: "250m",
    format: "image/jpeg",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
  },
  {
    id: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    name: "VIIRS NOAA-20 True Color",
    description: "True color corrected reflectance from NOAA-20/VIIRS",
    startDate: "2018-01-01",
    endDate: "present",
    resolution: "250m",
    format: "image/jpeg",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
  },
  {
    id: "MODIS_Terra_Cloud_Top_Temp_Day",
    name: "Cloud Top Temperature (Day)",
    description: "Daytime cloud top temperature from Terra/MODIS",
    startDate: "2000-02-24",
    endDate: "present",
    resolution: "2km",
    format: "image/png",
    tileMatrixSet: "GoogleMapsCompatible_Level6",
  },
  {
    id: "MODIS_Terra_Land_Surface_Temp_Day",
    name: "Land Surface Temperature (Day)",
    description: "Daytime land surface temperature from Terra/MODIS",
    startDate: "2000-02-24",
    endDate: "present",
    resolution: "1km",
    format: "image/png",
    tileMatrixSet: "GoogleMapsCompatible_Level7",
  },
  {
    id: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance",
    name: "VIIRS Day/Night Band",
    description: "Nighttime at-sensor radiance imagery from Suomi NPP",
    startDate: "2016-01-01",
    endDate: "present",
    resolution: "500m",
    format: "image/png",
    tileMatrixSet: "GoogleMapsCompatible_Level8",
  },
];

/**
 * Maximum zoom levels for each GIBS EPSG:3857 tile matrix set.
 */
const MAX_LEVEL_MAP: Record<string, number> = {
  "GoogleMapsCompatible_Level9": 9,
  "GoogleMapsCompatible_Level8": 8,
  "GoogleMapsCompatible_Level7": 7,
  "GoogleMapsCompatible_Level6": 6,
};

export interface GIBSImageryConfig {
  url: string;
  layer: string;
  style: string;
  tileMatrixSetID: string;
  format: string;
  time: string;
  maximumLevel: number;
  /** Human-readable product name for UI display */
  productName: string;
  /** Product ID for programmatic reference */
  productId: string;
  /** Native resolution string (e.g., "250m", "500m") */
  resolution: string;
  /** Product description for metadata display */
  description: string;
}

/**
 * Returns CesiumJS WMTS configuration for a specific GIBS product and date.
 * If no date is specified, defaults to yesterday (latest available imagery).
 */
export function getGIBSImageryConfig(
  productId: string,
  date?: string
): GIBSImageryConfig | null {
  const product = GIBS_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;

  // Default to yesterday — GIBS imagery is typically available with a 1-day delay
  const effectiveDate =
    date ??
    new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  return {
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
    layer: product.id,
    style: "",
    tileMatrixSetID: product.tileMatrixSet,
    format: product.format,
    time: effectiveDate,
    maximumLevel: MAX_LEVEL_MAP[product.tileMatrixSet] ?? 6,
    productName: product.name,
    productId: product.id,
    resolution: product.resolution,
    description: product.description,
  };
}

/**
 * Fetches the product catalog. Returns the static GIBS_PRODUCTS array.
 * Used by the controller to populate the layer store.
 */
export async function fetchGIBSProducts(): Promise<GIBSProduct[]> {
  return GIBS_PRODUCTS;
}
