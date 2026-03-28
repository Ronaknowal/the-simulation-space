import { ScatterplotLayer } from "@deck.gl/layers";
import type { ShipPosition } from "./fetcher";
import { shipTypeToColor } from "./fetcher";

export function createAISShipsLayer(
  data: ShipPosition[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ScatterplotLayer<ShipPosition>({
    id: "maritime-ais-ships",
    data,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 12,
    lineWidthMinPixels: 1,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 5000,
    getFillColor: (d) => shipTypeToColor(d.shipType),
    getLineColor: [255, 255, 255, 60],
    getLineWidth: 1,
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
