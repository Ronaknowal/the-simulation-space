"use client";

import PanelContainer from "@/components/panels/PanelContainer";
import { useStore } from "@/store";

export function SpatialPanel() {
  const setActiveModule = useStore((s) => s.setActiveModule);

  return (
    <PanelContainer
      id="spatial"
      title="Spatial Overview"
      expandLabel="FULL GLOBE"
      onExpand={() => setActiveModule("globe")}
    >
      <div
        className="relative h-full w-full flex items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at 48% 55%, #0d1520 0%, #06090d 75%)",
        }}
      >
        {/* Globe wireframe circle */}
        <div
          className="absolute"
          style={{
            width: "60%",
            paddingBottom: "60%",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(74,158,186,0.08)",
            borderRadius: "50%",
          }}
        />
        {/* Center text */}
        <div className="relative z-10 flex flex-col items-center gap-0.5">
          <span className="text-accent text-[10px] font-mono">12,847</span>
          <span className="text-text-disabled text-[8px] uppercase tracking-widest">entities tracked</span>
          <span className="text-text-disabled text-[8px] uppercase tracking-widest">8 layers active</span>
        </div>
      </div>
    </PanelContainer>
  );
}

export default SpatialPanel;
