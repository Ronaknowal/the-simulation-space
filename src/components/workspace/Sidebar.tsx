"use client";

import {
  LayoutDashboard,
  Globe,
  DollarSign,
  Zap,
  Layers,
  AlertTriangle,
  Newspaper,
  MessageSquare,
  Sparkles,
  Circle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "@/store";
import type { ModuleId } from "@/types/store";

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

type SidebarEntry = SidebarItem | "separator";

const MODULE_IDS: ReadonlySet<string> = new Set(["pulse", "globe", "terminal", "simulation"]);
const PANEL_IDS: ReadonlySet<string> = new Set(["layers", "alerts", "news", "social", "shaders", "recording", "settings"]);

const SIDEBAR_ITEMS: readonly SidebarEntry[] = [
  { id: "pulse", label: "PULSE", icon: LayoutDashboard },
  { id: "globe", label: "GLOBE", icon: Globe },
  { id: "terminal", label: "TERM", icon: DollarSign },
  { id: "simulation", label: "SIM", icon: Zap },
  "separator",
  { id: "layers", label: "LAYERS", icon: Layers },
  { id: "alerts", label: "ALERTS", icon: AlertTriangle },
  { id: "news", label: "NEWS", icon: Newspaper },
  { id: "social", label: "SOCIAL", icon: MessageSquare },
  "separator",
  { id: "shaders", label: "SHADE", icon: Sparkles },
  { id: "recording", label: "REC", icon: Circle },
  { id: "settings", label: "SET", icon: Settings },
] as const;

export function Sidebar() {
  const activeModule = useStore((s) => s.activeModule);
  const setActiveModule = useStore((s) => s.setActiveModule);
  const activeSidebarPanel = useStore((s) => s.activeSidebarPanel);
  const setActiveSidebarPanel = useStore((s) => s.setActiveSidebarPanel);

  return (
    <nav className="flex flex-col w-12 bg-surface border-r border-border flex-shrink-0 overflow-y-auto">
      {SIDEBAR_ITEMS.map((entry, idx) => {
        if (entry === "separator") {
          return (
            <div
              key={`sep-${idx}`}
              className="mx-1.5 my-[3px] h-px bg-border-subtle flex-shrink-0"
            />
          );
        }

        const isModule = MODULE_IDS.has(entry.id);
        const isPanel = PANEL_IDS.has(entry.id);
        const isActiveModule = isModule && activeModule === entry.id;
        const isActivePanel = isPanel && activeSidebarPanel === entry.id;
        const Icon = entry.icon;

        return (
          <button
            key={entry.id}
            onClick={() => {
              if (isModule) {
                setActiveModule(entry.id as ModuleId);
                setActiveSidebarPanel(null); // close any open panel
              } else if (isPanel) {
                // Toggle: clicking again closes the panel
                setActiveSidebarPanel(activeSidebarPanel === entry.id ? null : entry.id);
              }
            }}
            className={[
              "flex flex-col items-center justify-center h-[38px] w-full flex-shrink-0 transition-colors cursor-pointer",
              isActiveModule
                ? "text-accent bg-accent-subtle border-l-2 border-accent"
                : isActivePanel
                ? "text-accent border-l-2 border-accent"
                : "text-text-disabled border-l-2 border-transparent hover:text-accent",
            ].join(" ")}
            title={entry.label}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span className="text-[7px] tracking-wider mt-0.5 leading-none">
              {entry.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default Sidebar;
