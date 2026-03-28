"use client";

import { useStore } from "@/store";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import Timeline from "./Timeline";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function WorkspaceShell() {
  const activeModule = useStore((s) => s.activeModule);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary name={activeModule}>
            {activeModule === "pulse" && <PulseModulePlaceholder />}
            {activeModule === "globe" && <ModulePlaceholder name="GLOBE" phase={2} />}
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

function PulseModulePlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-accent text-xs uppercase tracking-widest">PULSE DASHBOARD</p>
        <p className="text-text-disabled text-[9px] mt-1">Dashboard grid coming in Task 7</p>
      </div>
    </div>
  );
}
