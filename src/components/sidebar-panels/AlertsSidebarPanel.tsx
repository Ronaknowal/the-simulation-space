"use client";

import { useMemo } from "react";
import { useStore } from "@/store";
import { MapPin, Trash2 } from "lucide-react";

const priorityClass: Record<string, string> = {
  FLASH: "text-negative font-bold",
  PRIORITY: "text-warning",
  ROUTINE: "text-positive",
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsSidebarPanel() {
  const alerts = useStore((s) => s.alerts);
  const dismissAlert = useStore((s) => s.dismissAlert);
  const clearDismissed = useStore((s) => s.clearDismissed);
  const setFlyToTarget = useStore((s) => s.setFlyToTarget);
  const setActiveModule = useStore((s) => s.setActiveModule);

  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.dismissed),
    [alerts]
  );

  const dismissedCount = alerts.length - activeAlerts.length;

  return (
    <div className="flex flex-col">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle text-[8px] text-text-disabled uppercase tracking-widest">
        <span>{activeAlerts.length} active</span>
        {dismissedCount > 0 && (
          <button
            onClick={clearDismissed}
            className="text-text-disabled hover:text-accent transition-colors"
          >
            Clear {dismissedCount} dismissed
          </button>
        )}
      </div>

      {/* Alert list */}
      {activeAlerts.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-text-disabled text-[9px] uppercase tracking-widest animate-pulse">
          Awaiting alerts...
        </div>
      ) : (
        activeAlerts.map((alert) => (
          <div
            key={alert.id}
            className="px-3 py-2 border-b border-border-subtle hover:bg-surface transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className={`text-[8px] uppercase tracking-widest shrink-0 ${priorityClass[alert.priority] || "text-text-disabled"}`}>
                {alert.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-text-primary leading-snug">{alert.title}</p>
                {alert.body && (
                  <p className="text-[8px] text-text-disabled mt-0.5 line-clamp-2">{alert.body}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[7px] text-text-disabled">{alert.source}</span>
                  <span className="text-[7px] text-text-disabled">{timeAgo(alert.timestamp)}</span>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 mt-1.5 pl-10">
              {alert.lat != null && alert.lng != null && (
                <button
                  onClick={() => {
                    setFlyToTarget({ lat: alert.lat!, lng: alert.lng! });
                    setActiveModule("globe");
                  }}
                  className="text-[7px] text-accent hover:text-accent/80 flex items-center gap-0.5"
                >
                  <MapPin size={8} /> FLY TO
                </button>
              )}
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-[7px] text-text-disabled hover:text-negative flex items-center gap-0.5"
              >
                <Trash2 size={8} /> DISMISS
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
