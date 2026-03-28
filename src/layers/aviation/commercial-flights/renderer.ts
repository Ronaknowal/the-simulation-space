import { ScatterplotLayer } from "@deck.gl/layers";
import type { AircraftPosition } from "./fetcher";

/**
 * Maps altitude (feet) to color.
 * Ground-level = green, cruising (30k+) = blue, high (40k+) = purple
 */
function altitudeToColor(alt: number): [number, number, number, number] {
  if (alt < 5000) return [34, 197, 94, 220];    // Green — low
  if (alt < 15000) return [59, 130, 246, 220];   // Blue — climbing/descending
  if (alt < 30000) return [99, 102, 241, 220];   // Indigo — mid
  if (alt < 40000) return [139, 92, 246, 220];   // Purple — cruising
  return [217, 70, 239, 220];                     // Pink — high altitude
}

export function createCommercialFlightsLayer(
  data: AircraftPosition[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  const minAlt = filters.minAltitude ?? 0;
  const maxAlt = filters.maxAltitude ?? 100000;

  const filtered = data.filter(
    (a) => a.alt_baro >= minAlt && a.alt_baro <= maxAlt
  );

  return new ScatterplotLayer<AircraftPosition>({
    id: "aviation-commercial-flights",
    data: filtered,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 10,
    lineWidthMinPixels: 1,
    getPosition: (d) => [d.lon, d.lat, d.alt_baro * 0.3048], // feet to meters
    getRadius: 4000,
    getFillColor: (d) => altitudeToColor(d.alt_baro),
    getLineColor: [255, 255, 255, 80],
    getLineWidth: 1,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}

export function createMilitaryFlightsLayer(
  data: AircraftPosition[],
  opacity: number = 1
) {
  return new ScatterplotLayer<AircraftPosition>({
    id: "aviation-military-flights",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 8,
    getPosition: (d) => [d.lon, d.lat, d.alt_baro * 0.3048],
    getRadius: 5000,
    getFillColor: [249, 115, 22, 240], // Orange for military
    getLineColor: [255, 255, 255, 120],
    getLineWidth: 1,
    stroked: true,
    lineWidthMinPixels: 1,
  });
}
