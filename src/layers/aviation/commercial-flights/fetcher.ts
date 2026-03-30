import { proxyFetch } from "@/lib/proxy-fetch";

export interface AircraftPosition {
  hex: string;       // ICAO 24-bit hex
  flight: string;    // Callsign
  lat: number;
  lon: number;
  alt_baro: number;  // Barometric altitude in feet
  alt_geom?: number;
  gs?: number;       // Ground speed in knots
  track?: number;    // Track angle in degrees
  squawk?: string;
  category?: string; // Aircraft category (A1-A7, B1-B7, C1-C3)
  type?: string;     // Aircraft type ICAO
  r?: string;        // Aircraft registration
  t?: string;        // Aircraft type code
  dbFlags?: number;  // Database flags (1=military, 2=interesting, 4=PIA, 8=LADD)
}

const ADSB_FI_BASE = "https://opendata.adsb.fi/api/v2";

/**
 * Major hub coordinates for regional queries.
 * The /api/v2/all endpoint is discontinued; we query by region instead.
 * Each point covers ~250 NM radius — these 12 hubs give good global coverage.
 */
const QUERY_HUBS: [number, number][] = [
  // Original 12 hubs
  [51.5, -0.1],    // London / Europe
  [40.6, -73.8],   // New York / US East
  [33.9, -118.4],  // LA / US West
  [25.3, 55.3],    // Dubai / Middle East
  [1.35, 103.8],   // Singapore / SE Asia
  [35.7, 139.7],   // Tokyo / East Asia
  [22.3, 113.9],   // Hong Kong / S. China
  [49.0, 2.5],     // Paris / W. Europe
  [41.8, -87.6],   // Chicago / US Central
  [-33.9, 151.2],  // Sydney / Oceania
  [19.1, 72.9],    // Mumbai / S. Asia
  [55.6, 37.6],    // Moscow / E. Europe
  // Additional hubs for global coverage
  [-23.4, -46.6],  // Sao Paulo / S. America
  [-1.3, 36.8],    // Nairobi / E. Africa
  [6.6, 3.3],      // Lagos / W. Africa
  [30.0, 31.2],    // Cairo / N. Africa
  [33.5, 36.3],    // Beirut / Levant
  [41.3, 69.3],    // Tashkent / Central Asia
  [13.7, 100.7],   // Bangkok / SE Asia
  [-6.1, 106.8],   // Jakarta / Indonesia
];

function parseAircraft(a: any): AircraftPosition {
  return {
    hex: a.hex || "",
    flight: (a.flight || "").trim(),
    lat: a.lat,
    lon: a.lon,
    alt_baro: typeof a.alt_baro === "number" ? a.alt_baro : 0,
    alt_geom: a.alt_geom,
    gs: a.gs,
    track: a.track,
    squawk: a.squawk,
    category: a.category,
    type: a.type,
    r: a.r,
    t: a.t,
    dbFlags: a.dbFlags,
  };
}

/**
 * Delay helper for rate limiting.
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a single hub with error handling.
 */
async function fetchHub(lat: number, lon: number): Promise<any[]> {
  try {
    const r = await proxyFetch(`${ADSB_FI_BASE}/lat/${lat}/lon/${lon}/dist/250`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.aircraft || []).filter((a: any) => a.lat != null && a.lon != null);
  } catch {
    return [];
  }
}

/**
 * Fetches aircraft positions from ADSB.fi using regional hub queries.
 * Queries hubs ONE AT A TIME with 1.5s delay between requests
 * to strictly respect ADSB.fi's 1 req/sec rate limit.
 * Uses fewer hubs (6 major ones) for faster initial load.
 * De-duplicates aircraft by hex code.
 */
export async function fetchAllAircraft(): Promise<AircraftPosition[]> {
  const seen = new Set<string>();
  const aircraft: AircraftPosition[] = [];

  // Use only 6 major hubs for speed (covers most global traffic)
  const hubs = QUERY_HUBS.slice(0, 6);

  for (let i = 0; i < hubs.length; i++) {
    if (i > 0) await delay(1500);
    const [lat, lon] = hubs[i];
    const results = await fetchHub(lat, lon);
    for (const a of results) {
      const key = a.hex || `${a.lat},${a.lon}`;
      if (!seen.has(key)) {
        seen.add(key);
        aircraft.push(parseAircraft(a));
      }
    }
  }

  return aircraft;
}

/** Filter for military aircraft (dbFlags bit 0 = military) */
export function filterMilitary(aircraft: AircraftPosition[]): AircraftPosition[] {
  return aircraft.filter((a) => a.dbFlags && (a.dbFlags & 1) !== 0);
}

/** Filter for commercial aircraft (not military) */
export function filterCommercial(aircraft: AircraftPosition[]): AircraftPosition[] {
  return aircraft.filter((a) => !a.dbFlags || (a.dbFlags & 1) === 0);
}
