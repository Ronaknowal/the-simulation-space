import { ScatterplotLayer } from "@deck.gl/layers";
import type { ConflictEvent } from "./fetcher";

/**
 * Maps ACLED event type to RGBA color.
 */
function eventTypeToColor(eventType: string): [number, number, number, number] {
  switch (eventType) {
    case "Battles":
      return [239, 68, 68, 220];
    case "Violence against civilians":
      return [220, 38, 38, 220];
    case "Explosions/Remote violence":
      return [249, 115, 22, 200];
    case "Riots":
      return [250, 204, 21, 180];
    case "Protests":
      return [59, 130, 246, 170];
    case "Strategic developments":
    default:
      return [148, 163, 184, 150];
  }
}

export function createConflictsLayer(
  data: ConflictEvent[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<ConflictEvent>({
    id: "population-conflicts",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 3,
    radiusMaxPixels: 20,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => Math.max(5000, Math.sqrt(d.fatalities) * 10000),
    getFillColor: (d) => eventTypeToColor(d.eventType),
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
