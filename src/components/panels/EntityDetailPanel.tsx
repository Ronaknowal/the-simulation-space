"use client";

import React from "react";
import { useStore } from "@/store";
import { X, Zap, Globe } from "lucide-react";

// ─── Helper: MetricRow ────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between py-1 border-b border-border">
      <span className="text-text-disabled text-[8px] uppercase">{label}</span>
      <span className={`text-[9px] ${color ?? "text-text-secondary"}`}>{value}</span>
    </div>
  );
}

// ─── Title extractor ──────────────────────────────────────────────────────────

function getEntityTitle(layerId: string, data: Record<string, unknown>): string {
  return (
    (data?.name as string) ||
    (data?.title as string) ||
    (data?.callsign as string) ||
    (data?.symbol as string) ||
    (data?.place as string) ||
    (data?.designation as string) ||
    `Entity (${layerId})`
  );
}

// ─── Category renderers ───────────────────────────────────────────────────────

function renderCommonMetrics(data: Record<string, unknown>): React.ReactNode {
  const lat = data?.lat ?? data?.latitude;
  const lon = data?.lon ?? data?.longitude ?? data?.lng;
  if (lat == null && lon == null) return null;
  return (
    <div className="mb-2">
      <p className="text-[8px] text-text-disabled uppercase tracking-widest mb-1">Position</p>
      {lat != null && (
        <MetricRow label="Latitude" value={String(Number(lat).toFixed(4))} />
      )}
      {lon != null && (
        <MetricRow label="Longitude" value={String(Number(lon).toFixed(4))} />
      )}
    </div>
  );
}

function renderAviationMetrics(data: Record<string, unknown>): React.ReactNode {
  return (
    <div>
      <p className="text-[8px] text-text-disabled uppercase tracking-widest mb-1 mt-2">Flight Data</p>
      {data?.callsign != null && <MetricRow label="Callsign" value={String(data.callsign)} />}
      {data?.alt_baro != null && (
        <MetricRow label="Altitude" value={`${Number(data.alt_baro).toLocaleString()} ft`} />
      )}
      {data?.gs != null && (
        <MetricRow label="Ground Speed" value={`${Number(data.gs).toFixed(0)} kts`} />
      )}
      {data?.track != null && (
        <MetricRow label="Heading" value={`${Number(data.track).toFixed(0)}°`} />
      )}
      {data?.t != null && <MetricRow label="Aircraft Type" value={String(data.t)} />}
      {data?.orig != null && <MetricRow label="Origin" value={String(data.orig)} />}
      {data?.dest != null && <MetricRow label="Destination" value={String(data.dest)} />}
      {data?.squawk != null && <MetricRow label="Squawk" value={String(data.squawk)} />}
      {data?.flight != null && <MetricRow label="Flight #" value={String(data.flight).trim()} />}
      {data?.hex != null && <MetricRow label="ICAO Hex" value={String(data.hex).toUpperCase()} />}
    </div>
  );
}

function renderMaritimeMetrics(data: Record<string, unknown>): React.ReactNode {
  return (
    <div>
      <p className="text-[8px] text-text-disabled uppercase tracking-widest mb-1 mt-2">Vessel Data</p>
      {data?.mmsi != null && <MetricRow label="MMSI" value={String(data.mmsi)} />}
      {data?.name != null && <MetricRow label="Ship Name" value={String(data.name)} />}
      {data?.shipType != null && <MetricRow label="Ship Type" value={String(data.shipType)} />}
      {data?.sog != null && (
        <MetricRow label="Speed" value={`${Number(data.sog).toFixed(1)} kts`} />
      )}
      {data?.cog != null && (
        <MetricRow label="Course" value={`${Number(data.cog).toFixed(0)}°`} />
      )}
      {data?.flag != null && <MetricRow label="Flag" value={String(data.flag)} />}
      {data?.destination != null && (
        <MetricRow label="Destination" value={String(data.destination)} />
      )}
      {data?.cargo != null && <MetricRow label="Cargo Type" value={String(data.cargo)} />}
    </div>
  );
}

function magnitudeColor(mag: number): string {
  if (mag >= 7) return "text-negative font-bold";
  if (mag >= 5) return "text-warning";
  return "text-positive";
}

function renderSeismicMetrics(data: Record<string, unknown>): React.ReactNode {
  const props = (data?.properties ?? data) as Record<string, unknown>;
  const mag = props?.mag != null ? Number(props.mag) : null;
  return (
    <div>
      <p className="text-[8px] text-text-disabled uppercase tracking-widest mb-1 mt-2">Seismic Data</p>
      {mag != null && (
        <MetricRow
          label="Magnitude"
          value={`M${mag.toFixed(1)}`}
          color={magnitudeColor(mag)}
        />
      )}
      {props?.depth != null && (
        <MetricRow label="Depth" value={`${Number(props.depth).toFixed(1)} km`} />
      )}
      {props?.place != null && <MetricRow label="Location" value={String(props.place)} />}
      {props?.time != null && (
        <MetricRow
          label="Time"
          value={new Date(Number(props.time)).toUTCString().replace(" GMT", " UTC")}
        />
      )}
      {props?.tsunami != null && (
        <MetricRow
          label="Tsunami Warning"
          value={props.tsunami ? "YES" : "NO"}
          color={props.tsunami ? "text-negative font-bold" : "text-positive"}
        />
      )}
      {props?.felt != null && (
        <MetricRow label="Felt Reports" value={String(props.felt)} />
      )}
    </div>
  );
}

