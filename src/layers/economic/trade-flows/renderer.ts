import { ArcLayer } from "@deck.gl/layers";
import type { TradeFlow } from "./fetcher";

export function createTradeFlowsLayer(
  data: TradeFlow[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  return new ArcLayer<TradeFlow>({
    id: "economic-trade-flows",
    data,
    pickable: true,
    opacity,
    getSourcePosition: (d) => [d.reporterLon, d.reporterLat],
    getTargetPosition: (d) => [d.partnerLon, d.partnerLat],
    getSourceColor: [0, 212, 255, 180],
    getTargetColor: [168, 85, 247, 180],
    getWidth: (d) => Math.max(1, Math.log10(d.tradeValue / 1e9 + 1) * 2),
    widthMinPixels: 1,
    widthMaxPixels: 4,
    updateTriggers: {
      getWidth: [filters],
    },
  });
}
