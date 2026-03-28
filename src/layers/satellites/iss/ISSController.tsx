"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";
import type { ISSPosition } from "./fetcher";

/**
 * ISS Controller with TLE caching + frequent re-propagation.
 *
 * TLE fetched every 10 minutes from CelesTrak.
 * Position + orbit path re-propagated every 5 seconds for smooth tracking.
 * The orbit path shows the next ~92 minutes (one full orbit).
 */

const ISS_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle";
const ORBIT_MINUTES = 92; // ISS orbital period

export default function ISSController() {
  const enabled = useStore((s) => s.layers["satellites.iss"]?.enabled ?? false);
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);

  const satrecRef = useRef<ReturnType<typeof twoline2satrec> | null>(null);
  const tleFetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const propagateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initLayer("satellites.iss");
  }, [initLayer]);

  /** Propagate ISS position + orbit path from cached TLE */
  const propagatePosition = useCallback(() => {
    const satrec = satrecRef.current;
    if (!satrec) return;

    try {
      const now = new Date();
      const pv = propagate(satrec, now);
      if (!pv || !pv.position || typeof pv.position === "boolean") return;

      const gmst = gstime(now);
      const geo = eciToGeodetic(pv.position, gmst);

      // Compute velocity
      let velocity = 0;
      if (pv.velocity && typeof pv.velocity !== "boolean") {
        const v = pv.velocity;
        velocity = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      }

      // Compute orbit path: next 92 minutes in 1-minute steps
      const orbitPath: [number, number, number][] = [];
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

      const issData: ISSPosition = {
        longitude: degreesLong(geo.longitude),
        latitude: degreesLat(geo.latitude),
        altitude: geo.height,
        velocity,
        orbitPath,
      };

      setLayerData("satellites.iss", issData);
    } catch {
      // Skip propagation errors
    }
  }, [setLayerData]);

  /** Fetch ISS TLE from CelesTrak */
  const fetchTLE = useCallback(async () => {
    try {
      setLayerLoading("satellites.iss", true);
      const res = await fetch(ISS_TLE_URL);
      if (!res.ok) throw new Error(`CelesTrak ISS TLE error: ${res.status}`);

      const text = await res.text();
      const lines = text.trim().split("\n");
      if (lines.length < 3) throw new Error("Invalid ISS TLE data");

      const tle1 = lines[1].trim();
      const tle2 = lines[2].trim();

      satrecRef.current = twoline2satrec(tle1, tle2);
      propagatePosition();
    } catch (err) {
      setLayerError("satellites.iss", (err as Error).message);
    }
  }, [setLayerLoading, setLayerError, propagatePosition]);

  useEffect(() => {
    if (!enabled) {
      if (tleFetchIntervalRef.current) {
        clearInterval(tleFetchIntervalRef.current);
        tleFetchIntervalRef.current = null;
      }
      if (propagateIntervalRef.current) {
        clearInterval(propagateIntervalRef.current);
        propagateIntervalRef.current = null;
      }
      return;
    }

    fetchTLE();
    tleFetchIntervalRef.current = setInterval(fetchTLE, 600_000); // TLE every 10 min
    propagateIntervalRef.current = setInterval(propagatePosition, 5_000); // Position every 5s

    return () => {
      if (tleFetchIntervalRef.current) {
        clearInterval(tleFetchIntervalRef.current);
        tleFetchIntervalRef.current = null;
      }
      if (propagateIntervalRef.current) {
        clearInterval(propagateIntervalRef.current);
        propagateIntervalRef.current = null;
      }
    };
  }, [enabled, fetchTLE, propagatePosition]);

  return null;
}
