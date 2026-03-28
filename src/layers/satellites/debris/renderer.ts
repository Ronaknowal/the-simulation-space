import { ScatterplotLayer } from "@deck.gl/layers";
import type { DebrisData } from "./fetcher";

/**
 * Creates a deck.gl layer for space debris visualization.
 * Small red dots representing tracked debris objects.
 */
export function createSpaceDebrisLayer(
  data: DebrisData[],
  opacity: number = 1,
  _filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<DebrisData>({
    id: "satellites-debris",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 8,
    stroked: true,
    getPosition: (d) => [d.longitude, d.latitude, d.altitude * 1000],
    getRadius: 2000,
    getFillColor: [239, 68, 68, 180], // Red for debris
    getLineColor: [255, 255, 255, 100],
    lineWidthMinPixels: 1,
  });
}
