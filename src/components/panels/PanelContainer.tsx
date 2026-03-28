"use client";

import { type ReactNode } from "react";
import { useStore } from "@/store";

interface PanelContainerProps {
  id: string;
  title: string;
  expandLabel?: string;
  onExpand?: () => void;
  children: ReactNode;
  className?: string;
}

export function PanelContainer({
  id,
  title,
  expandLabel = "EXPAND",
  onExpand,
  children,
  className,
}: PanelContainerProps) {
  const expandedPanel = useStore((s) => s.expandedPanel);
  const setExpandedPanel = useStore((s) => s.setExpandedPanel);

  const isExpanded = expandedPanel === id;

  const handleToggle = () => {
    setExpandedPanel(isExpanded ? null : id);
    onExpand?.();
  };

  return (
    <div className={`flex flex-col overflow-hidden${className ? ` ${className}` : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 flex-shrink-0">
        <span className="text-[8px] uppercase tracking-widest text-text-disabled">
          {title}
        </span>
        <button
          onClick={handleToggle}
          className="text-[7px] uppercase tracking-widest text-text-disabled border border-border px-1.5 py-0.5 hover:text-accent hover:border-accent transition-colors"
        >
          {isExpanded ? "MINIMIZE" : expandLabel}
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default PanelContainer;
