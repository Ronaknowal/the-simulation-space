import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";

export interface DebrisData {
  noradId: number;
  name: string;
  longitude: number;
  latitude: number;
  altitude: number; // km
}

/**
 * CelesTrak debris catalogs — we sample a subset for performance.
 * Full debris catalog is ~26,000 objects; we fetch the most relevant groups.
 */
const DEBRIS_URLS = [
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=fengyun-1c-debris&FORMAT=tle",
];

function parseTLEText(text: string, now: Date): DebrisData[] {
  const lines = text.trim().split("\n");
  const items: DebrisData[] = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i].trim();
    const tle1 = lines[i + 1].trim();
    const tle2 = lines[i + 2].trim();

    if (!tle1.startsWith("1 ") || !tle2.startsWith("2 ")) continue;

    try {
      const satrec = twoline2satrec(tle1, tle2);
      const pv = propagate(satrec, now);

      if (!pv || !pv.position || typeof pv.position === "boolean") continue;

      const gmst = gstime(now);
      const geo = eciToGeodetic(pv.position, gmst);
      const noradId = parseInt(tle1.substring(2, 7).trim(), 10);

      items.push({
        noradId,
        name,
        longitude: degreesLong(geo.longitude),
        latitude: degreesLat(geo.latitude),
        altitude: geo.height,
      });
    } catch {
      // Skip propagation errors
    }
  }

  return items;
}

/**
 * Fetch known space debris TLEs and propagate current positions.
 * Returns major debris cloud objects (Cosmos-2251, Iridium-33, FengYun-1C).
 */
export async function fetchSpaceDebris(): Promise<DebrisData[]> {
  const results = await Promise.allSettled(
    DEBRIS_URLS.map((url) =>
      fetch(url)
        .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
    )
  );

  const now = new Date();
  const allDebris: DebrisData[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      allDebris.push(...parseTLEText(r.value, now));
    }
  }

  return allDebris;
}
