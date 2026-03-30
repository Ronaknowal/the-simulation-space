"use client";

import { useStore } from "@/store";
import { Trash2, Eye, EyeOff, MapPin } from "lucide-react";

export default function SettingsSidebarPanel() {
  const performanceMonitorVisible = useStore((s) => s.performanceMonitorVisible);
  const togglePerformanceMonitor = useStore((s) => s.togglePerformanceMonitor);
  const bookmarks = useStore((s) => s.bookmarks);
  const removeBookmark = useStore((s) => s.removeBookmark);
  const setFlyToTarget = useStore((s) => s.setFlyToTarget);
  const setActiveModule = useStore((s) => s.setActiveModule);

  return (
    <div className="flex flex-col">
      {/* Display settings */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <span className="text-[8px] text-text-disabled uppercase tracking-widest">Display</span>
        <div className="mt-1.5 flex flex-col gap-1">
          <button
            onClick={togglePerformanceMonitor}
            className="flex items-center justify-between w-full px-2 py-1 hover:bg-surface transition-colors text-[9px]"
          >
            <span className="text-text-secondary">Performance Monitor</span>
            {performanceMonitorVisible ? (
              <Eye size={12} className="text-accent" />
            ) : (
              <EyeOff size={12} className="text-text-disabled" />
            )}
          </button>
        </div>
      </div>

      {/* Camera bookmarks */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <span className="text-[8px] text-text-disabled uppercase tracking-widest">
          Camera Bookmarks ({bookmarks.length})
        </span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-text-disabled text-[8px] uppercase tracking-widest">
          No bookmarks saved
        </div>
      ) : (
        bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="px-3 py-1.5 border-b border-border-subtle hover:bg-surface transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-primary flex-1 truncate">{bm.name}</span>
              <button
                onClick={() => {
                  setFlyToTarget({ lat: bm.latitude, lng: bm.longitude, alt: bm.altitude });
                  setActiveModule("globe");
                }}
                className="text-accent hover:text-accent/70"
                title="Fly to"
              >
                <MapPin size={10} />
              </button>
              <button
                onClick={() => removeBookmark(bm.id)}
                className="text-text-disabled hover:text-negative"
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
            </div>
            <span className="text-[7px] text-text-disabled">
              {bm.latitude.toFixed(2)}°, {bm.longitude.toFixed(2)}° @ {(bm.altitude / 1_000_000).toFixed(1)}Mm
            </span>
          </div>
        ))
      )}

      {/* About */}
      <div className="px-3 py-3">
        <div className="text-[8px] text-text-disabled leading-relaxed">
          <p className="font-bold text-accent mb-1">THE SIMULATION SPACE</p>
          <p>Intelligence & Simulation Platform</p>
          <p className="mt-1">55 data layers · 40+ API integrations</p>
          <p>CesiumJS + deck.gl + Next.js 15</p>
        </div>
      </div>
    </div>
  );
}
