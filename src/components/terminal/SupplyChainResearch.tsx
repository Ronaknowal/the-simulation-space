"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  SupplyChainData,
  SupplyChainResearch as SCResearch,
  SCRNode,
  SCREdge,
} from "./types";
import { useStore } from "@/store";
import SupplyChainGraph from "./SupplyChainGraph";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "quick" | "research";
type ResearchPhase = "idle" | "running" | "done" | "error";

interface SSEEvent {
  type: "status" | "tool_call" | "tool_result" | "complete" | "error";
  message?: string;
  name?: string;
  args?: Record<string, unknown>;
  summary?: string;
  data?: SCResearch;
}

interface Props {
  data: SupplyChainData | null;
  symbol: string;
  onNodeClick?: (ticker: string) => void;
}

// ── Stage helpers ─────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  "extraction",
  "component",
  "manufacturing",
  "assembly",
  "company",
  "logistics",
  "distribution",
  "retail",
] as const;

const STAGE_LABELS: Record<string, string> = {
  extraction:    "EXTRACT",
  component:     "COMPONENT",
  manufacturing: "MFG",
  assembly:      "ASSEMBLY",
  company:       "COMPANY",
  logistics:     "LOGISTICS",
  distribution:  "DISTRIB",
  retail:        "RETAIL",
};

function inferStageFromNode(n: SCRNode): string {
  if (n.type === "company") return "company";
  const cat = n.category.toLowerCase();
  if (cat.includes("material") || cat.includes("mine") || cat.includes("extraction") || cat.includes("chemical") || cat.includes("raw")) return "extraction";
  if (cat.includes("semiconductor") || cat.includes("memory") || cat.includes("display") || cat.includes("component") || cat.includes("chip") || cat.includes("sensor") || cat.includes("wafer")) return "component";
  if (cat.includes("assembly") || cat.includes("contract") || cat.includes("odm") || cat.includes("oem")) return "assembly";
  if (cat.includes("manufacturing") || cat.includes("foundry") || cat.includes("fab") || cat.includes("packaging")) return "manufacturing";
  if (cat.includes("logistics") || cat.includes("shipping") || cat.includes("freight") || cat.includes("port") || cat.includes("carrier")) return "logistics";
  if (cat.includes("distribution") || cat.includes("warehouse") || cat.includes("fulfillment") || cat.includes("wholesale")) return "distribution";
  if (cat.includes("retail") || cat.includes("dealer") || cat.includes("store") || cat.includes("e-commerce") || cat.includes("marketplace")) return "retail";
  // Fallback to type/tier
  if (n.type === "customer") return "retail";
  if (n.type === "supplier" && (n.tier ?? 1) >= 2) return "extraction";
  if (n.type === "supplier") return "component";
  return "company";
}

function getNodeStage(n: SCRNode): string {
  return n.stage ?? inferStageFromNode(n);
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  extraction:    "#c86432",
  component:     "#44ccff",
  manufacturing: "#64b4ff",
  assembly:      "#8cc8ff",
  company:       "#d4952b",
  logistics:     "#88aacc",
  distribution:  "#00c864",
  retail:        "#2ecc71",
  competitor:    "#FF6B35",
};

function nodeColor(n: SCRNode): string {
  if (n.type === "company") return STAGE_COLORS.company;
  if (n.type === "competitor") return STAGE_COLORS.competitor;
  const stage = getNodeStage(n);
  return STAGE_COLORS[stage] ?? "#888";
}

const TRANSPORT_COLORS: Record<string, string> = {
  sea:   "#0088ff",
  rail:  "#00cc55",
  truck: "#ff8800",
  air:   "#ffffff",
};

function transportColor(mode?: string): string {
  return TRANSPORT_COLORS[mode ?? ""] ?? "#555";
}

// ── Zoom/Pan Hook ─────────────────────────────────────────────────────────────
// Uses refs during drag for smooth 60fps panning (no React re-renders mid-drag).
// Native wheel listener with { passive: false } to properly preventDefault.

