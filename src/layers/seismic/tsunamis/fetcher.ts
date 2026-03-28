export interface TsunamiAlert {
  id: string;
  latitude: number;
  longitude: number;
  magnitude: number;
  location: string;
  time: number;
  alertLevel: "Warning" | "Watch" | "Advisory" | "Information";
  source: string;
}

const NOAA_TSUNAMIS_URL =
  "https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/tsunamis/events?maxRows=100&minYear=2020";

/**
 * Map the NOAA water-height / warning status to an alert level.
 */
function deriveAlertLevel(
  maxWaterHeight: number | null | undefined,
  warningStatus: string | null | undefined
): TsunamiAlert["alertLevel"] {
  if (warningStatus) {
    const lower = warningStatus.toLowerCase();
    if (lower.includes("warning")) return "Warning";
    if (lower.includes("watch")) return "Watch";
    if (lower.includes("advisory")) return "Advisory";
  }
  if (maxWaterHeight != null) {
    if (maxWaterHeight >= 3) return "Warning";
    if (maxWaterHeight >= 1) return "Watch";
    if (maxWaterHeight > 0) return "Advisory";
  }
  return "Information";
}

export async function fetchTsunamis(): Promise<TsunamiAlert[]> {
  const res = await fetch(NOAA_TSUNAMIS_URL);
  if (!res.ok) throw new Error(`NOAA Tsunamis API error: ${res.status}`);

  const data = await res.json();
  const items: any[] = data.items ?? data;

  return items
    .filter(
      (t: any) =>
        t.latitude !== null &&
        t.latitude !== undefined &&
        t.longitude !== null &&
        t.longitude !== undefined
    )
    .map((t: any) => {
      const year = t.year ?? 2020;
      const month = (t.month ?? 1) - 1;
      const day = t.day ?? 1;

      return {
        id: String(t.id ?? t.hazEventId ?? Math.random()),
        latitude: Number(t.latitude),
        longitude: Number(t.longitude),
        magnitude: Number(t.eqMagnitude ?? t.maxWaterHeight ?? 0),
        location: t.locationName ?? t.country ?? "Unknown",
        time: new Date(year, month, day).getTime(),
        alertLevel: deriveAlertLevel(t.maxWaterHeight, t.warningStatus),
        source: t.source ?? "NOAA NCEI",
      };
    });
}
