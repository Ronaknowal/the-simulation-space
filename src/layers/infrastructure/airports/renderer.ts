import { ScatterplotLayer } from "@deck.gl/layers";
import type { Airport } from "./fetcher";

/**
 * Maps airport type to RGBA color.
 * Large = vivid blue, Medium = light blue, Small = faint blue.
 */
function airportTypeToColor(type: Airport["type"]): [number, number, number, number] {
  switch (type) {
    case "large_airport":
      return [59, 130, 246, 220];
    case "medium_airport":
      return [147, 197, 253, 180];
    case "small_airport":
      return [200, 220, 255, 120];
    default:
      return [200, 220, 255, 100];
  }
}

/**
 * Maps airport type to radius in meters.
 */
function airportTypeToRadius(type: Airport["type"]): number {
  switch (type) {
    case "large_airport":
      return 15000;
    case "medium_airport":
      return 8000;
    case "small_airport":
      return 4000;
    default:
      return 3000;
  }
}

export function createAirportsLayer(
  data: Airport[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<Airport>({
    id: "infrastructure-airports",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 10,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => airportTypeToRadius(d.type),
    getFillColor: (d) => airportTypeToColor(d.type),
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
