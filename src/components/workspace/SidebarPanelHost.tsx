"use client";

import { X } from "lucide-react";
import { useStore } from "@/store";
import LayersSidebarPanel from "@/components/sidebar-panels/LayersSidebarPanel";
import AlertsSidebarPanel from "@/components/sidebar-panels/AlertsSidebarPanel";
import NewsSidebarPanel from "@/components/sidebar-panels/NewsSidebarPanel";
import SocialSidebarPanel from "@/components/sidebar-panels/SocialSidebarPanel";
import ShadersSidebarPanel from "@/components/sidebar-panels/ShadersSidebarPanel";
import RecordingSidebarPanel from "@/components/sidebar-panels/RecordingSidebarPanel";
import SettingsSidebarPanel from "@/components/sidebar-panels/SettingsSidebarPanel";

const PANEL_TITLES: Record<string, string> = {
  layers: "Layer Controls",
  alerts: "Alert Feed",
  news: "News & Media",
  social: "Social Intelligence",
  shaders: "Visual Effects",
  recording: "4D Recording",
  settings: "Settings",
};

const PANEL_COMPONENTS: Record<string, React.ComponentType> = {
  layers: LayersSidebarPanel,
  alerts: AlertsSidebarPanel,
  news: NewsSidebarPanel,
  social: SocialSidebarPanel,
  shaders: ShadersSidebarPanel,
  recording: RecordingSidebarPanel,
  settings: SettingsSidebarPanel,
};

export default function SidebarPanelHost() {
  const activeSidebarPanel = useStore((s) => s.activeSidebarPanel);
  const setActiveSidebarPanel = useStore((s) => s.setActiveSidebarPanel);

  if (!activeSidebarPanel) return null;

  const PanelComponent = PANEL_COMPONENTS[activeSidebarPanel];
  const title = PANEL_TITLES[activeSidebarPanel] || activeSidebarPanel;

  if (!PanelComponent) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[320px] bg-surface border-l border-border z-40 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[9px] uppercase tracking-widest text-accent font-bold">
          {title}
        </span>
        <button
          onClick={() => setActiveSidebarPanel(null)}
          className="text-text-disabled hover:text-text-secondary transition-colors"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        <PanelComponent />
      </div>
    </div>
  );
}
