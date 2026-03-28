import { ScatterplotLayer } from "@deck.gl/layers";
import type { WikiPOI } from "./fetcher";

export function createWikipediaLayer(
  data: WikiPOI[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<WikiPOI>({
    id: "population-wikipedia",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 3000,
    getFillColor: [59, 130, 246, 180],
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
