import { ScatterplotLayer } from "@deck.gl/layers";
import type { LightningStrike } from "./fetcher";

/**
 * Computes alpha based on how recent the strike is.
 * Recent strikes are bright, older ones fade out over 5 minutes.
 */
function strikeAlpha(time: number, now: number): number {
  const ageMs = now - time;
  const maxAge = 5 * 60 * 1000; // 5 minutes
  if (ageMs <= 0) return 220;
  if (ageMs >= maxAge) return 30;
  return Math.round(220 - (ageMs / maxAge) * 190);
}

export function createLightningLayer(
  data: LightningStrike[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  const now = Date.now();

  return new ScatterplotLayer<LightningStrike>({
    id: "weather-lightning",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusMinPixels: 2,
    radiusMaxPixels: 8,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 8000,
    getFillColor: (d) => [255, 255, 100, strikeAlpha(d.time, now)],
    updateTriggers: {
      getFillColor: [now, filters],
    },
  });
}
