import { ScatterplotLayer } from "@deck.gl/layers";
import type { SatelliteData } from "./fetcher";

function orbitTypeToColor(
  orbitType: SatelliteData["orbitType"]
): [number, number, number, number] {
  switch (orbitType) {
    case "LEO":
      return [96, 165, 250, 180]; // Blue
    case "MEO":
      return [52, 211, 153, 180]; // Green
    case "GEO":
      return [250, 204, 21, 200]; // Yellow
    case "HEO":
      return [244, 63, 94, 180]; // Red
    default:
      return [148, 163, 184, 120]; // Gray
  }
}

export function createSatelliteLayer(
  data: SatelliteData[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  const orbitFilter = filters.orbitType as string[] | undefined;

  const filtered = orbitFilter
    ? data.filter((s) => orbitFilter.includes(s.orbitType))
    : data;

  return new ScatterplotLayer<SatelliteData>({
    id: "satellites-active",
    data: filtered,
    pickable: true,
    opacity,
    filled: true,
    radiusMinPixels: 4,
    radiusMaxPixels: 15,
    getPosition: (d) => [d.longitude, d.latitude, d.altitude * 1000], // km to meters
    getRadius: 50000,
    getFillColor: (d) => orbitTypeToColor(d.orbitType),
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
