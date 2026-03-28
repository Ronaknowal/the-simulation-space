"use client";

import PanelContainer from "@/components/panels/PanelContainer";

const MOCK_EVENTS = [
  { id: "1", severity: "FLASH" as const, text: "M6.2 earthquake off Japan coast", time: "2m" },
  { id: "2", severity: "PRIORITY" as const, text: "EU announces chip export controls", time: "14m" },
  { id: "3", severity: "ROUTINE" as const, text: "Fed governor speech scheduled", time: "1h" },
  { id: "4", severity: "PRIORITY" as const, text: "Suez Canal traffic delayed 12hrs", time: "2h" },
  { id: "5", severity: "FLASH" as const, text: "Taiwan strait military tension", time: "3h" },
  { id: "6", severity: "ROUTINE" as const, text: "BLS CPI release 8:30am EST", time: "5h" },
];

const severityClass: Record<"FLASH" | "PRIORITY" | "ROUTINE", string> = {
  FLASH: "text-negative font-bold",
  PRIORITY: "text-warning",
  ROUTINE: "text-positive",
};

export function EventsPanel() {
  return (
    <PanelContainer id="events" title="Events & Alerts">
      <div className="overflow-y-auto h-full">
        {MOCK_EVENTS.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-2 px-2 py-1 border-b border-border-subtle"
          >
            <span className={`text-[8px] uppercase tracking-widest shrink-0 ${severityClass[event.severity]}`}>
              {event.severity}
            </span>
            <span className="text-text-secondary text-[9px] flex-1 leading-snug">{event.text}</span>
            <span className="text-text-disabled text-[8px] shrink-0">{event.time}</span>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
}

export default EventsPanel;
