"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store";

/**
 * Satellite Layer Controller with optimized TLE caching.
 *
 * TLEs are fetched once every 10 minutes (they rarely change).
 * Position propagation runs every 10 seconds using the cached TLEs,
 * so LEO satellites visibly move across the globe in real-time.
 */

import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";
import type { SatelliteData } from "./fetcher";

const CELESTRAK_ACTIVE =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

interface CachedTLE {
  name: string;
  tle1: string;
  satrec: ReturnType<typeof twoline2satrec>;
}

export default function SatelliteLayerController() {
  const enabled = useStore((s) => s.layers["satellites.active"]?.enabled ?? false);
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);

  const cachedTLEsRef = useRef<CachedTLE[]>([]);
  const tleFetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const propagateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initLayer("satellites.active");
  }, [initLayer]);

  /** Propagate all cached TLEs to current time */
  const propagatePositions = useCallback(() => {
    const tles = cachedTLEsRef.current;
    if (tles.length === 0) return;

    const now = new Date();
    const satellites: SatelliteData[] = [];

    for (const { name, tle1, satrec } of tles) {
      try {
        const pv = propagate(satrec, now);
        if (!pv || !pv.position || typeof pv.position === "boolean") continue;

        const gmst = gstime(now);
        const geo = eciToGeodetic(pv.position, gmst);
        const longitude = degreesLong(geo.longitude);
        const latitude = degreesLat(geo.latitude);
        const altitude = geo.height; // km

        const noradId = parseInt(tle1.substring(2, 7).trim(), 10);

        let orbitType: SatelliteData["orbitType"] = "Unknown";
        if (altitude < 2000) orbitType = "LEO";
        else if (altitude < 20200) orbitType = "MEO";
        else if (altitude >= 35000 && altitude <= 36000) orbitType = "GEO";
        else if (altitude >= 20200) orbitType = "HEO";

        let velocity: number | undefined;
        if (pv.velocity && typeof pv.velocity !== "boolean") {
          const v = pv.velocity;
          velocity = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        }

        satellites.push({
          noradId,
          name,
          longitude,
          latitude,
          altitude,
          velocity,
          orbitType,
        });
      } catch {
        // Skip propagation errors
      }
    }

    setLayerData("satellites.active", satellites);
  }, [setLayerData]);

  /** Fetch TLEs from CelesTrak and parse into satrec objects */
  const fetchTLEs = useCallback(async () => {
    try {
      setLayerLoading("satellites.active", true);
      const res = await fetch(CELESTRAK_ACTIVE);
      if (!res.ok) throw new Error(`CelesTrak error: ${res.status}`);

      const text = await res.text();
      const lines = text.trim().split("\n");
      const tles: CachedTLE[] = [];

      for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i].trim();
        const tle1 = lines[i + 1].trim();
        const tle2 = lines[i + 2].trim();

        if (!tle1.startsWith("1 ") || !tle2.startsWith("2 ")) continue;

        try {
          const satrec = twoline2satrec(tle1, tle2);
          tles.push({ name, tle1, satrec });
        } catch {
          // Skip invalid TLEs
        }
      }

      cachedTLEsRef.current = tles;
      // Immediately propagate with fresh TLEs
      propagatePositions();
    } catch (err) {
      setLayerError("satellites.active", (err as Error).message);
    }
  }, [setLayerLoading, setLayerError, propagatePositions]);

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

    // Fetch TLEs immediately and every 10 minutes
    fetchTLEs();
    tleFetchIntervalRef.current = setInterval(fetchTLEs, 600_000);

    // Re-propagate positions every 10 seconds for smooth LEO movement
    propagateIntervalRef.current = setInterval(propagatePositions, 10_000);

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
  }, [enabled, fetchTLEs, propagatePositions]);

  return null;
}
