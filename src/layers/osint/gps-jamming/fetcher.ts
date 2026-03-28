export interface GPSInterference {
  latitude: number;
  longitude: number;
  level: number; // 0-1 severity
  region: string;
  date: string;
  source: string;
}

/**
 * Known GPS interference/jamming zones based on publicly reported data
 * from aviation NOTAMs, maritime warnings, and OSINT reports.
 *
 * Each zone is defined as a center point with a radius and severity,
 * and we scatter sample points within the zone to visualize the area.
 */
interface JammingZone {
  name: string;
  centerLat: number;
  centerLon: number;
  radiusDeg: number; // approximate radius in degrees
  severity: number;  // 0-1
  source: string;
  pointCount: number;
}

const KNOWN_JAMMING_ZONES: JammingZone[] = [
  // Eastern Mediterranean — persistent GPS jamming near Syria/Turkey/Cyprus
  {
    name: "Eastern Mediterranean",
    centerLat: 35.5,
    centerLon: 35.0,
    radiusDeg: 3.0,
    severity: 0.95,
    source: "EUROCONTROL NOTAMs, aviation reports",
    pointCount: 25,
  },
  // Baltic Sea — near Kaliningrad exclave
  {
    name: "Baltic Sea (Kaliningrad)",
    centerLat: 55.0,
    centerLon: 20.5,
    radiusDeg: 2.5,
    severity: 0.85,
    source: "Baltic maritime warnings, NATO reports",
    pointCount: 20,
  },
  // Northern Norway / Finnmark — near Russian border
  {
    name: "Northern Norway / Finnmark",
    centerLat: 70.0,
    centerLon: 28.0,
    radiusDeg: 2.0,
    severity: 0.75,
    source: "Norwegian aviation authority NOTAMs",
    pointCount: 15,
  },
  // Black Sea — Crimea area
  {
    name: "Black Sea (Crimea)",
    centerLat: 44.5,
    centerLon: 34.0,
    radiusDeg: 2.5,
    severity: 0.9,
    source: "Maritime safety broadcasts, OSINT",
    pointCount: 20,
  },
  // Eastern Ukraine — conflict zone
  {
    name: "Eastern Ukraine",
    centerLat: 48.5,
    centerLon: 38.0,
    radiusDeg: 2.5,
    severity: 0.95,
    source: "EUROCONTROL conflict zone warnings",
    pointCount: 20,
  },
  // Red Sea / Gulf of Aden
  {
    name: "Red Sea / Gulf of Aden",
    centerLat: 14.0,
    centerLon: 43.0,
    radiusDeg: 3.0,
    severity: 0.7,
    source: "Maritime safety warnings, Houthi activity reports",
    pointCount: 18,
  },
  // Korean DMZ
  {
    name: "Korean DMZ",
    centerLat: 38.0,
    centerLon: 127.0,
    radiusDeg: 1.5,
    severity: 0.8,
    source: "South Korean government reports",
    pointCount: 12,
  },
  // Libya — various conflict zones
  {
    name: "Libya",
    centerLat: 32.0,
    centerLon: 15.0,
    radiusDeg: 3.0,
    severity: 0.65,
    source: "EUROCONTROL advisories",
    pointCount: 15,
  },
  // Persian Gulf — Iran area
  {
    name: "Persian Gulf",
    centerLat: 27.0,
    centerLon: 52.0,
    radiusDeg: 2.0,
    severity: 0.7,
    source: "US Maritime Administration advisories",
    pointCount: 14,
  },
  // South China Sea — disputed areas
  {
    name: "South China Sea",
    centerLat: 15.0,
    centerLon: 114.0,
    radiusDeg: 2.5,
    severity: 0.5,
    source: "Maritime incident reports",
    pointCount: 12,
  },
  // Iraq — northern region
  {
    name: "Northern Iraq",
    centerLat: 36.5,
    centerLon: 43.0,
    radiusDeg: 2.0,
    severity: 0.75,
    source: "EUROCONTROL NOTAMs",
    pointCount: 12,
  },
];

/**
 * Seeded pseudo-random number generator for deterministic point placement.
 * Ensures the same zone configuration always produces the same points.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

/**
 * Generate scattered points within a circular zone to represent
 * the area of GPS interference.
 */
function generateZonePoints(zone: JammingZone, seed: number): GPSInterference[] {
  const rng = seededRandom(seed);
  const points: GPSInterference[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (let i = 0; i < zone.pointCount; i++) {
    // Random point within circular zone (sqrt for uniform distribution)
    const angle = rng() * 2 * Math.PI;
    const dist = Math.sqrt(rng()) * zone.radiusDeg;
    const lat = zone.centerLat + dist * Math.cos(angle);
    const lon = zone.centerLon + dist * Math.sin(angle);

    // Vary severity slightly within the zone
    const jitter = (rng() - 0.5) * 0.2;
    const level = Math.max(0.1, Math.min(1.0, zone.severity + jitter));

    points.push({
      latitude: lat,
      longitude: lon,
      level,
      region: zone.name,
      date: today,
      source: zone.source,
    });
  }

  return points;
}

/**
 * Fetches GPS interference/jamming zone data.
 *
 * Returns a curated dataset of known GPS interference hotspots based on
 * publicly reported data from aviation NOTAMs, maritime safety warnings,
 * EUROCONTROL advisories, and OSINT reports. Points are scattered within
 * each known interference zone to visualize the affected area.
 *
 * Data sources:
 * - EUROCONTROL GPS jamming NOTAMs
 * - US Maritime Administration advisories
 * - Norwegian aviation authority reports
 * - NATO public statements on Baltic interference
 * - Maritime safety broadcasts
 */
export async function fetchGPSInterference(): Promise<GPSInterference[]> {
  try {
    const allPoints: GPSInterference[] = [];

    for (let i = 0; i < KNOWN_JAMMING_ZONES.length; i++) {
      const zone = KNOWN_JAMMING_ZONES[i];
      // Use zone index as seed for deterministic placement
      const points = generateZonePoints(zone, 42 + i * 1000);
      allPoints.push(...points);
    }

    return allPoints;
  } catch (err) {
    console.warn("GPS interference data generation failed:", err);
    return [];
  }
}