function computeViewBox(
  base: { x: number; y: number; w: number; h: number },
  s: number,
  px: number,
  py: number
): string {
  const w = base.w / s;
  const h = base.h / s;
  const x = base.x + px + (base.w - w) / 2;
  const y = base.y + py + (base.h - h) / 2;
  return `${x} ${y} ${w} ${h}`;
}

function useZoomPan(baseVB: { x: number; y: number; w: number; h: number }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const livePan = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const baseVBRef = useRef(baseVB);
  baseVBRef.current = baseVB;
  scaleRef.current = scale;

  // Committed viewBox (used when not dragging)
  const viewBox = useMemo(
    () => computeViewBox(baseVB, scale, pan.x, pan.y),
    [baseVB, scale, pan]
  );

  // Native wheel event listener with { passive: false }
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = Math.max(0.3, Math.min(5, scaleRef.current * (e.deltaY > 0 ? 0.9 : 1.1)));
      scaleRef.current = next;
      setScale(next);
      svg.setAttribute(
        "viewBox",
        computeViewBox(baseVBRef.current, next, livePan.current.x, livePan.current.y)
      );
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    livePan.current = { ...pan };
    if (svgRef.current) svgRef.current.style.cursor = "grabbing";
  }, [pan]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const s = scaleRef.current;
      const bvb = baseVBRef.current;
      const vbW = bvb.w / s;
      const vbH = bvb.h / s;
      const ratioX = vbW / rect.width;
      const ratioY = vbH / rect.height;

      const dx = (e.clientX - lastMouse.current.x) * ratioX;
      const dy = (e.clientY - lastMouse.current.y) * ratioY;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      livePan.current.x -= dx;
      livePan.current.y -= dy;

      svg.setAttribute(
        "viewBox",
        computeViewBox(bvb, s, livePan.current.x, livePan.current.y)
      );
    },
    []
  );

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (svgRef.current) svgRef.current.style.cursor = "grab";
    setPan({ x: livePan.current.x, y: livePan.current.y });
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    scaleRef.current = 1;
    setPan({ x: 0, y: 0 });
    livePan.current = { x: 0, y: 0 };
  }, []);

  return { svgRef, viewBox, scale, onMouseDown, onMouseMove, onMouseUp, reset };
}

// ── Layout: Stage-based columns ──────────────────────────────────────────────
// EXTRACTION → COMPONENT → MFG → ASSEMBLY → COMPANY → LOGISTICS → DIST → RETAIL

interface NodePos { x: number; y: number }

function computeLayout(nodes: SCRNode[]): { positions: Record<string, NodePos>; vbW: number; vbH: number } {
  // Group nodes by stage
  const stageGroups = new Map<string, SCRNode[]>();
  for (const stage of STAGE_ORDER) stageGroups.set(stage, []);

  const competitors: SCRNode[] = [];

  for (const node of nodes) {
    if (node.type === "competitor") {
      competitors.push(node);
      continue;
    }
    const stage = getNodeStage(node);
    const group = stageGroups.get(stage);
    if (group) {
      group.push(node);
    } else {
      stageGroups.get("company")!.push(node);
    }
  }

  const colSpacing = 180;
  const gap = 90;
  const positions: Record<string, NodePos> = {};

  // Only assign column positions to stages that have nodes
  const activeStages = STAGE_ORDER.filter((s) => (stageGroups.get(s)?.length ?? 0) > 0);

  activeStages.forEach((stage, colIndex) => {
    const group = stageGroups.get(stage)!;
    const x = colIndex * colSpacing;
    const startY = -((group.length - 1) * gap) / 2;
    group.forEach((n, i) => {
      positions[n.id] = { x, y: startY + i * gap };
    });
  });

  // Competitors row below center
  if (competitors.length > 0) {
    const maxY = Math.max(0, ...Object.values(positions).map((p) => Math.abs(p.y)));
    const compBaseY = maxY + 120;
    const centerX = activeStages.length > 0 ? ((activeStages.length - 1) * colSpacing) / 2 : 0;
    competitors.forEach((n, i) => {
      positions[n.id] = {
        x: centerX + (i - (competitors.length - 1) / 2) * 80,
        y: compBaseY,
      };
    });
  }

  // Compute bounds
  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);
  const minX = Math.min(...allX, 0) - 100;
  const maxX = Math.max(...allX, 100) + 100;
  const minY = Math.min(...allY, 0) - 80;
  const maxY = Math.max(...allY, 100) + 80;

  // Normalize positions so viewBox starts at 0,0
  for (const id of Object.keys(positions)) {
    positions[id] = { x: positions[id].x - minX, y: positions[id].y - minY };
  }

  return { positions, vbW: maxX - minX, vbH: maxY - minY };
}

