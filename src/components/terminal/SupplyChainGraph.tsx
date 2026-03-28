"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { SupplyChainData, SupplyChainNode } from "./types";

interface Props {
  data: SupplyChainData | null;
  symbol: string;
  onNodeClick?: (ticker: string) => void;
}

const NODE_R = 24;
const COMPANY_R = 34;

// ── Zoom/Pan Hook ────────────────────────────────────────────────────────────
// Uses refs during drag for smooth 60fps panning (no React re-renders mid-drag).

function computeVB(
  base: { x: number; y: number; w: number; h: number },
  s: number,
  px: number,
  py: number
): string {
  const w = base.w / s;
  const h = base.h / s;
  return `${base.x + px + (base.w - w) / 2} ${base.y + py + (base.h - h) / 2} ${w} ${h}`;
}

function useZoomPan(baseVB: { x: number; y: number; w: number; h: number }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const livePan = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  scaleRef.current = scale;

  const viewBox = useMemo(
    () => computeVB(baseVB, scale, pan.x, pan.y),
    [baseVB, scale, pan]
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const next = Math.max(0.3, Math.min(5, s * (e.deltaY > 0 ? 0.9 : 1.1)));
      scaleRef.current = next;
      if (svgRef.current) {
        svgRef.current.setAttribute("viewBox", computeVB(baseVB, next, livePan.current.x, livePan.current.y));
      }
      return next;
    });
  }, [baseVB]);

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
      const ratioX = (baseVB.w / s) / rect.width;
      const ratioY = (baseVB.h / s) / rect.height;

      livePan.current.x -= (e.clientX - lastMouse.current.x) * ratioX;
      livePan.current.y -= (e.clientY - lastMouse.current.y) * ratioY;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      svg.setAttribute("viewBox", computeVB(baseVB, s, livePan.current.x, livePan.current.y));
    },
    [baseVB]
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

  return { svgRef, viewBox, scale, onWheel, onMouseDown, onMouseMove, onMouseUp, reset };
}

// ── Node ─────────────────────────────────────────────────────────────────────

function NodeCircle({
  node, x, y, r, onClick, hovered, onHover, onLeave,
}: {
  node: SupplyChainNode; x: number; y: number; r: number;
  onClick?: () => void; hovered: boolean;
  onHover: () => void; onLeave: () => void;
}) {
  const isCompany = node.type === "company";
  const stroke =
    isCompany ? "#d4952b" :
    node.type === "supplier" ? "#44ccff" : "#2ecc71";
  const fill = hovered ? stroke : "#0a0a0a";
  const textColor = hovered ? "#000" : stroke;
  const shortName = node.name.length > 10 ? node.name.slice(0, 10) + "…" : node.name;

  return (
    <g
      style={{ cursor: node.ticker ? "pointer" : "default" }}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <circle
        cx={x} cy={y} r={r}
        fill={fill} stroke={stroke}
        strokeWidth={isCompany ? 2.5 : 1.8}
        opacity={0.95}
      />
      {node.exposure && !isCompany && (
        <circle
          cx={x} cy={y} r={r + 5}
          fill="none" stroke={stroke}
          strokeWidth={1.2}
          strokeDasharray={`${(node.exposure / 100) * (2 * Math.PI * (r + 5))} 999`}
          strokeLinecap="round"
          opacity={0.4}
        />
      )}
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
        fill={textColor} fontSize={isCompany ? 10 : 9} fontFamily="monospace" fontWeight="bold">
        {shortName}
      </text>
      {node.ticker && (
        <text x={x} y={y + r + 14} textAnchor="middle"
          fill={textColor} fontSize={8} fontFamily="monospace" opacity={hovered ? 1 : 0.7}>
          {node.ticker}
        </text>
      )}
      {node.exposure && (
        <text x={x} y={y - r - 6} textAnchor="middle"
          fill={stroke} fontSize={8} fontFamily="monospace" opacity={0.8}>
          {node.exposure}%
        </text>
      )}
    </g>
  );
}

// ── Edge ─────────────────────────────────────────────────────────────────────

