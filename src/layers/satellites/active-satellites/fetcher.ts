import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";

export interface SatelliteData {
  noradId: number;
  name: string;
  longitude: number;
  latitude: number;
  altitude: number; // km
  velocity?: number;
  orbitType: "LEO" | "MEO" | "GEO" | "HEO" | "Unknown";
}

export interface TLERecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  TLE_LINE1: string;
  TLE_LINE2: string;
}

const CELESTRAK_ACTIVE =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

/**
 * Fetch active satellite TLEs from CelesTrak and propagate positions.
 * Returns ~8,000+ satellites with current lat/lon/alt.
 */
export async function fetchActiveSatellites(): Promise<SatelliteData[]> {
  const res = await fetch(CELESTRAK_ACTIVE);
  if (!res.ok) throw new Error(`CelesTrak error: ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split("\n");
  const satellites: SatelliteData[] = [];
  const now = new Date();

  // TLE format: 3 lines per satellite (name, line1, line2)
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i].trim();
    const tle1 = lines[i + 1].trim();
    const tle2 = lines[i + 2].trim();

    if (!tle1.startsWith("1 ") || !tle2.startsWith("2 ")) continue;

    try {
      const satrec = twoline2satrec(tle1, tle2);
      const positionAndVelocity = propagate(satrec, now);

      if (
        !positionAndVelocity ||
        !positionAndVelocity.position ||
        typeof positionAndVelocity.position === "boolean"
      )
        continue;

      const position = positionAndVelocity.position;
      const gmst = gstime(now);
      const geodetic = eciToGeodetic(position, gmst);

      const longitude = degreesLong(geodetic.longitude);
      const latitude = degreesLat(geodetic.latitude);
      const altitude = geodetic.height; // km

      // Extract NORAD ID from TLE line 1
      const noradId = parseInt(tle1.substring(2, 7).trim(), 10);

      // Classify orbit type by altitude
      let orbitType: SatelliteData["orbitType"] = "Unknown";
      if (altitude < 2000) orbitType = "LEO";
      else if (altitude < 20200) orbitType = "MEO";
      else if (altitude >= 35000 && altitude <= 36000) orbitType = "GEO";
      else if (altitude >= 20200) orbitType = "HEO";

      satellites.push({
        noradId,
        name,
        longitude,
        latitude,
        altitude,
        orbitType,
      });
    } catch {
      // Skip satellites with propagation errors
    }
  }

  return satellites;
}
