"use client";

import { useStore } from "@/store";
import type { WorkspaceTab } from "@/store/slices/tabs";
import { X } from "lucide-react";

export default function TabBar() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const removeTab = useStore((s) => s.removeTab);

  if (tabs.length === 0) return null;

  return (
    <div className="h-[28px] bg-surface border-b border-border flex items-center px-1 gap-0.5 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`flex items-center gap-1.5 px-2.5 h-[24px] text-[9px] border border-transparent whitespace-nowrap group transition-colors ${
            activeTabId === tab.id
              ? "text-accent bg-accent-subtle border-border"
              : "text-text-disabled hover:text-text-secondary"
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          <TypeIcon type={tab.type} />
          <span className="max-w-[120px] truncate">{tab.label}</span>
          <span
            className="opacity-0 group-hover:opacity-100 hover:text-negative transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              removeTab(tab.id);
            }}
          >
            <X size={10} />
          </span>
        </button>
      ))}
    </div>
  );
}

function TypeIcon({ type }: { type: WorkspaceTab["type"] }) {
  const colors = {
    simulation: "bg-accent",
    situation: "bg-negative",
    analysis: "bg-warning",
    default: "bg-text-disabled",
  };
  return <span className={`w-1.5 h-1.5 ${colors[type]}`} />;
}
