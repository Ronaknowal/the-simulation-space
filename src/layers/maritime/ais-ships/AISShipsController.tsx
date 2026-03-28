"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store";
import { fetchShipPositions } from "./fetcher";
import type { ShipPosition } from "./fetcher";

/**
 * AIS Ships Controller with smooth interpolation.
 *
 * Fetches ship positions every 30 seconds from AISStream.io proxy,
 * then interpolates positions every 1s between fetches
 * so ships appear to move smoothly along their course.
 */

interface PositionSnapshot {
  lat: number;
  lon: number;
  speed: number;
  course: number;
}

const FETCH_INTERVAL = 30_000;   // Poll every 30 seconds
const INTERP_INTERVAL = 1_000;   // Interpolate every 1 second

export default function AISShipsController() {
  const enabled = useStore((s) => s.layers["maritime.ais-ships"]?.enabled ?? false);
  const setLayerData = useStore((s) => s.setLayerData);
  const setLayerLoading = useStore((s) => s.setLayerLoading);
  const setLayerError = useStore((s) => s.setLayerError);
  const initLayer = useStore((s) => s.initLayer);

  const prevPositions = useRef<Map<number, PositionSnapshot>>(new Map());
  const currPositions = useRef<Map<number, PositionSnapshot>>(new Map());
  const rawDataRef = useRef<ShipPosition[]>([]);
  const fetchTimeRef = useRef(0);
  const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initLayer("maritime.ais-ships");
  }, [initLayer]);

  const updateSnapshots = useCallback((ships: ShipPosition[]) => {
    prevPositions.current = currPositions.current;

    const newCurr = new Map<number, PositionSnapshot>();
    for (const s of ships) {
      newCurr.set(s.mmsi, {
        lat: s.latitude,
        lon: s.longitude,
        speed: s.speed,
        course: s.course,
      });
    }
    currPositions.current = newCurr;
    rawDataRef.current = ships;
    fetchTimeRef.current = Date.now();
  }, []);

  const interpolate = useCallback(() => {
    const raw = rawDataRef.current;
    if (raw.length === 0 || prevPositions.current.size === 0) return;

    const now = Date.now();
    const elapsed = now - fetchTimeRef.current;
    const t = Math.min(elapsed / FETCH_INTERVAL, 1.5);
    const damping = 0.6; // Ships are slower, more damping

    const interpolated = raw.map((s) => {
      const prev = prevPositions.current.get(s.mmsi);
      const curr = currPositions.current.get(s.mmsi);
      if (!prev || !curr) return s;

      const dlat = curr.lat - prev.lat;
      const dlon = curr.lon - prev.lon;

      return {
        ...s,
        latitude: curr.lat + dlat * t * damping,
        longitude: curr.lon + dlon * t * damping,
      };
    });

    setLayerData("maritime.ais-ships", interpolated);
  }, [setLayerData]);

  const doFetch = useCallback(async () => {
    try {
      setLayerLoading("maritime.ais-ships", true);
      const data = await fetchShipPositions();
      updateSnapshots(data);
      setLayerData("maritime.ais-ships", data);
    } catch (err) {
      setLayerError("maritime.ais-ships", (err as Error).message);
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

    doFetch();
    fetchIntervalRef.current = setInterval(doFetch, FETCH_INTERVAL);
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
