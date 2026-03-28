import { ScatterplotLayer } from "@deck.gl/layers";
import type { AuroraData } from "./fetcher";

/**
 * Maps aurora probability (0-100) to a green glow color.
 * Dim green at low probability, bright vivid green at high probability.
 */
function probabilityToColor(
  probability: number
): [number, number, number, number] {
  const t = probability / 100;
  const r = 0;
  const g = 255;
  const b = Math.round(100 + t * 50); // 100 -> 150
  const a = Math.round(50 + t * 180); // 50 -> 230
  return [r, g, b, a];
}

export function createAuroraLayer(
  data: AuroraData[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  const minProbability = filters.minProbability ?? 5;

  const filtered = data.filter((d) => d.probability >= minProbability);

  return new ScatterplotLayer<AuroraData>({
    id: "space-weather-aurora",
    data: filtered,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 20,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 80000,
    getFillColor: (d) => probabilityToColor(d.probability),
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
