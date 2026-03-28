"use client";

/**
 * Drives the replay playback timer.
 * When `isReplaying && replayIsPlaying`, advances `replayCurrentTime`
 * by `replaySpeed` real-time milliseconds per tick (100 ms ticks → ~10 fps).
 * Automatically pauses when the end of the recording is reached.
 */

import { useEffect, useRef } from "react";
import { useStore } from "@/store";

const TICK_MS = 100; // advance this many real-ms per interval

export function useRecordingReplay() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isReplaying = useStore((s) => s.isReplaying);
  const replayIsPlaying = useStore((s) => s.replayIsPlaying);
  const replaySpeed = useStore((s) => s.replaySpeed);

  useEffect(() => {
    // Stop any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isReplaying || !replayIsPlaying) return;

    timerRef.current = setInterval(() => {
      const {
        replayCurrentTime,
        replayTimeRange,
        replaySpeed: speed,
        setReplayTime,
        setReplayPlaying,
      } = useStore.getState();

      if (!replayTimeRange) return;

      const next = replayCurrentTime + TICK_MS * speed;
      if (next >= replayTimeRange.end) {
        setReplayTime(replayTimeRange.end);
        setReplayPlaying(false);
      } else {
        setReplayTime(next);
      }
    }, TICK_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isReplaying, replayIsPlaying, replaySpeed]);
}
