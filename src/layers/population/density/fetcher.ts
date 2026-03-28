/**
 * Population density imagery layer configuration.
 *
 * Uses NASA GIBS (Global Imagery Browse Services) SEDAC population density tiles.
 * Could also use WorldPop raster tiles served via CesiumJS or
 * GPW (Gridded Population of the World) from SEDAC.
 *
 * This is a placeholder that returns a WMTS config object for CesiumJS
 * imagery provider integration.
 */

export interface PopulationDensityConfig {
  type: "wmts";
  url: string;
  layer: string;
  style: string;
  tileMatrixSetID: string;
  format: string;
  attribution: string;
}

/**
 * Returns WMTS configuration for NASA GIBS population density imagery.
 * This can be passed to a CesiumJS WebMapTileServiceImageryProvider.
 */
export function getPopulationDensityConfig(): PopulationDensityConfig {
  return {
    type: "wmts",
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
    layer: "GPW_Population_Density_2020",
    style: "default",
    tileMatrixSetID: "GoogleMapsCompatible_Level7",
    format: "image/png",
    attribution: "NASA GIBS / SEDAC GPW v4",
  };
}

/**
 * Placeholder fetch function for the useLayerData hook.
 * Returns the WMTS config object that the renderer will use.
 */
export async function fetchPopulationDensity(): Promise<PopulationDensityConfig> {
  return getPopulationDensityConfig();
}
