export interface WindPoint {
  longitude: number;
  latitude: number;
  windSpeed: number;   // m/s
  windDirection: number; // degrees (meteorological: 0=N, 90=E)
  /** Cartesian wind components (m/s) */
  u: number; // east-west component (positive = from west)
  v: number; // north-south component (positive = from south)
}

/**
 * Grid spacing in degrees. 8° gives ~900 points — enough for a visual
 * wind field while staying well within Open-Meteo's free-tier rate limits.
 * (5° was ~2400 points and caused rate-limiting on many batches.)
 */
const GRID_STEP = 8;

/**
 * Fetch global wind data from Open-Meteo API.
 * Queries a grid of points and returns wind speed/direction/components.
 *
 * Open-Meteo free tier: 10,000 calls/day, but aggressive concurrent requests
 * get rate-limited. We use larger batches (200 coords) with sequential
 * processing + small delays to ensure all batches succeed.
 */
export async function fetchWindData(): Promise<WindPoint[]> {
  // Build grid of lat/lon points
  const lats: number[] = [];
  const lons: number[] = [];
  for (let lat = -80; lat <= 80; lat += GRID_STEP) {
    for (let lon = -180; lon < 180; lon += GRID_STEP) {
      lats.push(lat);
      lons.push(lon);
    }
  }

  // Open-Meteo supports up to ~300 coords per request
  // (URL length ~8000 chars max, each pair ≈15 chars → ~500 max)
  const BATCH_SIZE = 200;
  const windPoints: WindPoint[] = [];
  const batches = Math.ceil(lats.length / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const start = b * BATCH_SIZE;
    const batchLats = lats.slice(start, start + BATCH_SIZE);
    const batchLons = lons.slice(start, start + BATCH_SIZE);

    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${batchLats.join(",")}&` +
      `longitude=${batchLons.join(",")}&` +
      `current=wind_speed_10m,wind_direction_10m`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`[Wind] Batch ${b}/${batches} failed: ${resp.status}`);
        continue;
      }
      const data = await resp.json();

      // Open-Meteo returns array of results when multiple coords
      const results = Array.isArray(data) ? data : [data];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r?.current) continue;

        const speed = r.current.wind_speed_10m || 0;
        const dir = r.current.wind_direction_10m || 0;

        // Convert meteorological wind direction to u/v components
        const dirRad = (dir * Math.PI) / 180;
        const u = -speed * Math.sin(dirRad);
        const v = -speed * Math.cos(dirRad);

        windPoints.push({
          longitude: batchLons[i],
          latitude: batchLats[i],
          windSpeed: speed,
          windDirection: dir,
          u,
          v,
        });
      }
    } catch {
      console.warn(`[Wind] Batch ${b}/${batches} error`);
    }

    // Small delay between batches to avoid rate-limiting
    if (b < batches - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return windPoints;
}
