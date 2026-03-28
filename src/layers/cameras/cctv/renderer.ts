import { ScatterplotLayer } from "@deck.gl/layers";
import type { CCTVCamera } from "./fetcher";

export function createCCTVLayer(
  data: CCTVCamera[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<CCTVCamera>({
    id: "cameras-cctv",
    data,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: (d) =>
      d.status === "online"
        ? [16, 185, 129, 220] // Green — online
        : [239, 68, 68, 180], // Red — offline
    getLineColor: [255, 255, 255, 160],
    lineWidthMinPixels: 1,
    getRadius: 8000,
    radiusMinPixels: 3,
    radiusMaxPixels: 10,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
