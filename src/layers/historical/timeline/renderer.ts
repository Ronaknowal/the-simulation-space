import { ScatterplotLayer } from "@deck.gl/layers";
import type { TimelineEvent } from "./fetcher";

/**
 * Maps event type to a color.
 */
function eventTypeToColor(type: string): [number, number, number, number] {
  switch (type) {
    case "earthquake": return [239, 68, 68, 220];    // Red
    case "conflict":   return [249, 115, 22, 220];   // Orange
    case "wildfire":   return [234, 179, 8, 220];    // Amber
    case "news":       return [59, 130, 246, 220];   // Blue
    default:           return [148, 163, 184, 200];  // Gray
  }
}

function eventToRadius(event: TimelineEvent): number {
  if (event.type === "earthquake" && event.magnitude) {
    return Math.pow(2, event.magnitude) * 500;
  }
  return 5000;
}

/**
 * Creates a deck.gl layer for historical timeline events.
 * Events are shown as colored dots with size proportional to magnitude.
 */
export function createTimelineLayer(
  data: TimelineEvent[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  // Filter by current time range if timeline scrubber is active
  const startTime = filters.startTime as number | undefined;
  const endTime = filters.endTime as number | undefined;

  let filtered = data;
  if (startTime != null && endTime != null) {
    filtered = data.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  return new ScatterplotLayer<TimelineEvent>({
    id: "historical-timeline",
    data: filtered,
    pickable: true,
    opacity,
    filled: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 15,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => eventToRadius(d),
    getFillColor: (d) => eventTypeToColor(d.type),
    getLineColor: [255, 255, 255, 100],
    getLineWidth: 1,
    stroked: true,
    lineWidthMinPixels: 1,
    updateTriggers: {
      getRadius: [filters],
      getFillColor: [filters],
    },
  });
}
