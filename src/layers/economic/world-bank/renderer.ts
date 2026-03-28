import { ScatterplotLayer } from "@deck.gl/layers";
import type { CountryIndicator } from "./fetcher";

/**
 * Maps GDP per capita to a color.
 * Low (red) -> Mid (orange/yellow/blue) -> High (green)
 */
function gdpPerCapitaToColor(gdppc: number): [number, number, number, number] {
  if (gdppc < 1000) return [239, 68, 68, 200]; // Red — low income
  if (gdppc < 5000) return [249, 115, 22, 180]; // Orange — lower-middle
  if (gdppc < 15000) return [250, 204, 21, 170]; // Yellow — upper-middle
  if (gdppc < 40000) return [59, 130, 246, 180]; // Blue — high income
  return [16, 185, 129, 200]; // Green — very high income
}

/**
 * Fallback color based on raw GDP value when per capita is unavailable.
 */
function gdpToColor(gdp: number): [number, number, number, number] {
  if (gdp < 1e10) return [239, 68, 68, 200];
  if (gdp < 1e11) return [249, 115, 22, 180];
  if (gdp < 5e11) return [250, 204, 21, 170];
  if (gdp < 2e12) return [59, 130, 246, 180];
  return [16, 185, 129, 200];
}

export function createWorldBankLayer(
  data: CountryIndicator[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<CountryIndicator>({
    id: "economic-world-bank",
    data,
    pickable: true,
    opacity,
    filled: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: (d) => {
      if (d.gdpPerCapita !== null) return gdpPerCapitaToColor(d.gdpPerCapita);
      if (d.gdp !== null) return gdpToColor(d.gdp);
      return [128, 128, 128, 100];
    },
    getRadius: (d) => {
      if (d.population !== null) return Math.sqrt(d.population) * 10;
      if (d.gdp !== null) return Math.sqrt(d.gdp / 1e6) * 5;
      return 50000;
    },
    radiusMinPixels: 4,
    radiusMaxPixels: 25,
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}
