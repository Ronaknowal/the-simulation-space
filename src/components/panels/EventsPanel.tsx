"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import PanelContainer from "@/components/panels/PanelContainer";
import SituationCard from "@/components/panels/SituationCard";
import SituationDetail from "@/components/panels/SituationDetail";
import { useStore } from "@/store";

type TabView = "events" | "situations";

const severityClass: Record<"FLASH" | "PRIORITY" | "ROUTINE", string> = {
  FLASH: "text-negative font-bold",
  PRIORITY: "text-warning",
  ROUTINE: "text-positive",
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function EventsPanel() {
  const [activeTab, setActiveTab] = useState<TabView>("events");
  const alerts = useStore((s) => s.alerts);
  const situations = useStore((s) => s.situations);
  const activeSituationId = useStore((s) => s.activeSituationId);
  const setActiveSituation = useStore((s) => s.setActiveSituation);
  const createFromAlert = useStore((s) => s.createFromAlert);

  // Track which alert IDs have already been auto-converted to situations
  const processedAlertIds = useRef<Set<string>>(new Set());

  // Auto-create situations from FLASH alerts
  useEffect(() => {
    for (const alert of alerts) {
      if (
        alert.priority === "FLASH" &&
        !alert.dismissed &&
        !processedAlertIds.current.has(alert.id)
      ) {
        // Check if a situation already references this alert
        const alreadyLinked = Object.values(situations).some((s) =>
          s.relatedAlertIds.includes(alert.id)
        );
        if (!alreadyLinked) {
          processedAlertIds.current.add(alert.id);
          createFromAlert(alert);
        } else {
          processedAlertIds.current.add(alert.id);
        }
      }
    }
  }, [alerts, situations, createFromAlert]);

  const situationList = useMemo(
    () =>
      Object.values(situations).sort((a, b) => b.createdAt - a.createdAt),
    [situations]
  );

  const activeSituationCount = useMemo(
    () => situationList.filter((s) => s.status === "active").length,
    [situationList]
  );

  const displayAlerts = useMemo(() => {
    return alerts.filter((a) => !a.dismissed);
  }, [alerts]);

  // If a situation is selected, show the detail view
  if (activeSituationId) {
    return (
      <PanelContainer id="events" title="Situation Detail">
        <SituationDetail />
      </PanelContainer>
    );
  }

  const situationsBadge =
    activeSituationCount > 0 ? ` (${activeSituationCount})` : "";

  return (
    <PanelContainer
      id="events"
      title={`Events & Alerts${situationsBadge}`}
    >
      <div className="flex flex-col overflow-hidden h-full">
        {/* Tab toggle */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab("events")}
            className={`flex-1 text-[7px] uppercase tracking-widest py-1 transition-colors ${
              activeTab === "events"
                ? "text-accent border-b border-accent"
                : "text-text-disabled hover:text-text-tertiary"
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab("situations")}
            className={`flex-1 text-[7px] uppercase tracking-widest py-1 transition-colors ${
              activeTab === "situations"
                ? "text-accent border-b border-accent"
                : "text-text-disabled hover:text-text-tertiary"
            }`}
          >
            Situations{situationsBadge}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "events" ? (
            /* Event feed */
            <div>
              {displayAlerts.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 px-2 py-1 border-b border-border-subtle"
                >
                  <span
                    className={`text-[8px] uppercase tracking-widest shrink-0 ${severityClass[event.priority]}`}
                  >
                    {event.priority}
                  </span>
                  <span className="text-text-secondary text-[9px] flex-1 leading-snug">
                    {event.title}
                  </span>
                  <span className="text-text-disabled text-[8px] shrink-0">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              ))}
              {displayAlerts.length === 0 && (
                <div className="flex items-center justify-center py-4 text-text-disabled text-[8px] uppercase tracking-widest animate-pulse">
                  Awaiting intel feeds...
                </div>
              )}
            </div>
          ) : (
            /* Situations list */
            <div>
              {situationList.map((sit) => (
                <SituationCard
                  key={sit.id}
                  situation={sit}
                  isActive={activeSituationId === sit.id}
                  onClick={() => setActiveSituation(sit.id)}
                />
              ))}
              {situationList.length === 0 && (
                <div className="flex items-center justify-center py-4 text-text-disabled text-[8px] uppercase tracking-widest">
                  No situations — FLASH alerts auto-create situations
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PanelContainer>
  );
}

export default EventsPanel;
