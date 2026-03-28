import { GeoJsonLayer } from "@deck.gl/layers";

export function createSubmarineCablesLayer(data: any, opacity: number = 1) {
  return new GeoJsonLayer({
    id: "maritime-submarine-cables",
    data,
    pickable: true,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 4,
    getLineColor: [6, 182, 212, 180], // Cyan/teal — vyom-maritime
    getLineWidth: 2,
    opacity,
  });
}
