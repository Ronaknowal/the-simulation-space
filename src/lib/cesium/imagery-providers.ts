import * as Cesium from "cesium";

/** NASA GIBS WMTS — free, no auth, full CORS support, 1000+ layers */
export function createGIBSImageryProvider(
  layer: string = "MODIS_Terra_CorrectedReflectance_TrueColor",
  tileMatrixSetID: string = "250m",
  format: string = "image/jpeg",
  date?: string
): Cesium.WebMapTileServiceImageryProvider {
  const time = date || new Date().toISOString().split("T")[0];
  return new Cesium.WebMapTileServiceImageryProvider({
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi`,
    layer,
    style: "default",
    tileMatrixSetID,
    format,
    tileMatrixLabels: [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ],
    tilingScheme: new Cesium.GeographicTilingScheme(),
    maximumLevel: 9,
    credit: new Cesium.Credit("NASA GIBS"),
    times: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: Cesium.JulianDate.fromIso8601(time),
        stop: Cesium.JulianDate.fromIso8601(time),
        data: time,
      }),
    ]),
  });
}

/** VIIRS Corrected Reflectance — higher quality than MODIS */
export function createVIIRSImageryProvider(date?: string) {
  return createGIBSImageryProvider(
    "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    "250m",
    "image/jpeg",
    date
  );
}

/** VIIRS Night Lights (Day/Night Band) */
export function createNightlightsImageryProvider(date?: string) {
  return createGIBSImageryProvider(
    "VIIRS_SNPP_DayNightBand_ENCC",
    "500m",
    "image/png",
    date
  );
}

/** Blue Marble — NASA monthly composite (good default fallback) */
export function createBlueMarbleImageryProvider() {
  return new Cesium.WebMapTileServiceImageryProvider({
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi",
    layer: "BlueMarble_ShadedRelief_Bathymetry",
    style: "default",
    tileMatrixSetID: "500m",
    format: "image/jpeg",
    tileMatrixLabels: ["0", "1", "2", "3", "4", "5", "6", "7", "8"],
    tilingScheme: new Cesium.GeographicTilingScheme(),
    maximumLevel: 8,
    credit: new Cesium.Credit("NASA Blue Marble"),
  });
}

/**
 * ArcGIS World Imagery — Esri's free satellite basemap.
 * High-resolution (up to ~1m in urban areas), zoom level 0-19.
 * Free for non-commercial and development use.
 */
export function createArcGISImageryProvider() {
  return new Cesium.UrlTemplateImageryProvider({
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maximumLevel: 19,
    credit: new Cesium.Credit("Esri, Maxar, Earthstar Geographics"),
  });
}

/**
 * CartoDB Dark Matter — dark-themed basemap for the intel aesthetic.
 * Free, no API key needed, up to zoom 19.
 */
export function createDarkBasemapProvider() {
  return new Cesium.UrlTemplateImageryProvider({
    // Use dark_nolabels to avoid locale-dependent Chinese/Arabic labels
    // Labels will be handled by our own overlay if needed
    url: "https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
    maximumLevel: 19,
    credit: new Cesium.Credit("CartoDB"),
  });
}

/** OpenStreetMap tiles — good for labels and road detail */
export function createOSMImageryProvider() {
  return new Cesium.OpenStreetMapImageryProvider({
    url: "https://tile.openstreetmap.org/",
  });
}

/** GIBS layer catalog — curated list of most useful layers */
export const GIBS_CATALOG = [
  {
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    name: "MODIS True Color",
    tileMatrixSetID: "250m",
    format: "image/jpeg",
  },
  {
    id: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    name: "VIIRS True Color",
    tileMatrixSetID: "250m",
    format: "image/jpeg",
  },
  {
    id: "BlueMarble_ShadedRelief_Bathymetry",
    name: "Blue Marble",
    tileMatrixSetID: "500m",
    format: "image/jpeg",
  },
  {
    id: "VIIRS_SNPP_DayNightBand_ENCC",
    name: "Nightlights (VIIRS DNB)",
    tileMatrixSetID: "500m",
    format: "image/png",
  },
  {
    id: "VIIRS_NOAA20_Thermal_Anomalies_375m_All",
    name: "Thermal Anomalies",
    tileMatrixSetID: "250m",
    format: "image/png",
  },
  {
    id: "MODIS_Terra_Cloud_Top_Temp_Day",
    name: "Cloud Top Temperature",
    tileMatrixSetID: "2km",
    format: "image/png",
  },
  {
    id: "MODIS_Terra_Aerosol",
    name: "Aerosol Optical Depth",
    tileMatrixSetID: "2km",
    format: "image/png",
  },
] as const;