// ── Research Graph ────────────────────────────────────────────────────────────

function ResearchGraph({
  research,
  onNodeClick,
}: {
  research: SCResearch;
  onNodeClick?: (ticker: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { positions, vbW, vbH } = useMemo(
    () => computeLayout(research.nodes),
    [research.nodes]
  );

  const zp = useZoomPan({ x: 0, y: 0, w: vbW, h: vbH });

  const edgeColor = (e: SCREdge) =>
    hovered === e.from || hovered === e.to ? "#d4952b" : transportColor(e.transportMode);

  // Active stages that have nodes (for column labels)
  const activeStages = useMemo(() => {
    const stageGroups = new Map<string, SCRNode[]>();
    for (const stage of STAGE_ORDER) stageGroups.set(stage, []);
    for (const node of research.nodes) {
      if (node.type === "competitor") continue;
      const stage = getNodeStage(node);
      stageGroups.get(stage)?.push(node);
    }
    return STAGE_ORDER.filter((s) => (stageGroups.get(s)?.length ?? 0) > 0);
  }, [research.nodes]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Zoom bar */}
      <div className="flex items-center gap-2 px-2 py-0.5 shrink-0 border-b border-[#0a0a0a]">
        <button onClick={zp.reset} className="font-mono text-[7px] text-[#555] hover:text-[#888]" title="Reset zoom">⟲ RESET</button>
        <span className="font-mono text-[7px] text-[#333]">{Math.round(zp.scale * 100)}%</span>
        <span className="font-mono text-[7px] text-[#333] ml-auto">Scroll to zoom · Drag to pan</span>
      </div>

      {/* SVG canvas — fills all remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden bg-[#020202]">
        <svg
          ref={zp.svgRef}
          width="100%"
          height="100%"
          viewBox={zp.viewBox}
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={zp.onMouseDown}
          onMouseMove={zp.onMouseMove}
          onMouseUp={zp.onMouseUp}
          onMouseLeave={zp.onMouseUp}
          style={{
            cursor: "grab",
            display: "block",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {/* Stage column labels */}
          {activeStages.map((stage) => {
            const nodesInStage = research.nodes.filter((n) => {
              if (n.type === "competitor") return false;
              return getNodeStage(n) === stage;
            });
            if (nodesInStage.length === 0) return null;
            const x = positions[nodesInStage[0]?.id]?.x;
            if (x == null) return null;
            const label = STAGE_LABELS[stage] ?? stage.toUpperCase();
            const color = STAGE_COLORS[stage] ?? "#333";
            return (
              <text key={stage} x={x} y={16} textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace" opacity={0.5}>
                {label}
              </text>
            );
          })}

          {/* Flow arrows between stage columns */}
          {activeStages.length > 1 && activeStages.map((stage, i) => {
            if (i === activeStages.length - 1) return null;
            const fromNodes = research.nodes.filter((n) => n.type !== "competitor" && getNodeStage(n) === stage);
            const toNodes = research.nodes.filter((n) => n.type !== "competitor" && getNodeStage(n) === activeStages[i + 1]);
            if (!fromNodes.length || !toNodes.length) return null;
            const fromX = positions[fromNodes[0].id]?.x;
            const toX = positions[toNodes[0].id]?.x;
            if (fromX == null || toX == null) return null;
            const midX = (fromX + toX) / 2;
            return (
              <text key={`arrow-${i}`} x={midX} y={10} textAnchor="middle" fill="#222" fontSize={10} fontFamily="monospace">
                →
              </text>
            );
          })}

          {/* Edges */}
          {research.edges.map((e) => {
            const sp = positions[e.from];
            const tp = positions[e.to];
            if (!sp || !tp) return null;
            const mx = (sp.x + tp.x) / 2;
            const my = (sp.y + tp.y) / 2 - 30;
            const color = edgeColor(e);
            const isHov = hovered === e.from || hovered === e.to;
            return (
              <g key={e.id}>
                <path
                  d={`M ${sp.x} ${sp.y} Q ${mx} ${my} ${tp.x} ${tp.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHov ? 2 : 1}
                  strokeDasharray={isHov ? "" : "4 3"}
                  opacity={isHov ? 0.9 : 0.35}
                />
                {isHov && e.goods && (
                  <text x={mx} y={my - 6} textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace">
                    {e.goods}
                  </text>
                )}
                {isHov && e.transportMode && (
                  <text x={mx + 24} y={my + 8} textAnchor="middle" fill={color} fontSize={7} fontFamily="monospace" opacity={0.7}>
                    [{e.transportMode}]
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {research.nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const isCompany = node.type === "company";
            const r = isCompany ? 34 : 26;
            const color = nodeColor(node);
            const isHov = hovered === node.id;
            const fill = isHov ? color : "#060606";
            const textFill = isHov ? "#000" : color;
            const label = node.name.length > 10 ? node.name.slice(0, 10) + "…" : node.name;

            return (
              <g
                key={node.id}
                style={{ cursor: node.ticker && !isCompany && onNodeClick ? "pointer" : "default" }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => node.ticker && !isCompany && onNodeClick?.(node.ticker)}
              >
                {/* Critical pulse ring */}
                {node.isCritical && (
                  <circle
                    cx={pos.x} cy={pos.y} r={r + 7}
                    fill="none" stroke="#ff3030" strokeWidth={1.2}
                    opacity={0.5} strokeDasharray="4 3"
                  />
                )}
                {/* Exposure arc */}
                {node.revenueExposure && !isCompany && (
                  <circle
                    cx={pos.x} cy={pos.y} r={r + 4}
                    fill="none" stroke={color} strokeWidth={1.8}
                    strokeDasharray={`${(node.revenueExposure / 100) * 2 * Math.PI * (r + 4)} 999`}
                    opacity={0.35}
                  />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={fill} stroke={color}
                  strokeWidth={isCompany ? 2.5 : 1.8}
                />
                <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fill={textFill} fontSize={isCompany ? 10 : 9} fontFamily="monospace" fontWeight="bold">
                  {label}
                </text>
                {node.ticker && (
                  <text x={pos.x} y={pos.y + r + 13} textAnchor="middle"
                    fill={color} fontSize={8} fontFamily="monospace" opacity={isHov ? 1 : 0.65}>
                    {node.ticker}
                  </text>
                )}
                {node.revenueExposure != null && !isCompany && (
                  <text x={pos.x} y={pos.y - r - 6} textAnchor="middle"
                    fill={color} fontSize={7} fontFamily="monospace" opacity={0.8}>
                    {node.revenueExposure}%
                  </text>
                )}
                {node.isCritical && (
                  <text x={pos.x + r + 4} y={pos.y - r} fill="#ff3030" fontSize={9} fontFamily="monospace">⚠</text>
                )}

                {/* Hover tooltip */}
                {isHov && (() => {
                  const tw = 170;
                  const tx = pos.x > vbW * 0.65 ? pos.x - tw - 8 : pos.x + r + 8;
                  const ty = Math.min(pos.y - 10, vbH - 100);
                  const stage = getNodeStage(node);
                  const lines = [
                    node.ticker ? `${node.name} (${node.ticker})` : node.name,
                    `${node.category} · tier ${node.tier}`,
                    `stage: ${stage}`,
                    node.location.city ? `${node.location.city}, ${node.location.country}` : node.location.country,
                    node.isCritical ? "⚠ CRITICAL" : `Risk: ${node.risk}`,
                  ];
                  return (
                    <g>
                      <rect x={tx} y={ty} width={tw} height={lines.length * 14 + 10}
                        fill="#0c0c0c" stroke="#333" rx={3} />
                      {lines.map((l, i) => (
                        <text key={i} x={tx + 8} y={ty + 14 + i * 14}
                          fill={i === 0 ? "#d4952b" : i === 2 ? (STAGE_COLORS[stage] ?? "#888") : i === 4 && node.isCritical ? "#ff3030" : "#888"}
                          fontSize={9} fontFamily="monospace">
                          {l}
                        </text>
                      ))}
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Chokepoint diamonds at bottom */}
          {research.chokepoints.map((cp, i) => {
            const cx = vbW / 2 + (i - (research.chokepoints.length - 1) / 2) * 60;
            return (
              <g key={cp.name}>
                <polygon
                  points={`${cx},${vbH - 30} ${cx + 8},${vbH - 20} ${cx},${vbH - 10} ${cx - 8},${vbH - 20}`}
                  fill="#ff1a1a" opacity={0.2} stroke="#ff1a1a" strokeWidth={0.8}
                />
                <text x={cx} y={vbH - 2} textAnchor="middle" fill="#ff4444" fontSize={7} fontFamily="monospace">
                  {cp.name.length > 14 ? cp.name.slice(0, 14) + "…" : cp.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Progress Log (collapsible) ──────────────────────────────────────────────

function ProgressLog({ events, phase }: { events: SSEEvent[]; phase: ResearchPhase }) {
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-collapse when research is done
  useEffect(() => {
    if (phase === "done") setCollapsed(true);
  }, [phase]);

  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length, collapsed]);

  return (
    <div className="shrink-0 border-b border-[#111]">
      {/* Toggle header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-2 py-0.5 text-left hover:bg-[#0a0a0a] transition-colors"
      >
        <span className="font-mono text-[7px] text-[#555]">{collapsed ? "▶" : "▼"}</span>
        <span className="font-mono text-[8px] text-[#444]">
          RESEARCH LOG ({events.length} events)
        </span>
        {phase === "running" && (
          <span className="font-mono text-[7px] text-[#d4952b] animate-pulse ml-1">LIVE</span>
        )}
      </button>

      {!collapsed && (
        <div className="max-h-20 overflow-y-auto bg-[#050505] px-2 py-1 font-mono text-[9px]">
          {events.map((ev, i) => {
            if (ev.type === "status") return <div key={i} className="text-[#555]">▶ {ev.message}</div>;
            if (ev.type === "tool_call") {
              const argStr = ev.args ? Object.entries(ev.args).map(([k, v]) => `${k}="${String(v).slice(0, 60)}"`).join(" ") : "";
              return <div key={i} className="text-[#44ccff]">🔍 {ev.name}({argStr})</div>;
            }
            if (ev.type === "tool_result") return <div key={i} className="text-[#666]">  ↳ {ev.summary}</div>;
            if (ev.type === "error") return <div key={i} className="text-[#ff4444]">✗ {ev.message}</div>;
            if (ev.type === "complete") return <div key={i} className="text-[#2ecc71]">✓ Research complete · {ev.data?.nodes.length ?? 0} nodes mapped</div>;
            return null;
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SupplyChainResearch({ data, symbol, onNodeClick }: Props) {
  const [tab, setTab] = useState<Tab>("quick");
  const [phase, setPhase] = useState<ResearchPhase>("idle");
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [research, setResearch] = useState<SCResearch | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const soloLayerWithData = useStore((s) => s.soloLayerWithData);
  const setFlyToTarget = useStore((s) => s.setFlyToTarget);

  const startResearch = useCallback(async () => {
    if (phase === "running") return;
    setPhase("running");
    setEvents([]);
    setResearch(null);
    setTab("research");

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`/api/terminal/supply-chain-research?symbol=${encodeURIComponent(symbol)}`, {
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        setEvents([{ type: "error", message: `HTTP ${res.status}: ${err}` }]);
        setPhase("error");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev: SSEEvent = JSON.parse(line.slice(6));
            setEvents((prev) => [...prev, ev]);
            if (ev.type === "complete" && ev.data) {
              setResearch(ev.data);
              setPhase("done");
            } else if (ev.type === "error") {
              setPhase("error");
            }
          } catch { /* malformed line, skip */ }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setEvents((prev) => [...prev, { type: "error", message: e.message }]);
        setPhase("error");
      }
    }
  }, [symbol, phase]);

  // Reset when symbol changes
  useEffect(() => {
    setPhase("idle");
    setEvents([]);
    setResearch(null);
    setTab("quick");
  }, [symbol]);

  function handleViewOnGlobe() {
    if (!research) return;

    // Atomic: disable all layers, enable supply chain with data in one update
    soloLayerWithData("markets.supply-chain-routes", research);

    // Fly camera to centroid of all supply chain nodes
    const validNodes = research.nodes.filter(
      (n) => n.location?.lat && n.location?.lng
    );
    if (validNodes.length > 0) {
      const avgLat = validNodes.reduce((s, n) => s + n.location.lat, 0) / validNodes.length;
      const avgLng = validNodes.reduce((s, n) => s + n.location.lng, 0) / validNodes.length;
      const latSpread = Math.max(...validNodes.map((n) => n.location.lat)) - Math.min(...validNodes.map((n) => n.location.lat));
      const lngSpread = Math.max(...validNodes.map((n) => n.location.lng)) - Math.min(...validNodes.map((n) => n.location.lng));
      const spread = Math.max(latSpread, lngSpread);
      const alt = Math.max(2_000_000, spread * 80_000);
      setFlyToTarget({ lat: avgLat, lng: avgLng, alt });
    }

    router.push("/");
  }

  const hasResearch = phase === "done" && research;

  return (
    <div className="flex flex-col h-full bg-[#000] border-t border-l border-[#1c1c1c]">
      {/* ── Panel header ── */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#222] bg-[#050505] shrink-0">
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[#d4952b] text-black">SPLC</span>
        <span className="font-mono text-[10px] font-bold text-[#ddd]">{symbol} SUPPLY CHAIN</span>
        <div className="flex-1" />
        {/* Tabs */}
        <button
          onClick={() => setTab("quick")}
          className={`font-mono text-[8px] px-2 py-0.5 border transition-colors ${
            tab === "quick" ? "border-[#d4952b] text-[#d4952b]" : "border-[#333] text-[#444] hover:text-[#888]"
          }`}
        >
          QUICK VIEW
        </button>
        <button
          onClick={() => setTab("research")}
          className={`font-mono text-[8px] px-2 py-0.5 border transition-colors ${
            tab === "research" ? "border-[#44ccff] text-[#44ccff]" : "border-[#333] text-[#444] hover:text-[#888]"
          }`}
        >
          AI RESEARCH
        </button>
      </div>

      {/* ── Quick View tab ── */}
      {tab === "quick" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Legend + action */}
          <div className="flex items-center gap-3 px-3 py-1 border-b border-[#111] shrink-0">
            <span className="font-mono text-[8px] text-[#44ccff]">■ SUPPLIERS</span>
            <span className="font-mono text-[8px] text-[#d4952b]">● COMPANY</span>
            <span className="font-mono text-[8px] text-[#2ecc71]">■ CUSTOMERS</span>
            {data?.isEstimated && (
              <span className="font-mono text-[7px] px-1 py-0.5 border border-[#555] text-[#666]">
                EST · {data.estimatedBasis}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={startResearch}
              className="font-mono text-[8px] px-2 py-0.5 border border-[#d4952b] text-[#d4952b] hover:bg-[#d4952b] hover:text-black transition-colors"
            >
              🔍 DEEP RESEARCH
            </button>
          </div>
          {/* Graph fills rest */}
          {data ? (
            <SupplyChainGraph data={data} symbol={symbol} onNodeClick={onNodeClick} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <span className="font-mono text-[10px] text-[#333]">Loading…</span>
            </div>
          )}
        </div>
      )}

      {/* ── AI Research tab ── */}
      {tab === "research" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Action bar */}
          <div className="flex items-center gap-2 px-3 py-1 border-b border-[#111] shrink-0">
            <button
              onClick={startResearch}
              disabled={phase === "running"}
              className={`font-mono text-[8px] px-2 py-0.5 border transition-colors ${
                phase === "running"
                  ? "border-[#333] text-[#444] cursor-not-allowed"
                  : "border-[#d4952b] text-[#d4952b] hover:bg-[#d4952b] hover:text-black"
              }`}
            >
              {phase === "running" ? "⏳ RESEARCHING…" : "🔍 DEEP RESEARCH"}
            </button>

            {hasResearch && (
              <button
                onClick={handleViewOnGlobe}
                className="font-mono text-[8px] px-2 py-0.5 border border-[#44ccff] text-[#44ccff] hover:bg-[#44ccff] hover:text-black transition-colors"
              >
                🌐 VIEW ON GLOBE
              </button>
            )}

            <div className="flex-1" />

            {/* Compact stage legend */}
            {hasResearch && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(STAGE_COLORS).map(([stage, color]) => (
                  <span key={stage} style={{ color }} className="font-mono text-[6px]">■ {stage.slice(0, 4).toUpperCase()}</span>
                ))}
                <span className="font-mono text-[6px] text-[#333]">|</span>
                {Object.entries(TRANSPORT_COLORS).map(([mode, color]) => (
                  <span key={mode} style={{ color }} className="font-mono text-[6px]">— {mode.toUpperCase()}</span>
                ))}
              </div>
            )}
          </div>

          {/* Progress log (collapsible) */}
          {(phase === "running" || phase === "error" || (phase === "done" && events.length > 0)) && (
            <ProgressLog events={events} phase={phase} />
          )}

          {/* Idle state */}
          {phase === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="font-mono text-[11px] text-[#444]">AI-POWERED SUPPLY CHAIN RESEARCH</div>
              <div className="font-mono text-[9px] text-[#333] text-center max-w-xs">
                Uses Google Gemini to deeply research full lifecycle supply chains:
                extraction → manufacturing → distribution → retail.
              </div>
              <button
                onClick={startResearch}
                className="font-mono text-[9px] px-4 py-1.5 border border-[#d4952b] text-[#d4952b] hover:bg-[#d4952b] hover:text-black transition-colors"
              >
                🔍 START DEEP RESEARCH
              </button>
            </div>
          )}

          {/* Research graph — fills all remaining space with minimum height */}
          {hasResearch && (
            <>
              <div className="flex-1 min-h-[300px] flex flex-col min-h-0">
                <ResearchGraph research={research} onNodeClick={onNodeClick} />
              </div>
              {/* Chokepoints + summary — compact footer */}
              {(research.chokepoints.length > 0 || research.researchSummary) && (
                <div className="px-3 py-1 border-t border-[#111] shrink-0 flex items-start gap-4">
                  {research.chokepoints.length > 0 && (
                    <div className="shrink-0">
                      <span className="font-mono text-[7px] text-[#ff4444]">⚡ CHOKEPOINTS: </span>
                      {research.chokepoints.map((cp, i) => (
                        <span key={cp.name} className="font-mono text-[7px] text-[#ff6666]" title={cp.risk}>
                          {i > 0 && " · "}▲ {cp.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {research.researchSummary && (
                    <div className="font-mono text-[7px] text-[#444] leading-relaxed flex-1 min-w-0 truncate" title={research.researchSummary}>
                      {research.researchSummary}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