function renderSatelliteMetrics(data: Record<string, unknown>): React.ReactNode {
  return (
    <div>
      <p className="text-[8px] text-text-disabled uppercase tracking-widest mb-1 mt-2">Orbital Data</p>
      {data?.name != null && <MetricRow label="Name" value={String(data.name)} />}
      {data?.noradId != null && <MetricRow label="NORAD ID" value={String(data.noradId)} />}
      {data?.orbitType != null && <MetricRow label="Orbit Type" value={String(data.orbitType)} />}
      {data?.altitude != null && (
        <MetricRow label="Altitude" value={`${Number(data.altitude).toFixed(0)} km`} />
      )}
      {data?.velocity != null && (
        <MetricRow label="Velocity" value={`${Number(data.velocity).toFixed(2)} km/s`} />
      )}
      {data?.inclination != null && (
        <MetricRow label="Inclination" value={`${Number(data.inclination).toFixed(2)}°`} />
      )}
      {data?.period != null && (
        <MetricRow label="Period" value={`${Number(data.period).toFixed(1)} min`} />
      )}
    </div>
  );
}

function changeColor(pct: number): string {
  if (pct > 0) return "text-positive";
  if (pct < 0) return "text-negative";
  return "text-text-secondary";
}

function renderMarketMetrics(data: Record<string, unknown>): React.ReactNode {
  const changePct = data?.changePct != null ? Number(data.changePct) : null;
  return (
    <div>
      <p className="text-[8px] text-text-disabled uppercase tracking-widest mb-1 mt-2">Market Data</p>
      {data?.symbol != null && <MetricRow label="Symbol" value={String(data.symbol)} />}
      {data?.price != null && (
        <MetricRow label="Price" value={`${data?.currency ?? "$"}${Number(data.price).toFixed(2)}`} />
      )}
      {changePct != null && (
        <MetricRow
          label="Change %"
          value={`${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`}
          color={changeColor(changePct)}
        />
      )}
      {data?.volume != null && (
        <MetricRow label="Volume" value={Number(data.volume).toLocaleString()} />
      )}
      {data?.marketCap != null && (
        <MetricRow label="Market Cap" value={`$${Number(data.marketCap).toLocaleString()}`} />
      )}
      {data?.sector != null && <MetricRow label="Sector" value={String(data.sector)} />}
    </div>
  );
}

const SKIP_KEYS = new Set(["lat", "lon", "lng", "latitude", "longitude", "geometry", "type"]);

function renderGenericMetrics(data: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(data)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && v != null && typeof v !== "object")
    .slice(0, 20);

  if (entries.length === 0) return null;

  return (
    <div>
      <p className="text-[8px] text-text-disabled uppercase tracking-widest mb-1 mt-2">Properties</p>
      {entries.map(([key, val]) => (
        <MetricRow key={key} label={key} value={String(val)} />
      ))}
    </div>
  );
}

// ─── Metric dispatcher ────────────────────────────────────────────────────────

function renderEntityMetrics(layerId: string, data: Record<string, unknown>): React.ReactNode {
  const category = layerId.split(".")[0];
  const common = renderCommonMetrics(data);

  switch (category) {
    case "aviation":
      return <>{common}{renderAviationMetrics(data)}</>;
    case "maritime":
      return <>{common}{renderMaritimeMetrics(data)}</>;
    case "seismic":
      return <>{common}{renderSeismicMetrics(data)}</>;
    case "satellites":
      return <>{common}{renderSatelliteMetrics(data)}</>;
    case "markets":
      return <>{common}{renderMarketMetrics(data)}</>;
    default:
      return <>{common}{renderGenericMetrics(data)}</>;
  }
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function EntityDetailPanel() {
  const selectedEntity = useStore((s) => s.selectedEntity);
  const setSelectedEntity = useStore((s) => s.setSelectedEntity);
  const setActiveModule = useStore((s) => s.setActiveModule);

  if (!selectedEntity) return null;

  const { layerId, data } = selectedEntity;
  const safeData = (data ?? {}) as Record<string, unknown>;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[340px] bg-surface border-l border-border z-50 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div>
          <span className="text-[8px] text-text-disabled uppercase tracking-wider">{layerId}</span>
          <h3 className="text-text-primary text-[11px] font-bold">
            {getEntityTitle(layerId, safeData)}
          </h3>
        </div>
        <button
          onClick={() => setSelectedEntity(null)}
          className="text-text-disabled hover:text-text-secondary"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Metrics */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {renderEntityMetrics(layerId, safeData)}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-border flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-wider border border-accent/20 hover:bg-accent/20"
          onClick={() => setActiveModule("simulation")}
        >
          <Zap size={12} /> SIMULATE
        </button>
        <button
          className="flex items-center justify-center gap-1 px-3 py-1.5 text-text-disabled text-[9px] border border-border hover:text-text-secondary"
          onClick={() => setActiveModule("globe")}
        >
          <Globe size={12} /> GLOBE
        </button>
      </div>
    </div>
  );
}
