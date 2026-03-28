"use client";

import CommandBar from "./CommandBar";
import MarketTicker from "./MarketTicker";
import StatusArea from "./StatusArea";

export function TopBar() {
  return (
    <header className="flex items-center gap-2 h-[34px] px-2.5 bg-surface border-b border-border flex-shrink-0">
      {/* Brand */}
      <span className="font-bold text-[10px] tracking-[2px] text-text-primary whitespace-nowrap">
        THE SIMULATION <em className="not-italic text-accent">SPACE</em>
      </span>

      {/* Divider */}
      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Command input */}
      <CommandBar />

      {/* Divider */}
      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Scrolling ticker */}
      <MarketTicker />

      {/* Divider */}
      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Status */}
      <StatusArea />
    </header>
  );
}

export default TopBar;
