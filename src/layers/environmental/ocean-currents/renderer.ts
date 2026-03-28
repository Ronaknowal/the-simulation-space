import { ScatterplotLayer } from "@deck.gl/layers";
import type { OceanCurrentPoint } from "./fetcher";

/**
 * Maps current speed to an RGBA colour with varying intensity.
 * Faster currents are rendered brighter.
 */
function speedToColor(
  speed: number
): [number, number, number, number] {
  const alpha = Math.min(220, 80 + speed * 100);
  return [56, 189, 248, alpha]; // Ocean blue
}

/**
 * Maps current speed to a visual radius in meters.
 */
function speedToRadius(speed: number): number {
  return Math.max(5000, speed * 20000);
}

/**
 * Creates a placeholder ScatterplotLayer for ocean currents.
 * Will be replaced with a particle animation layer when that system is built.
 */
export function createOceanCurrentsLayer(
  data: OceanCurrentPoint[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<OceanCurrentPoint>({
    id: "environmental-ocean-currents",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 8,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => speedToRadius(d.speed),
    getFillColor: (d) => speedToColor(d.speed),
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
