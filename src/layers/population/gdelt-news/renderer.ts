import { ScatterplotLayer } from "@deck.gl/layers";
import type { GDELTEvent } from "./fetcher";

/**
 * Maps Goldstein scale (-10 to +10) to RGBA color.
 * Negative = conflict/red, positive = cooperation/green.
 */
function goldsteinToColor(scale: number): [number, number, number, number] {
  if (scale < -5) return [239, 68, 68, 200];    // Red — heavy conflict
  if (scale < 0) return [249, 115, 22, 180];     // Orange — mild conflict
  if (scale < 5) return [250, 204, 21, 170];     // Yellow — neutral/mild positive
  return [16, 185, 129, 180];                     // Green — cooperation
}

export function createGDELTNewsLayer(
  data: GDELTEvent[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<GDELTEvent>({
    id: "population-gdelt-news",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 12,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => Math.max(3000, d.numMentions * 1000),
    getFillColor: (d) => goldsteinToColor(d.goldsteinScale),
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
