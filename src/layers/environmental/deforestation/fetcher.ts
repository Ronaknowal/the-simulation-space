export interface DeforestationImageryConfig {
  layerName: string;
  wmtsUrl: string;
  format: string;
  tileMatrixSetID: string;
}

/**
 * Returns configuration for a NASA GIBS WMTS vegetation index imagery layer.
 * Uses MODIS Terra NDVI 8-Day composite, showing vegetation density in a
 * green palette — areas with deforestation appear as lower NDVI values.
 */
export async function getDeforestationImageryConfig(): Promise<DeforestationImageryConfig> {
  return {
    layerName: "MODIS_Terra_NDVI_8Day",
    wmtsUrl:
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
    format: "image/png",
    tileMatrixSetID: "GoogleMapsCompatible_Level9",
  };
}
