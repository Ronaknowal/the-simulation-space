import type { PopulationDensityConfig } from "./fetcher";

/**
 * Population density is rendered as a CesiumJS imagery layer (WMTS tiles),
 * not a deck.gl layer. This module exports a helper to create the
 * CesiumJS imagery provider configuration.
 *
 * Usage with CesiumJS:
 *   const config = createPopulationDensityLayerConfig(data);
 *   const provider = new Cesium.WebMapTileServiceImageryProvider(config);
 *   viewer.imageryLayers.addImageryProvider(provider);
 */

export function createPopulationDensityLayerConfig(config: PopulationDensityConfig) {
  return {
    id: "population-density",
    url: config.url,
    layer: config.layer,
    style: config.style,
    tileMatrixSetID: config.tileMatrixSetID,
    format: config.format,
    credit: config.attribution,
  };
}
