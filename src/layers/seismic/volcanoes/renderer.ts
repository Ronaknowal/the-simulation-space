import { ScatterplotLayer } from "@deck.gl/layers";
import type { VolcanoData } from "./fetcher";

/**
 * Maps volcano status to an RGBA colour.
 * Historical eruptions = bright red, Holocene = orange, Pleistocene = yellow.
 */
function statusToColor(
  status: VolcanoData["status"]
): [number, number, number, number] {
  switch (status) {
    case "Historical":
      return [239, 68, 68, 200];
    case "Holocene":
      return [249, 115, 22, 180];
    case "Pleistocene":
      return [250, 204, 21, 150];
    default:
      return [249, 115, 22, 180];
  }
}

export function createVolcanoLayer(
  data: VolcanoData[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<VolcanoData>({
    id: "seismic-volcanoes",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 3,
    radiusMaxPixels: 12,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 8000,
    getFillColor: (d) => statusToColor(d.status),
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