function EdgeLine({
  x1, y1, x2, y2, label: _label, hovered,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label?: string; hovered: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - 28;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} Q ${mx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke={hovered ? "#d4952b" : "#2a2a2a"}
        strokeWidth={hovered ? 1.8 : 1}
        strokeDasharray={hovered ? "" : "4 3"}
      />
      {hovered && _label && (
        <text x={mx} y={cy - 6} textAnchor="middle"
          fill="#d4952b" fontSize={8} fontFamily="monospace">
          {_label}
        </text>
      )}
    </g>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SupplyChainGraph({ data, symbol, onNodeClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const layout = useMemo(() => {
    if (!data) return { positions: {} as Record<string, { x: number; y: number }>, svgW: 700, svgH: 500 };
    const suppliers = data.nodes.filter(n => n.type === "supplier");
    const customers = data.nodes.filter(n => n.type === "customer");
    const company = data.nodes.find(n => n.type === "company");

    const nodeCount = Math.max(suppliers.length, customers.length, 1);
    const svgH = Math.max(500, nodeCount * 90 + 80);
    const svgW = 700;
    const midX = svgW / 2;
    const midY = svgH / 2;

    const positions: Record<string, { x: number; y: number }> = {};
    if (company) positions[company.id] = { x: midX, y: midY };

    suppliers.forEach((n, i) => {
      const count = suppliers.length;
      positions[n.id] = {
        x: svgW * 0.15,
        y: (svgH / (count + 1)) * (i + 1),
      };
    });

    customers.forEach((n, i) => {
      const count = customers.length;
      positions[n.id] = {
        x: svgW * 0.85,
        y: (svgH / (count + 1)) * (i + 1),
      };
    });

    return { positions, svgW, svgH };
  }, [data]);

  const { positions, svgW, svgH } = layout;

  const zp = useZoomPan({ x: 0, y: 0, w: svgW, h: svgH ?? 500 });

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#020202]">
        <span className="font-mono text-[10px] text-[#333]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#020202]">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-2 py-0.5 shrink-0">
        <button onClick={zp.reset} className="font-mono text-[7px] text-[#555] hover:text-[#888]" title="Reset zoom">⟲ RESET</button>
        <span className="font-mono text-[7px] text-[#333]">{Math.round(zp.scale * 100)}%</span>
        <span className="font-mono text-[7px] text-[#333] ml-auto">Scroll to zoom · Drag to pan</span>
      </div>

      {/* Graph SVG */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <svg
          ref={zp.svgRef}
          width="100%"
          height="100%"
          viewBox={zp.viewBox}
          preserveAspectRatio="xMidYMid meet"
          onWheel={zp.onWheel}
          onMouseDown={zp.onMouseDown}
          onMouseMove={zp.onMouseMove}
          onMouseUp={zp.onMouseUp}
          onMouseLeave={zp.onMouseUp}
          style={{ cursor: "grab", display: "block" }}
        >
          {/* Column labels */}
          <text x={svgW * 0.15} y={20} textAnchor="middle" fill="#333" fontSize={10} fontFamily="monospace">SUPPLIERS</text>
          <text x={svgW / 2} y={20} textAnchor="middle" fill="#555" fontSize={10} fontFamily="monospace">{symbol}</text>
          <text x={svgW * 0.85} y={20} textAnchor="middle" fill="#333" fontSize={10} fontFamily="monospace">CUSTOMERS</text>

          {/* Edges */}
          {data.edges.map((e, i) => {
            const sp = positions[e.source];
            const tp = positions[e.target];
            if (!sp || !tp) return null;
            const isHov = hovered === e.source || hovered === e.target;
            return (
              <EdgeLine
                key={i}
                x1={sp.x} y1={sp.y}
                x2={tp.x} y2={tp.y}
                label={e.label}
                hovered={isHov}
              />
            );
          })}

          {/* Nodes */}
          {data.nodes.map(node => {
            const pos = positions[node.id];
            if (!pos) return null;
            const r = node.type === "company" ? COMPANY_R : NODE_R;
            return (
              <NodeCircle
                key={node.id}
                node={node}
                x={pos.x} y={pos.y} r={r}
                hovered={hovered === node.id}
                onHover={() => setHovered(node.id)}
                onLeave={() => setHovered(null)}
                onClick={node.ticker && node.type !== "company" && onNodeClick
                  ? () => onNodeClick(node.ticker!)
                  : undefined
                }
              />
            );
          })}

          {/* Hover tooltip */}
          {hovered && (() => {
            const node = data.nodes.find(n => n.id === hovered);
            const pos = positions[hovered];
            if (!node || !pos) return null;
            const tw = 150;
            const tx = pos.x > svgW * 0.6 ? pos.x - tw - 10 : pos.x + 44;
            const ty = Math.min(pos.y - 10, (svgH ?? 500) - 70);
            return (
              <g>
                <rect x={tx} y={ty} width={tw} height={node.description ? 52 : 38}
                  fill="#0d0d0d" stroke="#333" rx={3} />
                <text x={tx + 8} y={ty + 14} fill="#d4952b" fontSize={10} fontFamily="monospace" fontWeight="bold">
                  {node.ticker || node.name}
                </text>
                <text x={tx + 8} y={ty + 26} fill="#888" fontSize={9} fontFamily="monospace">
                  {node.sector || node.type}
                </text>
                {node.description && (
                  <text x={tx + 8} y={ty + 40} fill="#555" fontSize={8} fontFamily="monospace">
                    {node.description.slice(0, 22)}
                  </text>
                )}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
