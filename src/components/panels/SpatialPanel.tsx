"use client";

import dynamic from "next/dynamic";
import PanelContainer from "@/components/panels/PanelContainer";
import { useStore } from "@/store";

const MiniGlobe = dynamic(() => import("./MiniGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-bg flex items-center justify-center">
      <span className="text-text-disabled text-[8px]">Loading globe...</span>
    </div>
  ),
});

export default function SpatialPanel() {
  const setActiveModule = useStore((s) => s.setActiveModule);
  const layers = useStore((s) => s.layers);

  const enabledCount = Object.values(layers).filter((l) => l.enabled).length;
  const entityCount = Object.values(layers)
    .filter((l) => l.enabled && l.data)
    .reduce((sum, l) => {
      const d = l.data;
      if (Array.isArray(d)) return sum + d.length;
      if (d && typeof d === "object" && "features" in d)
        return sum + ((d as any).features?.length ?? 0);
      return sum;
    }, 0);

  return (
    <PanelContainer
      id="spatial"
      title="Spatial Overview"
      expandLabel="FULL GLOBE"
      onExpand={() => setActiveModule("globe")}
      className="h-full"
    >
      <div className="relative w-full h-full min-h-[120px]">
        <MiniGlobe />
        {/* Overlay stats */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-bg/60 px-3 py-2">
            <div className="text-accent text-[10px] font-bold">
              {entityCount > 0 ? entityCount.toLocaleString() : "—"}
            </div>
            <div className="text-text-disabled text-[8px]">entities tracked</div>
            <div className="text-text-disabled text-[8px]">{enabledCount} layers active</div>
          </div>
        </div>
      </div>
    </PanelContainer>
  );
}
