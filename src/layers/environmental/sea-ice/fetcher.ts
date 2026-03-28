export interface SeaIceImageryConfig {
  layerName: string;
  wmtsUrl: string;
  format: string;
  tileMatrixSetID: string;
}

/**
 * Returns configuration for a NASA GIBS WMTS sea ice imagery layer.
 * Uses MODIS Terra Sea Ice extent, available as daily PNG tiles.
 */
export async function getSeaIceImageryConfig(): Promise<SeaIceImageryConfig> {
  return {
    layerName: "MODIS_Terra_Sea_Ice",
    wmtsUrl:
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
    format: "image/png",
    tileMatrixSetID: "GoogleMapsCompatible_Level9",
  };
}
