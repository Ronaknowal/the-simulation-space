"use client";

import { useRef, useEffect, useState } from "react";

/**
 * Smoothly interpolates geographic positions between data fetches.
 *
 * For moving objects like aircraft, ships, and satellites, this hook:
 * 1. Stores the previous and current positions keyed by a unique ID
 * 2. Uses a throttled interval (not rAF) to interpolate between them
 * 3. Extrapolates beyond the last known position using velocity vectors
 *
 * This makes 5-second polling intervals look like smooth, continuous movement
 * without the performance cost of 60fps React state updates.
 */

interface PositionSnapshot {
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  speed: number;
}

interface InterpolationState {
  prev: Map<string, PositionSnapshot>;
  curr: Map<string, PositionSnapshot>;
  fetchTime: number;
  prevFetchTime: number;
}

/**
 * Interpolates positions of moving objects between fetch intervals.
 *
 * Uses 500ms interval (2fps) to update interpolated positions — smooth enough
 * for map visualization while keeping React re-renders minimal.
 *
 * @param rawData - Array of objects with lat/lon/id fields
 * @param getId - Function to extract unique ID from each object
 * @param getLat - Function to extract latitude
 * @param getLon - Function to extract longitude
 * @param getAlt - Function to extract altitude (optional, defaults to 0)
 * @param getHeading - Function to extract heading in degrees (optional)
 * @param getSpeed - Function to extract speed in knots (optional)
 * @param refreshMs - Expected interval between data fetches (ms)
 * @param enabled - Whether interpolation is active
 * @param updateIntervalMs - How often to re-interpolate (ms), default 500
 * @returns Interpolated data array updated at the throttled interval
 */
export function useInterpolatedPositions<T extends Record<string, any>>(
  rawData: T[] | null,
  getId: (d: T) => string,
  getLat: (d: T) => number,
  getLon: (d: T) => number,
  getAlt: (d: T) => number | undefined,
  getHeading: (d: T) => number | undefined,
  getSpeed: (d: T) => number | undefined,
  refreshMs: number,
  enabled: boolean,
  updateIntervalMs: number = 500
): T[] | null {
  const stateRef = useRef<InterpolationState>({
    prev: new Map(),
    curr: new Map(),
    fetchTime: 0,
    prevFetchTime: 0,
  });
  const rawDataRef = useRef<T[] | null>(rawData);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [interpolated, setInterpolated] = useState<T[] | null>(null);

  // Keep raw data ref up-to-date
  rawDataRef.current = rawData;

  // Update snapshot state when new data arrives
  useEffect(() => {
    if (!rawData || !enabled) {
      setInterpolated(rawData);
      return;
    }

    const state = stateRef.current;
    const now = Date.now();

    // Shift current → previous
    state.prev = state.curr;
    state.prevFetchTime = state.fetchTime;

    // Build new current snapshot map
    const newCurr = new Map<string, PositionSnapshot>();
    for (const d of rawData) {
      const id = getId(d);
      newCurr.set(id, {
        lat: getLat(d),
        lon: getLon(d),
        alt: getAlt(d) ?? 0,
        heading: getHeading(d) ?? 0,
        speed: getSpeed(d) ?? 0,
      });
    }
    state.curr = newCurr;
    state.fetchTime = now;

    // If this is the first fetch, no interpolation possible — use raw data
    if (state.prev.size === 0) {
      setInterpolated(rawData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, enabled]);

  // Throttled interpolation interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const interpolate = () => {
      const data = rawDataRef.current;
      if (!data || data.length === 0) return;

      const state = stateRef.current;
      const now = Date.now();
      const elapsed = now - state.fetchTime;
      const fetchInterval = state.fetchTime - state.prevFetchTime;

      // Need two data points for interpolation
      if (fetchInterval <= 0 || state.prev.size === 0) return;

      // Interpolation factor: 0 = at fetchTime, 1 = at next expected fetch
      const t = Math.min(elapsed / refreshMs, 1.5); // Cap to avoid wild extrapolation

      const result = data.map((d) => {
        const id = getId(d);
        const prev = state.prev.get(id);
        const curr = state.curr.get(id);

        if (!prev || !curr) return d;

        // Velocity vector from previous to current position
        const dlat = curr.lat - prev.lat;
        const dlon = curr.lon - prev.lon;
        const dalt = curr.alt - prev.alt;

        // Extrapolate: at t=0 we're at curr, at t=1 we should be at next expected position
        // 0.7 damping factor prevents overshooting when aircraft turn or decelerate
        const damping = 0.7;
        const newLat = curr.lat + dlat * t * damping;
        const newLon = curr.lon + dlon * t * damping;
        const newAlt = curr.alt + dalt * t * damping;

        // Build interpolated object preserving all original properties
        const interpolatedObj = { ...d } as any;

        // Update all position-related fields
        if ("lat" in d) interpolatedObj.lat = newLat;
        if ("lon" in d) interpolatedObj.lon = newLon;
        if ("latitude" in d) interpolatedObj.latitude = newLat;
        if ("longitude" in d) interpolatedObj.longitude = newLon;
        if ("alt_baro" in d && typeof d.alt_baro === "number") {
          interpolatedObj.alt_baro = newAlt / 0.3048; // km or meters back to feet for aviation
        }
        if ("altitude" in d && typeof d.altitude === "number") {
          interpolatedObj.altitude = newAlt;
        }

        return interpolatedObj as T;
      });

      setInterpolated(result);
    };

    intervalRef.current = setInterval(interpolate, updateIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refreshMs, updateIntervalMs]);

  return enabled ? interpolated : rawData;
}
