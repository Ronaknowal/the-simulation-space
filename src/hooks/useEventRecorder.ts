"use client";

/**
 * Watches all active layer data in real-time and captures snapshots
 * into the recording buffer whenever layer data updates.
 * Only runs when `isRecording === true` in the store.
 *
 * Also handles:
 *   - Clearing the buffer when a new recording starts
 *   - Saving the buffer to IndexedDB and updating metadata when recording stops
 */

import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import { recordingBuffer } from "@/lib/recording-buffer";
import { extractLayerItems } from "@/lib/layer-extractors";
import { saveRecording } from "@/lib/recording-db";
import type { RecordedSnapshot, RecordingMeta } from "@/types/recording";

export function useEventRecorder() {
  // Track per-layer lastUpdated to detect data changes
  const prevLastUpdated = useRef<Record<string, number>>({});

  // Detect recording start (to clear the buffer)
  const isRecording = useStore((s) => s.isRecording);
  const prevIsRecordingRef = useRef(false);

  // Capture store values needed for the save step
  const currentRecordingId = useStore((s) => s.currentRecordingId);
  const currentRecordingName = useStore((s) => s.currentRecordingName);
  const recordingStartTime = useStore((s) => s.recordingStartTime);
  const addSavedRecording = useStore((s) => s.addSavedRecording);

  // ── Handle recording start / stop transitions ─────────────────────────────
  useEffect(() => {
    const justStarted = isRecording && !prevIsRecordingRef.current;
    const justStopped = !isRecording && prevIsRecordingRef.current;
    prevIsRecordingRef.current = isRecording;

    if (justStarted) {
      recordingBuffer.clearRecording();
      prevLastUpdated.current = {};
    }

    if (justStopped) {
      const snapshots = recordingBuffer.getRecordingSnapshots();
      if (snapshots.length > 0) {
        // Guard: if recording was started via setIsRecording (bypassing startRecording),
        // currentRecordingId may be null — generate a fallback ID.
        const id =
          currentRecordingId ??
          `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const layerIds = [
          ...new Set(snapshots.map((s) => s.layerId)),
        ];
        const meta: RecordingMeta = {
          id,
          name: currentRecordingName || `Recording ${new Date().toLocaleString()}`,
          startTime: recordingStartTime ?? Date.now(),
          endTime: Date.now(),
          snapshotCount: snapshots.length,
          layerIds,
        };
        saveRecording(meta, snapshots)
          .then(() => addSavedRecording(meta))
          .catch((err) =>
            console.error("[useEventRecorder] Failed to save recording:", err)
          );
      }
    }
  }, [
    isRecording,
    currentRecordingId,
    currentRecordingName,
    recordingStartTime,
    addSavedRecording,
  ]);

  // ── Subscribe to layer data changes and capture snapshots ─────────────────
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      if (!state.isRecording) return;

      const now = Date.now();
      for (const [layerId, layerState] of Object.entries(state.layers)) {
        if (!layerState.enabled || !layerState.data || !layerState.lastUpdated) {
          continue;
        }
        const prev = prevLastUpdated.current[layerId] ?? 0;
        if (layerState.lastUpdated <= prev) continue;

        prevLastUpdated.current[layerId] = layerState.lastUpdated;

        const items = extractLayerItems(layerId, layerState.data);
        if (items.length === 0) continue;

        const snapshot: RecordedSnapshot = {
          capturedAt: now,
          layerId,
          items,
        };
        recordingBuffer.appendSnapshot(snapshot);
      }
    });

    return unsub;
  }, []);
}
