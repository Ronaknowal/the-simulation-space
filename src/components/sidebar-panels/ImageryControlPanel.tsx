"use client";

import { useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Layers, Info } from "lucide-react";
import { useStore } from "@/store";

const IMAGERY_LAYER_IDS = new Set([
  "imagery.nasa-gibs",
  "imagery.nightlights",
  "imagery.sentinel2",
]);

// GIBS product catalog (subset for selector)
const GIBS_PRODUCTS = [
  { id: "MODIS_Terra_CorrectedReflectance_TrueColor", name: "MODIS True Color", resolution: "250m", format: "image/jpeg" },
  { id: "VIIRS_SNPP_CorrectedReflectance_TrueColor", name: "VIIRS True Color", resolution: "250m", format: "image/jpeg" },
  { id: "BlueMarble_ShadedRelief_Bathymetry", name: "Blue Marble", resolution: "500m", format: "image/jpeg" },
  { id: "VIIRS_SNPP_DayNightBand_ENCC", name: "Nightlights (VIIRS DNB)", resolution: "500m", format: "image/png" },
  { id: "VIIRS_NOAA20_Thermal_Anomalies_375m_All", name: "Thermal Anomalies", resolution: "250m", format: "image/png" },
  { id: "MODIS_Terra_Cloud_Top_Temp_Day", name: "Cloud Top Temperature", resolution: "2km", format: "image/png" },
  { id: "MODIS_Terra_Aerosol", name: "Aerosol Optical Depth", resolution: "2km", format: "image/png" },
];

