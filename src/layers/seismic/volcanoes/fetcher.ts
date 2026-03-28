export interface VolcanoData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  type: string;
  country: string;
  lastEruption: string;
  status: "Historical" | "Holocene" | "Pleistocene";
}

const NOAA_VOLCANOES_URL =
  "https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/volcanoes?maxRows=2000";

/**
 * Normalise the NOAA status string into one of the three known buckets.
 */
function normaliseStatus(
  raw: string | null | undefined
): VolcanoData["status"] {
  if (!raw) return "Holocene";
  const lower = raw.toLowerCase();
  if (lower.includes("historical")) return "Historical";
  if (lower.includes("pleistocene")) return "Pleistocene";
  return "Holocene";
}

export async function fetchVolcanoes(): Promise<VolcanoData[]> {
  const res = await fetch(NOAA_VOLCANOES_URL);
  if (!res.ok) throw new Error(`NOAA Volcanoes API error: ${res.status}`);

  const data = await res.json();
  const items: any[] = data.items ?? data;

  return items
    .filter(
      (v: any) =>
        v.latitude !== null &&
        v.latitude !== undefined &&
        v.longitude !== null &&
        v.longitude !== undefined
    )
    .map((v: any) => ({
      id: String(v.hazEventId ?? v.id ?? v.volcanoId ?? Math.random()),
      name: v.name ?? "Unknown",
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      elevation: Number(v.elevation ?? 0),
      type: v.morphology ?? v.type ?? "Unknown",
      country: v.country ?? "Unknown",
      lastEruption: v.lastKnownEruptionYear
        ? String(v.lastKnownEruptionYear)
        : "Unknown",
      status: normaliseStatus(v.status),
    }));
}
