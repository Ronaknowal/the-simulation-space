import { GeoJsonLayer } from "@deck.gl/layers";

export function createTectonicPlatesLayer(data: any, opacity: number = 0.6) {
  return new GeoJsonLayer({
    id: "seismic-tectonic-plates",
    data,
    pickable: true,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 3,
    getLineColor: [249, 115, 22, Math.round(opacity * 200)], // Orange
    getLineWidth: 2,
    opacity,
  });
}
