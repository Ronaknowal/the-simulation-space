export interface TimelineEvent {
  id: string;
  timestamp: number; // Unix ms
  longitude: number;
  latitude: number;
  type: "earthquake" | "conflict" | "wildfire" | "news";
  magnitude?: number;
  title: string;
  description: string;
}

/**
 * Fetch historical events from USGS (earthquakes) for the past 30 days.
 * This serves as the primary data source for timeline replay.
 *
 * Future enhancement: aggregate data from multiple APIs
 * (GDELT, ACLED, NASA FIRMS) for richer temporal visualization.
 */
export async function fetchTimelineEvents(): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // Fetch 30-day earthquake history from USGS (significant events)
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson"
    );
    if (res.ok) {
      const data = await res.json();
      for (const feature of data.features || []) {
        const props = feature.properties;
        const coords = feature.geometry?.coordinates;
        if (!coords) continue;

        events.push({
          id: `eq-${feature.id}`,
          timestamp: props.time,
          longitude: coords[0],
          latitude: coords[1],
          type: "earthquake",
          magnitude: props.mag,
          title: props.title || `M${props.mag} Earthquake`,
          description: props.place || "",
        });
      }
    }
  } catch {
    // Skip on error
  }

  // Sort chronologically
  events.sort((a, b) => a.timestamp - b.timestamp);

  return events;
}
