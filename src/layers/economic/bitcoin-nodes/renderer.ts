import { ScatterplotLayer } from "@deck.gl/layers";
import type { BitcoinNode } from "./fetcher";

export function createBitcoinNodesLayer(
  data: BitcoinNode[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  console.log(`[Bitcoin Renderer] Creating layer with ${data.length} points, sample:`, data.slice(0, 2));
  return new ScatterplotLayer<BitcoinNode>({
    id: "economic-bitcoin-nodes",
    data,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    getPosition: (d) => [d.longitude, d.latitude],
    getFillColor: [255, 140, 0, 255], // Bright orange, full alpha
    getLineColor: [255, 255, 255, 255], // White outline
    lineWidthMinPixels: 1,
    getRadius: (d) => Math.max(20000, Math.sqrt(d.nodeCount) * 8000),
    radiusMinPixels: 4,
    radiusMaxPixels: 18,
    updateTriggers: {
      getRadius: [filters],
    },
  });
}
