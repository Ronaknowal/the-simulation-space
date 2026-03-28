import { ScatterplotLayer } from "@deck.gl/layers";
import type { WildfireHotspot } from "./fetcher";

/**
 * Maps fire radiative power (FRP) to an RGBA colour.
 * High FRP = red, medium = orange, low = light orange.
 */
function frpToColor(frp: number): [number, number, number, number] {
  if (frp >= 100) return [239, 68, 68, 230]; // Red — intense fire
  if (frp >= 30) return [249, 115, 22, 200]; // Orange — moderate fire
  return [251, 146, 60, 170]; // Light orange — low-intensity
}

/**
 * Maps FRP to a visual radius in meters.
 */
function frpToRadius(frp: number): number {
  return Math.sqrt(Math.max(frp, 1)) * 2000;
}

export function createWildfiresLayer(
  data: WildfireHotspot[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<WildfireHotspot>({
    id: "environmental-wildfires",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 15,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => frpToRadius(d.frp),
    getFillColor: (d) => frpToColor(d.frp),
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
