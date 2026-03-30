"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/store";
import TopBar from "./TopBar";
import TabBar from "./TabBar";
import Sidebar from "./Sidebar";
import Timeline from "./Timeline";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import PulseModule from "@/components/modules/pulse/PulseModule";
import EntityDetailPanel from "@/components/panels/EntityDetailPanel";
import SidebarPanelHost from "./SidebarPanelHost";
import { useDataBootstrap } from "@/hooks/useDataBootstrap";
import { useMarketDataBridge } from "@/hooks/useMarketDataBridge";
import { useAlertEngine } from "@/hooks/useAlertEngine";

const GlobeModule = dynamic(
  () => import("@/components/modules/globe/GlobeModule"),
  { ssr: false },
);

const TerminalModule = dynamic(
  () => import("@/components/modules/terminal/TerminalModule"),
  { ssr: false, loading: () => <ModulePlaceholder name="TERMINAL" phase={2} /> }
);

const SimulationModule = dynamic(
  () => import("@/components/modules/simulation/SimulationModule"),
  { ssr: false, loading: () => <ModulePlaceholder name="SIMULATION" phase={3} /> }
);

const LayerManager = dynamic(
  () => import("@/components/globe/LayerManager"),
  { ssr: false },
);

export default function WorkspaceShell() {
  const activeModule = useStore((s) => s.activeModule);

  // Bootstrap background data layers + bridge market data + alert engine
  useDataBootstrap();
  useMarketDataBridge();
  useAlertEngine();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Background layer controllers — always mounted */}
      <LayerManager />
      <TopBar />
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          <ErrorBoundary name={activeModule}>
            {activeModule === "pulse" && <PulseModule />}
            {activeModule === "globe" && <GlobeModule />}
            {activeModule === "terminal" && <TerminalModule />}
            {activeModule === "simulation" && <SimulationModule />}
          </ErrorBoundary>
          <EntityDetailPanel />
          <SidebarPanelHost />
        </main>
      </div>
      <Timeline />
    </div>
  );
}

function ModulePlaceholder({ name, phase }: { name: string; phase: number }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-text-disabled text-xs uppercase tracking-widest">{name} MODULE</p>
        <p className="text-text-disabled text-[9px] mt-1">Coming in Phase {phase}</p>
      </div>
    </div>
  );
}
