import { ScatterplotLayer } from "@deck.gl/layers";
import type { TsunamiAlert } from "./fetcher";

/**
 * Maps alert level to a blue RGBA colour with varying intensity.
 */
function alertLevelToColor(
  level: TsunamiAlert["alertLevel"]
): [number, number, number, number] {
  switch (level) {
    case "Warning":
      return [56, 189, 248, 220];
    case "Watch":
      return [56, 189, 248, 180];
    case "Advisory":
      return [56, 189, 248, 140];
    case "Information":
      return [56, 189, 248, 100];
    default:
      return [56, 189, 248, 120];
  }
}

/**
 * Maps magnitude / water height to a visual radius (in meters).
 */
function magnitudeToRadius(magnitude: number): number {
  if (magnitude <= 0) return 20000;
  return Math.pow(2, magnitude) * 3000;
}

export function createTsunamiLayer(
  data: TsunamiAlert[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<TsunamiAlert>({
    id: "seismic-tsunamis",
    data,
    pickable: true,
    opacity,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 4,
    radiusMaxPixels: 30,
    lineWidthMinPixels: 1,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => magnitudeToRadius(d.magnitude),
    getFillColor: (d) => alertLevelToColor(d.alertLevel),
    getLineColor: [255, 255, 255, 120],
    getLineWidth: 1,
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