function yesterdayISO(): string {
  return new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

interface ImageryControlPanelProps {
  layerId: string;
}

export default function ImageryControlPanel({ layerId }: ImageryControlPanelProps) {
  const isEnabled = useStore((s) => s.layers[layerId]?.enabled ?? false);
  const data = useStore((s) => s.layers[layerId]?.data);
  const opacity = useStore((s) => s.layers[layerId]?.opacity ?? 0.7);
  const setLayerFilter = useStore((s) => s.setLayerFilter);
  const setLayerOpacity = useStore((s) => s.setLayerOpacity);

  const filters = useStore.getState().layers[layerId]?.filters ?? {};

  if (!IMAGERY_LAYER_IDS.has(layerId) || !isEnabled) return null;

  return (
    <div className="mx-2 mb-1.5 border border-border-subtle bg-surface px-3 py-2">
      {layerId === "imagery.nasa-gibs" && (
        <GIBSControls
          data={data}
          filters={filters}
          opacity={opacity}
          setFilter={(k: string, v: any) => setLayerFilter(layerId, k, v)}
          setOpacity={(v: number) => setLayerOpacity(layerId, v)}
        />
      )}
      {layerId === "imagery.nightlights" && (
        <NightlightsControls
          data={data}
          filters={filters}
          opacity={opacity}
          setFilter={(k: string, v: any) => setLayerFilter(layerId, k, v)}
          setOpacity={(v: number) => setLayerOpacity(layerId, v)}
        />
      )}
      {layerId === "imagery.sentinel2" && (
        <Sentinel2Controls
          data={data}
          filters={filters}
          opacity={opacity}
          setFilter={(k: string, v: any) => setLayerFilter(layerId, k, v)}
          setOpacity={(v: number) => setLayerOpacity(layerId, v)}
        />
      )}
    </div>
  );
}

interface ControlProps {
  data: any;
  filters: Record<string, any>;
  opacity: number;
  setFilter: (key: string, value: any) => void;
  setOpacity: (value: number) => void;
}

function DateRow({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const handlePrev = useCallback(() => onChange(shiftDate(date, -1)), [date, onChange]);
  const handleNext = useCallback(() => {
    const next = shiftDate(date, 1);
    const today = new Date().toISOString().split("T")[0];
    if (next <= today) onChange(next);
  }, [date, onChange]);

  return (
    <div className="flex items-center gap-1.5">
      <Calendar size={10} className="text-text-disabled flex-shrink-0" />
      <button onClick={handlePrev} className="text-text-disabled hover:text-accent transition-colors" title="Previous day">
        <ChevronLeft size={12} />
      </button>
      <input
        type="date"
        value={date}
        max={new Date().toISOString().split("T")[0]}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 flex-1 bg-bg border border-border px-1.5 font-mono text-[9px] text-text-primary focus:border-accent focus:outline-none [color-scheme:dark]"
      />
      <button onClick={handleNext} className="text-text-disabled hover:text-accent transition-colors" title="Next day">
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

function OpacityRow({ opacity, onChange }: { opacity: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] text-text-disabled w-10 flex-shrink-0">Opacity</span>
      <input
        type="range"
        min={0} max={1} step={0.05}
        value={opacity}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 appearance-none bg-border accent-accent cursor-pointer"
      />
      <span className="w-8 text-right font-mono text-[8px] text-text-disabled">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
}

function MetadataRow({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1 pt-0.5">
      <Info size={8} className="text-text-disabled flex-shrink-0" />
      <span className="font-mono text-[7px] text-text-disabled">
        {items.filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}

function GIBSControls({ data, filters, opacity, setFilter, setOpacity }: ControlProps) {
  const currentDate = (filters.date as string) || data?.time || yesterdayISO();
  const currentProduct = (filters.productId as string) || "MODIS_Terra_CorrectedReflectance_TrueColor";
  const productInfo = useMemo(() => GIBS_PRODUCTS.find((p) => p.id === currentProduct), [currentProduct]);

  return (
    <div className="flex flex-col gap-2">
      <DateRow date={currentDate} onChange={(d) => setFilter("date", d)} />
      <div className="flex items-center gap-1.5">
        <Layers size={10} className="text-text-disabled flex-shrink-0" />
        <select
          value={currentProduct}
          onChange={(e) => setFilter("productId", e.target.value)}
          className="h-5 flex-1 bg-bg border border-border px-1.5 text-[9px] text-text-primary focus:border-accent focus:outline-none [color-scheme:dark] cursor-pointer"
        >
          {GIBS_PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <OpacityRow opacity={opacity} onChange={setOpacity} />
      <MetadataRow items={[productInfo?.resolution || "", `Zoom ${data?.maximumLevel || ""}`, productInfo?.format === "image/jpeg" ? "JPEG" : "PNG"]} />
    </div>
  );
}

function NightlightsControls({ data, filters, opacity, setFilter, setOpacity }: ControlProps) {
  const currentDate = (filters.date as string) || data?.time || yesterdayISO();
  return (
    <div className="flex flex-col gap-2">
      <DateRow date={currentDate} onChange={(d) => setFilter("date", d)} />
      <OpacityRow opacity={opacity} onChange={setOpacity} />
      <MetadataRow items={[data?.resolution || "500m", `Zoom ${data?.maximumLevel || 8}`, "PNG", "VIIRS Day/Night Band"]} />
    </div>
  );
}

function Sentinel2Controls({ data, filters, opacity, setFilter, setOpacity }: ControlProps) {
  const currentYear = (filters.year as number) || 2024;
  const years = useMemo(() => Array.from({ length: 2024 - 2016 + 1 }, (_, i) => 2024 - i), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Calendar size={10} className="text-text-disabled flex-shrink-0" />
        <select
          value={currentYear}
          onChange={(e) => setFilter("year", parseInt(e.target.value, 10))}
          className="h-5 flex-1 bg-bg border border-border px-1.5 font-mono text-[9px] text-text-primary focus:border-accent focus:outline-none [color-scheme:dark] cursor-pointer"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-[8px] text-text-disabled">Mosaic Year</span>
      </div>
      <OpacityRow opacity={opacity} onChange={setOpacity} />
      <MetadataRow items={[data?.resolution || "~10m", `Zoom ${data?.maximumLevel || 12}`, "JPEG", "Cloudless composite"]} />
    </div>
  );
}
