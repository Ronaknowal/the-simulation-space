"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/store";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import Timeline from "./Timeline";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import PulseModule from "@/components/modules/pulse/PulseModule";

const GlobeModule = dynamic(
  () => import("@/components/modules/globe/GlobeModule"),
  { ssr: false },
);

export default function WorkspaceShell() {
  const activeModule = useStore((s) => s.activeModule);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary name={activeModule}>
            {activeModule === "pulse" && <PulseModule />}
            {activeModule === "globe" && <GlobeModule />}
            {activeModule === "terminal" && <ModulePlaceholder name="TERMINAL" phase={2} />}
            {activeModule === "simulation" && <ModulePlaceholder name="SIMULATION" phase={3} />}
          </ErrorBoundary>
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
