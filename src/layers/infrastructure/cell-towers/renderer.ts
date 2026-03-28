import { ScatterplotLayer } from "@deck.gl/layers";
import type { CellTower } from "./fetcher";

/**
 * Maps radio access technology to RGBA color.
 */
function radioToColor(radio: CellTower["radio"]): [number, number, number, number] {
  switch (radio) {
    case "NR":
      return [168, 85, 247, 220];
    case "LTE":
      return [59, 130, 246, 200];
    case "UMTS":
      return [100, 200, 255, 170];
    case "GSM":
    default:
      return [200, 200, 200, 150];
  }
}

export function createCellTowersLayer(
  data: CellTower[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<CellTower>({
    id: "infrastructure-cell-towers",
    data,
    pickable: true,
    opacity,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 1,
    radiusMaxPixels: 4,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 2000,
    getFillColor: (d) => radioToColor(d.radio),
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
