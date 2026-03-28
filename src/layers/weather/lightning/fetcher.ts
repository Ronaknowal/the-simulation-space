import { proxyFetch } from "@/lib/proxy-fetch";

export interface LightningStrike {
  latitude: number;
  longitude: number;
  time: number;       // Unix timestamp in milliseconds
  polarity: number;   // Polarity of the strike (positive/negative)
}

const BLITZORTUNG_STRIKES =
  "https://map.blitzortung.org/GEOjson/Data/Strikes/recent_strikes.json";

/**
 * Fetches recent lightning strike data.
 *
 * Primary: Blitzortung GeoJSON (if available).
 * Fallback: Open-Meteo thunderstorm detection — queries a global grid for
 * locations with WMO weather codes 95/96/99 (thunderstorm, with hail).
 * This doesn't give exact strike locations but indicates active thunderstorm
 * regions, which is much better than showing nothing.
 */
export async function fetchLightningStrikes(): Promise<LightningStrike[]> {
  // Try Blitzortung first
  try {
    const res = await proxyFetch(BLITZORTUNG_STRIKES);
    if (res.ok) {
      const data = await res.json();

      // Blitzortung GeoJSON format: FeatureCollection with Point features
      if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
        const strikes = data.features
          .filter(
            (f: any) =>
              f.geometry?.type === "Point" &&
              Array.isArray(f.geometry.coordinates)
          )
          .map((f: any) => ({
            longitude: f.geometry.coordinates[0],
            latitude: f.geometry.coordinates[1],
            time: f.properties?.time ?? Date.now(),
            polarity: f.properties?.polarity ?? 0,
          }));
        if (strikes.length > 0) return strikes;
      }

      // Alternative: plain array format [lon, lat, time, polarity]
      if (Array.isArray(data) && data.length > 0) {
        return data
          .filter((s: any) => Array.isArray(s) && s.length >= 3)
          .map((s: any) => ({
            longitude: s[0],
            latitude: s[1],
            time: s[2] * 1000,
            polarity: s[3] ?? 0,
          }));
      }
    }
  } catch {
    // Blitzortung unavailable — try fallback
  }

  // Fallback: Open-Meteo thunderstorm detection
  return fetchThunderstormRegions();
}

/**
 * Grid step for thunderstorm detection (degrees).
 * 5° gives ~2600 points; we look for WMO codes 95/96/99.
 */
const THUNDER_GRID_STEP = 5;

/**
 * Fetches current weather from Open-Meteo on a global grid and returns
 * locations where thunderstorms are active (WMO codes 95, 96, 99).
 *
 * Each thunderstorm location generates 3-8 synthetic "strikes" scattered
 * within the grid cell to give a visual impression of storm activity.
 */
async function fetchThunderstormRegions(): Promise<LightningStrike[]> {
  const lats: number[] = [];
  const lons: number[] = [];
  for (let lat = -60; lat <= 60; lat += THUNDER_GRID_STEP) {
    for (let lon = -180; lon < 180; lon += THUNDER_GRID_STEP) {
      lats.push(lat);
      lons.push(lon);
    }
  }

  const strikes: LightningStrike[] = [];
  const BATCH_SIZE = 80;
  const batches = Math.ceil(lats.length / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const start = b * BATCH_SIZE;
    const batchLats = lats.slice(start, start + BATCH_SIZE);
    const batchLons = lons.slice(start, start + BATCH_SIZE);

    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${batchLats.join(",")}&` +
      `longitude=${batchLons.join(",")}&` +
      `current=weather_code`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      const results = Array.isArray(data) ? data : [data];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r?.current) continue;

        const code = r.current.weather_code;
        // WMO codes: 95 = thunderstorm, 96 = thunderstorm with hail,
        // 99 = severe thunderstorm with hail
        if (code !== 95 && code !== 96 && code !== 99) continue;

        const baseLat = r.latitude ?? batchLats[i];
        const baseLon = r.longitude ?? batchLons[i];

        // Generate multiple synthetic strikes within the grid cell
        // to visualize the storm region (more for severe storms)
        const numStrikes = code === 99 ? 8 : code === 96 ? 5 : 3;
        const now = Date.now();

        for (let s = 0; s < numStrikes; s++) {
          // Random scatter within ±2.5° of center
          const offsetLat = (Math.random() - 0.5) * THUNDER_GRID_STEP;
          const offsetLon = (Math.random() - 0.5) * THUNDER_GRID_STEP;

          strikes.push({
            latitude: baseLat + offsetLat,
            longitude: baseLon + offsetLon,
            time: now - Math.random() * 300_000, // Within last 5 minutes
            polarity: Math.random() > 0.5 ? 1 : -1,
          });
        }
      }
    } catch {
      // Skip failed batches
    }
  }

  return strikes;
}
