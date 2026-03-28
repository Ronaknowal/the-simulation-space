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
import type { DebrisData } from "./fetcher";

/**
 * Space Debris Controller with TLE caching + frequent re-propagation.
 *
 * TLEs fetched every 10 minutes. Positions re-propagated every 10 seconds
 * for real-time orbital movement visualization.
 */

const DEBRIS_URLS = [
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=fengyun-1c-debris&FORMAT=tle",
];

interface CachedTLE {
  name: string;
  tle1: string;
  satrec: ReturnType<typeof twoline2satrec>;
}

export default function SpaceDebrisController() {
  const enabled = useStore((s) => s.layers["satellites.debris"]?.enabled ?? false);
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);

  const cachedTLEsRef = useRef<CachedTLE[]>([]);
  const tleFetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const propagateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initLayer("satellites.debris");
  }, [initLayer]);

  /** Propagate all cached TLEs to current time */
  const propagatePositions = useCallback(() => {
    const tles = cachedTLEsRef.current;
    if (tles.length === 0) return;

    const now = new Date();
    const debris: DebrisData[] = [];

    for (const { name, tle1, satrec } of tles) {
      try {
        const pv = propagate(satrec, now);
        if (!pv || !pv.position || typeof pv.position === "boolean") continue;

        const gmst = gstime(now);
        const geo = eciToGeodetic(pv.position, gmst);
        const noradId = parseInt(tle1.substring(2, 7).trim(), 10);

        debris.push({
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

    setLayerData("satellites.debris", debris);
  }, [setLayerData]);

  /** Fetch TLEs from CelesTrak */
  const fetchTLEs = useCallback(async () => {
    try {
      setLayerLoading("satellites.debris", true);

      const results = await Promise.allSettled(
        DEBRIS_URLS.map((url) =>
          fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
        )
      );

      const tles: CachedTLE[] = [];
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const lines = r.value.trim().split("\n");
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
      }

      cachedTLEsRef.current = tles;
      propagatePositions();
    } catch (err) {
      setLayerError("satellites.debris", (err as Error).message);
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

    fetchTLEs();
    tleFetchIntervalRef.current = setInterval(fetchTLEs, 600_000); // TLE refresh every 10 min
    propagateIntervalRef.current = setInterval(propagatePositions, 10_000); // Re-propagate every 10s

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
