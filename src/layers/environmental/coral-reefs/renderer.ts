import { ScatterplotLayer } from "@deck.gl/layers";
import type { CoralReef } from "./fetcher";

/**
 * Maps bleaching risk to an RGBA colour.
 * Low = green, Medium = yellow, High = orange, Critical = red.
 */
function bleachingRiskToColor(
  risk: CoralReef["bleachingRisk"]
): [number, number, number, number] {
  switch (risk) {
    case "low":
      return [16, 185, 129, 180]; // Green
    case "medium":
      return [250, 204, 21, 180]; // Yellow
    case "high":
      return [249, 115, 22, 200]; // Orange
    case "critical":
      return [239, 68, 68, 220]; // Red
    default:
      return [16, 185, 129, 180];
  }
}

export function createCoralReefsLayer(
  data: CoralReef[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<CoralReef>({
    id: "environmental-coral-reefs",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 3,
    radiusMaxPixels: 10,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 20000,
    getFillColor: (d) => bleachingRiskToColor(d.bleachingRisk),
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
