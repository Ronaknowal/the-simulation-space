import { ArcLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { SupplyChainResearch, SCRNode, SCRChokepoint, SCRFacility } from "@/components/terminal/types";

// ── Color maps ────────────────────────────────────────────────────────────────

const TRANSPORT_RGBA: Record<string, [number, number, number, number]> = {
  sea:   [0,   136, 255, 200],
  rail:  [0,   204,  85, 200],
  truck: [255, 136,   0, 200],
  air:   [240, 240, 240, 200],
};
const DEFAULT_ROUTE_COLOR: [number, number, number, number] = [128, 128, 128, 160];

function routeColor(mode?: string): [number, number, number, number] {
  return TRANSPORT_RGBA[mode ?? ""] ?? DEFAULT_ROUTE_COLOR;
}

// Stage-aware node coloring — tells a visual story of the lifecycle
function nodeRGBA(node: SCRNode): [number, number, number, number] {
  if (node.type === "company")    return [255, 160,  40, 220];
  if (node.type === "competitor") return [255, 107,  53, 200];
  // Stage-based colors for suppliers and customers
  if (node.stage === "extraction")     return [200, 100,  50, 200]; // brown — raw materials
  if (node.stage === "component")      return [ 68, 204, 255, 200]; // cyan — components
  if (node.stage === "manufacturing")  return [100, 180, 255, 200]; // blue — manufacturing
  if (node.stage === "assembly")       return [140, 200, 255, 200]; // light blue — assembly
  if (node.stage === "logistics")      return [136, 170, 204, 200]; // steel — logistics
  if (node.stage === "distribution")   return [  0, 200, 100, 200]; // teal — distribution
  if (node.stage === "retail")         return [  0, 255,  65, 200]; // green — retail
  // Fallback to type/tier
  if (node.type === "supplier") return node.tier <= 1 ? [68, 204, 255, 200] : [30, 122, 168, 180];
  if (node.type === "customer") return node.tier <= 1 ? [0,  255,  65, 200] : [0,  168,  43, 180];
  return [160, 160, 160, 180];
}

// ── Build per-edge arc data ────────────────────────────────────────────────────

interface ArcDatum {
  sourcePosition: [number, number];
  targetPosition: [number, number];
  color: [number, number, number, number];
  goods?: string;
  mode?: string;
  width: number;
}

function buildArcs(research: SupplyChainResearch): ArcDatum[] {
  const nodeById = new Map<string, SCRNode>(research.nodes.map((n) => [n.id, n]));
  const arcs: ArcDatum[] = [];

  for (const edge of research.edges) {
    const src = nodeById.get(edge.from);
    const tgt = nodeById.get(edge.to);
    if (!src?.location?.lng || !tgt?.location?.lng) continue;

    // If route waypoints exist, create arc segments between consecutive waypoints
    if (edge.route && edge.route.length >= 2) {
      const pts = [
        { lat: src.location.lat, lng: src.location.lng },
        ...edge.route,
        { lat: tgt.location.lat, lng: tgt.location.lng },
      ];
      for (let i = 0; i < pts.length - 1; i++) {
        arcs.push({
          sourcePosition: [pts[i].lng, pts[i].lat],
          targetPosition: [pts[i + 1].lng, pts[i + 1].lat],
          color: routeColor(edge.transportMode),
          goods: edge.goods,
          mode: edge.transportMode,
          width: tgt.tier <= 1 ? 4 : 2.5,
        });
      }
    } else {
      arcs.push({
        sourcePosition: [src.location.lng, src.location.lat],
        targetPosition: [tgt.location.lng, tgt.location.lat],
        color: routeColor(edge.transportMode),
        goods: edge.goods,
        mode: edge.transportMode,
        width: tgt.tier <= 1 ? 4 : 2.5,
      });
    }
  }

  return arcs;
}

// ── Main renderer ─────────────────────────────────────────────────────────────
//
// Sizing: pure earth-proportional, no pixel cap. Small pin-dot radii.
//
// At full-earth (mpp ≈ 25,662): company ≈ 0.8px, node ≈ 0.5px (tiny dots)
// At continent  (mpp ≈ 6,416): company ≈ 3px,    node ≈ 2px   (visible pins)
// At country    (mpp ≈ 1,283): company ≈ 16px,   node ≈ 10px  (clear markers)

export function createSupplyChainRoutesLayer(
  data: SupplyChainResearch,
  opacity: number = 1
): any[] {
  const layers: any[] = [];
  const validNodes = data.nodes.filter(
    (n) => n.location?.lat != null && n.location?.lng != null
  );

  // 1. Arc routes
  const arcs = buildArcs(data);
  if (arcs.length > 0) {
    layers.push(
      new ArcLayer<ArcDatum>({
        id: "supply-chain-routes-arcs",
        data: arcs,
        pickable: true,
        opacity: opacity * 0.75,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: (d) => d.color,
        getTargetColor: (d) => d.color,
        getWidth: (d) => d.width,
        widthMinPixels: 1,
        widthMaxPixels: 4,
        greatCircle: true,
      })
    );
  }

  // 2. Node glow — tiny earth-proportional halo
  layers.push(
    new ScatterplotLayer<SCRNode>({
      id: "supply-chain-nodes-glow",
      data: validNodes,
      pickable: false,
      opacity: opacity * 0.04,
      getPosition: (d) => [d.location.lng, d.location.lat],
      getRadius: (d) => (d.type === "company" ? 20_000 : 13_000),
      getFillColor: (d) => nodeRGBA(d),
      radiusUnits: "meters",
      radiusMaxPixels: 9999,
    })
  );

  // 3. Node markers — small earth-proportional dots
  layers.push(
    new ScatterplotLayer<SCRNode>({
      id: "supply-chain-nodes",
      data: validNodes,
      pickable: true,
      opacity,
      getPosition: (d) => [d.location.lng, d.location.lat],
      getRadius: (d) => (d.type === "company" ? 13_000 : d.isCritical ? 10_000 : 8_000),
      getFillColor: (d) => nodeRGBA(d),
      stroked: true,
      getLineColor: [255, 255, 255, 60],
      getLineWidth: 100,
      radiusUnits: "meters",
      radiusMaxPixels: 9999,
      radiusMinPixels: 1,
    })
  );

  // 4. Node labels
  layers.push(
    new TextLayer<SCRNode>({
      id: "supply-chain-labels",
      data: validNodes,
      pickable: false,
      opacity,
      getPosition: (d: SCRNode) => [d.location.lng, d.location.lat],
      getText: (d: SCRNode) => d.ticker ?? d.name.slice(0, 8),
      getSize: (d: SCRNode) => (d.type === "company" ? 12 : 10),
      getColor: (d: SCRNode) => nodeRGBA(d),
      getPixelOffset: [0, -16],
      background: true,
      getBackgroundColor: [0, 0, 0, 160],
      backgroundPadding: [2, 1, 2, 1],
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      fontWeight: "bold",
    } as any)
  );

  // 5. Chokepoint markers — small earth-proportional, red
  if (data.chokepoints.length > 0) {
    layers.push(
      new ScatterplotLayer<SCRChokepoint>({
        id: "supply-chain-chokepoints-ring",
        data: data.chokepoints,
        pickable: false,
        opacity: opacity * 0.05,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 16_000,
        getFillColor: [255, 30, 30, 100],
        stroked: false,
        radiusUnits: "meters",
        radiusMaxPixels: 9999,
      })
    );
    layers.push(
      new ScatterplotLayer<SCRChokepoint>({
        id: "supply-chain-chokepoints",
        data: data.chokepoints,
        pickable: true,
        opacity,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 8_000,
        getFillColor: [255, 50, 50, 200],
        stroked: true,
        getLineColor: [255, 0, 0, 180],
        getLineWidth: 200,
        radiusUnits: "meters",
        radiusMaxPixels: 9999,
        radiusMinPixels: 1,
      })
    );
    layers.push(
      new TextLayer<SCRChokepoint>({
        id: "supply-chain-chokepoint-labels",
        data: data.chokepoints,
        pickable: false,
        opacity,
        getPosition: (d: SCRChokepoint) => [d.lng, d.lat],
        getText: (d: SCRChokepoint) => `⚡ ${d.name}`,
        getSize: 9,
        getColor: [255, 80, 80, 255],
        getPixelOffset: [0, -14],
        background: true,
        getBackgroundColor: [0, 0, 0, 180],
        backgroundPadding: [3, 1, 3, 1],
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "bold",
      } as any)
    );
  }

  // 6. Facility markers — individual sites
  interface FacilityDatum extends SCRFacility {
    parentName: string;
    parentColor: [number, number, number, number];
  }
  const FACILITY_COLORS: Record<string, [number, number, number, number]> = {
    hq:              [255, 160,  40, 220],
    factory:         [255, 200,  50, 200],
    'data-center':   [100, 200, 255, 200],
    warehouse:       [180, 180, 180, 200],
    mine:            [200, 100,  50, 200],
    port:            [ 50, 150, 255, 200],
    refinery:        [255, 150,  50, 200],
    assembly:        [180, 220, 100, 200],
    'logistics-hub': [100, 180, 220, 200],
  };

  const facilities: FacilityDatum[] = [];
  for (const node of data.nodes) {
    if (node.facilities) {
      const color = nodeRGBA(node);
      for (const f of node.facilities) {
        if (f.lat && f.lng) {
          facilities.push({ ...f, parentName: node.name, parentColor: color });
        }
      }
    }
  }

  if (facilities.length > 0) {
    layers.push(
      new ScatterplotLayer<FacilityDatum>({
        id: "supply-chain-facilities",
        data: facilities,
        pickable: true,
        opacity: opacity * 0.85,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 6_000,
        getFillColor: (d) => FACILITY_COLORS[d.type] ?? [160, 160, 160, 180],
        stroked: true,
        getLineColor: [255, 255, 255, 60],
        getLineWidth: 80,
        radiusUnits: "meters",
        radiusMaxPixels: 9999,
        radiusMinPixels: 1,
      })
    );
    layers.push(
      new TextLayer<FacilityDatum>({
        id: "supply-chain-facility-labels",
        data: facilities,
        pickable: false,
        opacity: opacity * 0.7,
        getPosition: (d: FacilityDatum) => [d.lng, d.lat],
        getText: (d: FacilityDatum) => (d.name.length > 12 ? d.name.slice(0, 12) + "…" : d.name),
        getSize: 8,
        getColor: [200, 200, 200, 180],
        getPixelOffset: [0, -10],
        background: true,
        getBackgroundColor: [0, 0, 0, 140],
        backgroundPadding: [2, 1, 2, 1],
        fontFamily: "'JetBrains Mono', monospace",
      } as any)
    );
  }

  return layers;
}
