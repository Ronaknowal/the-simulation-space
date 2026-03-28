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

  return (
    <PanelContainer
      id="spatial"
      title="Spatial Overview"
      expandLabel="FULL GLOBE"
      onExpand={() => setActiveModule("globe")}
      className="h-full"
    >
      <div className="w-full h-full min-h-[120px] overflow-hidden">
        <MiniGlobe />
      </div>
    </PanelContainer>
  );
}
