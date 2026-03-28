import { ScatterplotLayer } from "@deck.gl/layers";
import type { FishingHotspot } from "./fetcher";

/**
 * Maps fishing hours to an alpha value for intensity visualization.
 * More hours = more opaque.
 */
function hoursToAlpha(hours: number): number {
  return Math.min(255, Math.round(80 + (hours / 24) * 175));
}

/**
 * Maps fishing hours to radius.
 * Higher activity areas get larger circles.
 */
function hoursToRadius(hours: number): number {
  return Math.max(2000, Math.min(50000, hours * 500));
}

export function createFishingActivityLayer(
  data: FishingHotspot[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<FishingHotspot>({
    id: "maritime-fishing-activity",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusMinPixels: 2,
    radiusMaxPixels: 10,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => hoursToRadius(d.hours),
    getFillColor: (d) => [16, 185, 129, hoursToAlpha(d.hours)], // Green to yellow based on intensity
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
