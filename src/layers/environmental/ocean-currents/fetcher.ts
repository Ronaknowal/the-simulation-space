export interface OceanCurrentPoint {
  latitude: number;
  longitude: number;
  u: number;
  v: number;
  speed: number;
}

/**
 * Ocean grid points covering major ocean areas at ~10° spacing.
 * Hand-curated to avoid land masses.
 */
const OCEAN_GRID: [number, number][] = (() => {
  const points: [number, number][] = [];

  // Simple land mask: returns true if the point is likely over ocean.
  // Uses crude rectangular bounding boxes of major land masses.
  function isOcean(lat: number, lon: number): boolean {
    // North America
    if (lat >= 25 && lat <= 70 && lon >= -130 && lon <= -60) return false;
    // Central America
    if (lat >= 7 && lat <= 25 && lon >= -120 && lon <= -75) return false;
    // South America
    if (lat >= -55 && lat <= 12 && lon >= -82 && lon <= -35) return false;
    // Europe
    if (lat >= 36 && lat <= 70 && lon >= -10 && lon <= 40) return false;
    // Africa
    if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) return false;
    // Middle East
    if (lat >= 12 && lat <= 42 && lon >= 40 && lon <= 60) return false;
    // Russia / Central Asia
    if (lat >= 42 && lat <= 75 && lon >= 40 && lon <= 180) return false;
    // India
    if (lat >= 8 && lat <= 35 && lon >= 68 && lon <= 90) return false;
    // Southeast Asia
    if (lat >= -10 && lat <= 25 && lon >= 95 && lon <= 120) return false;
    // China / East Asia
    if (lat >= 18 && lat <= 55 && lon >= 100 && lon <= 135) return false;
    // Australia
    if (lat >= -40 && lat <= -10 && lon >= 115 && lon <= 155) return false;
    // Antarctica
    if (lat <= -70) return false;
    // Greenland
    if (lat >= 60 && lat <= 84 && lon >= -55 && lon <= -15) return false;
    return true;
  }

  for (let lat = -70; lat <= 70; lat += 10) {
    for (let lon = -180; lon < 180; lon += 10) {
      if (isOcean(lat, lon)) {
        points.push([lat, lon]);
      }
    }
  }
  return points;
})();

/** Batch size for Open-Meteo multi-coordinate requests. */
const BATCH_SIZE = 50;
/** Max concurrent batches to avoid overloading the API. */
const CONCURRENCY = 4;

/**
 * Fetch ocean surface current approximation using Open-Meteo wind data.
 *
 * Uses 10m wind speed and direction at ocean grid points as a proxy for
 * surface wind-driven currents (Ekman transport). Real ocean current data
 * (OSCAR/HYCOM) requires OPeNDAP parsing; this provides a good real-time
 * approximation using the same Open-Meteo API as the wind-particles layer.
 *
 * Surface currents are approximately 2-3% of wind speed (Ekman theory),
 * deflected 45° to the right in NH and left in SH.
 */
export async function fetchOceanCurrents(): Promise<OceanCurrentPoint[]> {
  try {
    const lats = OCEAN_GRID.map((p) => p[0]);
    const lons = OCEAN_GRID.map((p) => p[1]);

    const results: OceanCurrentPoint[] = [];
    const totalBatches = Math.ceil(lats.length / BATCH_SIZE);

    async function processBatch(batchIdx: number): Promise<void> {
      const start = batchIdx * BATCH_SIZE;
      const batchLats = lats.slice(start, start + BATCH_SIZE);
      const batchLons = lons.slice(start, start + BATCH_SIZE);

      const url =
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${batchLats.join(",")}&` +
        `longitude=${batchLons.join(",")}&` +
        `current=wind_speed_10m,wind_direction_10m`;

      try {
        const resp = await fetch(url);
        if (!resp.ok) return;
        const data = await resp.json();

        const items = Array.isArray(data) ? data : [data];
        for (let i = 0; i < items.length; i++) {
          const r = items[i];
          if (!r?.current) continue;

          const windSpeed = r.current.wind_speed_10m || 0;
          const windDir = r.current.wind_direction_10m || 0;

          // Convert wind to approximate surface current:
          // - Speed: ~2.5% of wind speed (Ekman surface current)
          // - Direction: deflected 45° to the right (NH) or left (SH)
          const lat = batchLats[i];
          const ekmanFactor = 0.025;
          const currentSpeed = windSpeed * ekmanFactor;
          const deflection = lat >= 0 ? 45 : -45; // Coriolis deflection
          const currentDir = (windDir + deflection + 360) % 360;

          // Convert meteorological direction to u/v components
          const dirRad = (currentDir * Math.PI) / 180;
          const u = -currentSpeed * Math.sin(dirRad);
          const v = -currentSpeed * Math.cos(dirRad);

          results.push({
            latitude: lat,
            longitude: batchLons[i],
            u,
            v,
            speed: currentSpeed,
          });
        }
      } catch {
        // Skip failed batch
      }
    }

    // Run batches in groups of CONCURRENCY
    for (let i = 0; i < totalBatches; i += CONCURRENCY) {
      const group: Promise<void>[] = [];
      for (let j = i; j < Math.min(i + CONCURRENCY, totalBatches); j++) {
        group.push(processBatch(j));
      }
      await Promise.all(group);
    }

    return results;
  } catch (err) {
    console.warn("Ocean currents fetch failed:", err);
    return [];
  }
}
