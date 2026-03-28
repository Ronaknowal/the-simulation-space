import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";

export interface ISSPosition {
  longitude: number;
  latitude: number;
  altitude: number; // km
  velocity: number; // km/s
  /** Future orbit path points (lon, lat, alt) for the next ~90 min */
  orbitPath: [number, number, number][];
}

const ISS_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle";

/**
 * Fetch the ISS TLE from CelesTrak, propagate current position,
 * and compute the next ~90 min orbit path for visualization.
 */
export async function fetchISSPosition(): Promise<ISSPosition> {
  const res = await fetch(ISS_TLE_URL);
  if (!res.ok) throw new Error(`CelesTrak ISS TLE error: ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split("\n");

  if (lines.length < 3) throw new Error("Invalid ISS TLE data");

  const tle1 = lines[1].trim();
  const tle2 = lines[2].trim();

  const satrec = twoline2satrec(tle1, tle2);
  const now = new Date();

  // Current position
  const pv = propagate(satrec, now);
  if (!pv || !pv.position || typeof pv.position === "boolean") {
    throw new Error("ISS propagation failed");
  }

  const gmst = gstime(now);
  const geo = eciToGeodetic(pv.position, gmst);

  // Compute velocity magnitude
  let velocity = 0;
  if (pv.velocity && typeof pv.velocity !== "boolean") {
    const v = pv.velocity;
    velocity = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  // Compute orbit path: next 90 minutes in 1-minute steps
  const orbitPath: [number, number, number][] = [];
  const ORBIT_MINUTES = 92; // ISS orbital period ~92 min

  for (let m = 0; m <= ORBIT_MINUTES; m++) {
    const futureTime = new Date(now.getTime() + m * 60_000);
    try {
      const fpv = propagate(satrec, futureTime);
      if (!fpv || !fpv.position || typeof fpv.position === "boolean") continue;

      const fgmst = gstime(futureTime);
      const fgeo = eciToGeodetic(fpv.position, fgmst);
      orbitPath.push([
        degreesLong(fgeo.longitude),
        degreesLat(fgeo.latitude),
        fgeo.height * 1000, // km to meters for deck.gl
      ]);
    } catch {
      // Skip propagation errors
    }
  }

  return {
    longitude: degreesLong(geo.longitude),
    latitude: degreesLat(geo.latitude),
    altitude: geo.height,
    velocity,
    orbitPath,
  };
}
