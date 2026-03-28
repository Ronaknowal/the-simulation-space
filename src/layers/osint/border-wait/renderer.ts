import { ScatterplotLayer } from "@deck.gl/layers";
import type { BorderCrossing } from "./fetcher";

/**
 * Maps wait time (minutes) to color.
 * Green (<15min) -> Yellow (15-45min) -> Orange (45-90min) -> Red (>90min)
 */
function waitTimeToColor(minutes: number): [number, number, number, number] {
  if (minutes < 15) return [16, 185, 129, 200]; // Green — short wait
  if (minutes < 45) return [250, 204, 21, 200]; // Yellow — moderate
  if (minutes < 90) return [249, 115, 22, 200]; // Orange — long
  return [239, 68, 68, 220]; // Red — very long
}

export function createBorderWaitLayer(
  data: BorderCrossing[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<BorderCrossing>({
    id: "osint-border-wait",
    data,
    pickable: true,
    opacity,
    filled: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: (d) => waitTimeToColor(d.waitTime),
    getRadius: 10000,
    radiusMinPixels: 4,
    radiusMaxPixels: 15,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
