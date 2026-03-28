export interface AuroraData {
  latitude: number;
  longitude: number;
  probability: number; // 0-100
}

const NOAA_AURORA_URL =
  "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

/**
 * Fetches NOAA SWPC Ovation Aurora forecast.
 * Returns an array of lat/lon points with aurora probability (0-100).
 * Points with probability < 5 are filtered out to reduce data volume.
 */
export async function fetchAuroraForecast(): Promise<AuroraData[]> {
  const res = await fetch(NOAA_AURORA_URL);
  if (!res.ok) throw new Error(`NOAA Aurora API error: ${res.status}`);

  const data: Array<{ Longitude: number; Latitude: number; Aurora: number }> =
    await res.json();

  return data
    .filter((d) => d.Aurora >= 5)
    .map((d) => ({
      longitude: d.Longitude > 180 ? d.Longitude - 360 : d.Longitude,
      latitude: d.Latitude,
      probability: d.Aurora,
    }));
}
