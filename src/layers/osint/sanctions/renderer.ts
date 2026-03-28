import { ScatterplotLayer } from "@deck.gl/layers";
import type { SanctionedCountry } from "./fetcher";

export function createSanctionsLayer(
  data: SanctionedCountry[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<SanctionedCountry>({
    id: "osint-sanctions",
    data,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: [239, 68, 68, 150],
    getLineColor: [255, 0, 0, 200],
    getRadius: (d) => Math.sqrt(d.sanctionCount) * 5000,
    radiusMinPixels: 5,
    radiusMaxPixels: 25,
    lineWidthMinPixels: 1,
    updateTriggers: {
      getRadius: [filters],
    },
  });
}
