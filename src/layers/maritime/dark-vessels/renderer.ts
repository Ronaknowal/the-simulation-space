import { ScatterplotLayer } from "@deck.gl/layers";
import type { DarkVessel } from "./fetcher";
import { riskLevelToColor } from "./fetcher";

export function createDarkVesselsLayer(
  data: DarkVessel[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<DarkVessel>({
    id: "maritime-dark-vessels",
    data,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 12,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 10000,
    getFillColor: (d) => riskLevelToColor(d.riskLevel),
    getLineColor: [239, 68, 68, 200], // Red outline
    getLineWidth: 1,
    lineWidthMinPixels: 1,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
