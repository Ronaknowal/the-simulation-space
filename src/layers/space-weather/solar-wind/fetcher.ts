export interface SolarWindData {
  time: string;
  speed: number; // km/s
  density: number; // p/cm^3
  temperature: number; // K
  bz: number; // nT — IMF Bz component
  bt: number; // nT
}

const PLASMA_URL =
  "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json";
const MAG_URL =
  "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json";

/**
 * Fetches DSCOVR real-time solar wind plasma and magnetic field data.
 * Merges plasma (speed, density, temperature) with mag (bz, bt) by time.
 * Returns the last 24 hours of readings.
 */
export async function fetchSolarWind(): Promise<SolarWindData[]> {
  const [plasmaRes, magRes] = await Promise.all([
    fetch(PLASMA_URL),
    fetch(MAG_URL),
  ]);

  if (!plasmaRes.ok) throw new Error(`SWPC plasma API error: ${plasmaRes.status}`);
  if (!magRes.ok) throw new Error(`SWPC mag API error: ${magRes.status}`);

  const plasmaRaw: string[][] = await plasmaRes.json();
  const magRaw: string[][] = await magRes.json();

  // First row is headers — skip it
  const plasmaRows = plasmaRaw.slice(1);
  const magRows = magRaw.slice(1);

  // Build a map of mag data by time_tag for fast lookup
  const magMap = new Map<string, { bz: number; bt: number }>();
  for (const row of magRows) {
    const timeTag = row[0];
    const bz = parseFloat(row[3]); // bz_gsm
    const bt = parseFloat(row[6]); // bt
    if (!isNaN(bz) && !isNaN(bt)) {
      magMap.set(timeTag, { bz, bt });
    }
  }

  // 24 hours ago
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const merged: SolarWindData[] = [];

  for (const row of plasmaRows) {
    const timeTag = row[0];
    const density = parseFloat(row[1]);
    const speed = parseFloat(row[2]);
    const temperature = parseFloat(row[3]);

    if (isNaN(density) || isNaN(speed) || isNaN(temperature)) continue;

    const timestamp = new Date(timeTag).getTime();
    if (timestamp < cutoff) continue;

    const mag = magMap.get(timeTag);

    merged.push({
      time: timeTag,
      speed,
      density,
      temperature,
      bz: mag?.bz ?? 0,
      bt: mag?.bt ?? 0,
    });
  }

  return merged;
}
