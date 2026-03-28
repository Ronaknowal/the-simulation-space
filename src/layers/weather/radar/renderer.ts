import type { RadarConfig } from "./fetcher";

/**
 * Creates a CesiumJS WebMapServiceImageryProvider for NEXRAD radar.
 * This is NOT a deck.gl layer — it integrates with the CesiumJS viewer
 * as an imagery layer overlay.
 *
 * @param viewer - The CesiumJS Viewer instance
 * @param config - Radar WMS configuration from fetcher
 * @returns The created ImageryLayer (so it can be removed later)
 */
export function createRadarImageryProvider(
  viewer: any,
  config: RadarConfig
) {
  // Cesium is loaded globally or from the viewer context
  const Cesium = (window as any).Cesium;
  if (!Cesium) {
    console.warn("CesiumJS not available for radar layer");
    return null;
  }

  const provider = new Cesium.WebMapServiceImageryProvider({
    url: config.wmsUrl,
    layers: config.layerName,
    parameters: {
      transparent: config.transparent,
      format: config.format,
    },
    credit: new Cesium.Credit(config.attribution),
  });

  const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
  imageryLayer.alpha = 0.6;

  return imageryLayer;
}

/**
 * Removes a radar imagery layer from the CesiumJS viewer.
 */
export function removeRadarImageryLayer(viewer: any, imageryLayer: any) {
  if (viewer && imageryLayer) {
    viewer.imageryLayers.remove(imageryLayer);
  }
}
