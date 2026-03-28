import { GeoJsonLayer } from "@deck.gl/layers";

export function createRailwaysLayer(
  data: any,
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new GeoJsonLayer({
    id: "infrastructure-railways",
    data,
    pickable: true,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 1,
    getLineColor: [148, 163, 184, Math.round(opacity * 180)],
    getLineWidth: 2,
    opacity,
  });
}
