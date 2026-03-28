import { ScatterplotLayer } from "@deck.gl/layers";
import type { PowerPlant } from "./fetcher";

/**
 * Maps fuel type string to RGBA color.
 */
function fuelToColor(fuel: string): [number, number, number, number] {
  switch (fuel.toLowerCase()) {
    case "coal":
      return [100, 100, 100, 200];
    case "gas":
    case "natural gas":
      return [249, 115, 22, 180];
    case "oil":
    case "petcoke":
      return [120, 80, 40, 180];
    case "nuclear":
      return [168, 85, 247, 200];
    case "hydro":
    case "hydroelectric":
      return [56, 189, 248, 180];
    case "wind":
      return [16, 185, 129, 180];
    case "solar":
      return [250, 204, 21, 180];
    default:
      // Biomass, Geothermal, Waste, Other
      return [148, 163, 184, 160];
  }
}

export function createPowerPlantsLayer(
  data: PowerPlant[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<PowerPlant>({
    id: "infrastructure-power-plants",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 15,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => Math.sqrt(d.capacity) * 500,
    getFillColor: (d) => fuelToColor(d.primaryFuel),
    updateTriggers: {
      getFillColor: [filters],
      getRadius: [filters],
    },
  });
}

export { fuelToColor };
