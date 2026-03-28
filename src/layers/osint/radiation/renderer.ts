import { ScatterplotLayer } from "@deck.gl/layers";
import type { RadiationSensor } from "./fetcher";

/**
 * Maps radiation level (microSv/h) to color.
 * Normal (<0.3) = green, Elevated (0.3-1) = yellow,
 * High (1-5) = orange, Dangerous (>5) = red
 */
function radiationToColor(usvh: number): [number, number, number, number] {
  if (usvh < 0.3) return [16, 185, 129, 150]; // Green — normal background
  if (usvh < 1) return [250, 204, 21, 180]; // Yellow — elevated
  if (usvh < 5) return [249, 115, 22, 200]; // Orange — high
  return [239, 68, 68, 230]; // Red — dangerous
}

export function createRadiationLayer(
  data: RadiationSensor[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<RadiationSensor>({
    id: "osint-radiation",
    data,
    pickable: true,
    opacity,
    filled: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: (d) => radiationToColor(d.value),
    getRadius: 15000,
    radiusMinPixels: 2,
    radiusMaxPixels: 10,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
