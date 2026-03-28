import { ScatterplotLayer } from "@deck.gl/layers";
import type { EarthquakeFeature } from "./fetcher";

/**
 * Maps earthquake magnitude to a visual radius (in meters on the globe).
 * Exponential scale: M2 = small dot, M5 = visible, M7+ = huge.
 */
function magnitudeToRadius(mag: number): number {
  return Math.pow(2, mag) * 500;
}

/**
 * Maps earthquake depth to RGBA color.
 * Shallow (0-70km) = red, Intermediate (70-300km) = orange, Deep (300+km) = yellow
 */
function depthToColor(depth: number, magnitude: number): [number, number, number, number] {
  const alpha = Math.min(255, 100 + magnitude * 25);

  if (depth < 70) return [239, 68, 68, alpha];    // Red — shallow
  if (depth < 300) return [249, 115, 22, alpha];   // Orange — intermediate
  return [250, 204, 21, alpha];                     // Yellow — deep
}

export function createEarthquakeLayer(
  data: EarthquakeFeature[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  const minMag = filters.minMagnitude ?? 0;
  const maxMag = filters.maxMagnitude ?? 10;

  const filtered = data.filter(
    (eq) => eq.magnitude >= minMag && eq.magnitude <= maxMag
  );

  return new ScatterplotLayer<EarthquakeFeature>({
    id: "seismic-earthquakes",
    data: filtered,
    pickable: true,
    opacity,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 40,
    lineWidthMinPixels: 1,
    getPosition: (d) => [d.longitude, d.latitude, -d.depth * 1000],
    getRadius: (d) => magnitudeToRadius(d.magnitude),
    getFillColor: (d) => depthToColor(d.depth, d.magnitude),
    getLineColor: [255, 255, 255, 80],
    getLineWidth: 1,
    // Animate: pulsing effect for recent earthquakes
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
