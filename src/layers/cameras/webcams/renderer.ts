import { ScatterplotLayer } from "@deck.gl/layers";
import type { Webcam } from "./fetcher";

export function createWebcamsLayer(
  data: Webcam[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<Webcam>({
    id: "cameras-webcams",
    data,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: (d) =>
      d.status === "active"
        ? [59, 130, 246, 220] // Blue — active
        : [59, 130, 246, 80], // Dim blue — inactive
    getLineColor: [255, 255, 255, 140],
    lineWidthMinPixels: 1,
    getRadius: 6000,
    radiusMinPixels: 3,
    radiusMaxPixels: 10,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
