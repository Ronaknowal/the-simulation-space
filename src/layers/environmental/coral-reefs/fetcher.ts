export interface CoralReef {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  area: number;
  bleachingRisk: "low" | "medium" | "high" | "critical";
  country: string;
}

const NOAA_CRW_GAUGES_URL =
  "https://coralreefwatch.noaa.gov/product/vs/gauges/all_gauges.json";

/**
 * Map NOAA Coral Reef Watch alert level to a bleaching risk category.
 * Alert levels: 0 = No Stress, 1 = Watch, 2 = Warning, 3 = Alert Level 1, 4 = Alert Level 2
 */
function alertToBleachingRisk(
  alertLevel: number
): CoralReef["bleachingRisk"] {
  if (alertLevel >= 4) return "critical";
  if (alertLevel >= 3) return "high";
  if (alertLevel >= 2) return "medium";
  return "low";
}

/**
 * Fetch global coral reef gauge data from NOAA Coral Reef Watch.
 * Returns reef locations with bleaching risk derived from SST alerts.
 */
export async function fetchCoralReefs(): Promise<CoralReef[]> {
  try {
    const res = await fetch(NOAA_CRW_GAUGES_URL);
    if (!res.ok) throw new Error(`NOAA CRW API error: ${res.status}`);

    const data = await res.json();

    // The gauge data may be an object keyed by station ID or an array
    const entries = Array.isArray(data)
      ? data
      : Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          ...val,
        }));

    return entries
      .filter(
        (g: any) =>
          g.lat !== undefined &&
          g.lon !== undefined &&
          !Number.isNaN(Number(g.lat)) &&
          !Number.isNaN(Number(g.lon))
      )
      .map((g: any) => ({
        id: String(g.id ?? g.station_id ?? g.name ?? Math.random()),
        name: String(g.name ?? g.station_name ?? "Unknown Reef"),
        latitude: Number(g.lat),
        longitude: Number(g.lon),
        area: Number(g.area ?? 0),
        bleachingRisk: alertToBleachingRisk(
          Number(g.alert_level ?? g.alert ?? g.bleaching_alert ?? 0)
        ),
        country: String(g.country ?? g.region ?? "Unknown"),
      }));
  } catch {
    // CORS or network issues — return empty gracefully
    return [];
  }
}
