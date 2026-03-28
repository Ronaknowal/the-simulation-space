import { ScatterplotLayer } from "@deck.gl/layers";
import type { GPSInterference } from "./fetcher";

export function createGPSJammingLayer(
  data: GPSInterference[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<GPSInterference>({
    id: "osint-gps-jamming",
    data,
    pickable: true,
    opacity,
    filled: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: (d) => [239, 68, 68, Math.floor(d.level * 220)],
    getRadius: 100000, // Large areas (~100km)
    radiusMinPixels: 5,
    radiusMaxPixels: 30,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
