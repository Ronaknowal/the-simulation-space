"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store";
import { fetchAllAircraft } from "./fetcher";
import type { AircraftPosition } from "./fetcher";

/**
 * Flight Layer Controller with smooth interpolation.
 *
 * Fetches aircraft positions every 5 seconds from ADSB.fi,
 * then interpolates positions every 500ms between fetches
 * so aircraft appear to move smoothly across the globe.
 */

interface PositionSnapshot {
  lat: number;
  lon: number;
  alt: number;
  gs: number;
  track: number;
}

const FETCH_INTERVAL = 5_000;    // Poll ADSB.fi every 5 seconds
const INTERP_INTERVAL = 500;     // Interpolate every 500ms (2fps updates)

export default function FlightLayerController() {
  const enabled = useStore((s) => s.layers["aviation.commercial-flights"]?.enabled ?? false);
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);

  // Position tracking for interpolation
  const prevPositions = useRef<Map<string, PositionSnapshot>>(new Map());
  const currPositions = useRef<Map<string, PositionSnapshot>>(new Map());
  const rawDataRef = useRef<AircraftPosition[]>([]);
  const fetchTimeRef = useRef(0);
  const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initLayer("aviation.commercial-flights");
  }, [initLayer]);

  /** Store position snapshots for interpolation */
  const updateSnapshots = useCallback((aircraft: AircraftPosition[]) => {
    // Shift current → previous
    prevPositions.current = currPositions.current;

    // Build new snapshot
    const newCurr = new Map<string, PositionSnapshot>();
    for (const a of aircraft) {
      newCurr.set(a.hex, {
        lat: a.lat,
        lon: a.lon,
        alt: a.alt_baro * 0.3048, // feet to meters
        gs: a.gs ?? 0,
        track: a.track ?? 0,
      });
    }
    currPositions.current = newCurr;
    rawDataRef.current = aircraft;
    fetchTimeRef.current = Date.now();
  }, []);

  /** Interpolate between snapshots */
  const interpolate = useCallback(() => {
    const raw = rawDataRef.current;
    if (raw.length === 0 || prevPositions.current.size === 0) return;

    const now = Date.now();
    const elapsed = now - fetchTimeRef.current;
    const t = Math.min(elapsed / FETCH_INTERVAL, 1.5); // Cap extrapolation
    const damping = 0.7;

    const interpolated = raw.map((a) => {
      const prev = prevPositions.current.get(a.hex);
      const curr = currPositions.current.get(a.hex);
      if (!prev || !curr) return a;

      const dlat = curr.lat - prev.lat;
      const dlon = curr.lon - prev.lon;
      const dalt = curr.alt - prev.alt;

      return {
        ...a,
        lat: curr.lat + dlat * t * damping,
        lon: curr.lon + dlon * t * damping,
        alt_baro: (curr.alt + dalt * t * damping) / 0.3048, // meters back to feet
      };
    });

    setLayerData("aviation.commercial-flights", interpolated);
  }, [setLayerData]);

  /** Fetch new data from ADSB.fi */
  const doFetch = useCallback(async () => {
    try {
      setLayerLoading("aviation.commercial-flights", true);
      const data = await fetchAllAircraft();
      updateSnapshots(data);
      setLayerData("aviation.commercial-flights", data);
    } catch (err) {
      setLayerError("aviation.commercial-flights", (err as Error).message);
    }
  }, [setLayerLoading, setLayerData, setLayerError, updateSnapshots]);

  useEffect(() => {
    if (!enabled) {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      if (interpIntervalRef.current) {
        clearInterval(interpIntervalRef.current);
        interpIntervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    doFetch();

    // Poll for new data
    fetchIntervalRef.current = setInterval(doFetch, FETCH_INTERVAL);

    // Interpolate between fetches
    interpIntervalRef.current = setInterval(interpolate, INTERP_INTERVAL);

    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      if (interpIntervalRef.current) {
        clearInterval(interpIntervalRef.current);
        interpIntervalRef.current = null;
      }
    };
  }, [enabled, doFetch, interpolate]);

  return null;
}
