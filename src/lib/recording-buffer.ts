/**
 * Module-level mutable buffer for in-progress recordings and replay data.
 * Kept outside Zustand to avoid storing large arrays in the reactive store.
 */

import type { ExtractedItem, RecordedSnapshot } from "@/types/recording";

const state = {
  recording: [] as RecordedSnapshot[],
  replay: [] as RecordedSnapshot[],
};

export const recordingBuffer = {
  // ── Recording ───────────────────────────────────────────────

  clearRecording() {
    state.recording = [];
  },

  appendSnapshot(snapshot: RecordedSnapshot) {
    state.recording.push(snapshot);
  },

  getRecordingSnapshots(): RecordedSnapshot[] {
    return state.recording;
  },

  // ── Replay ──────────────────────────────────────────────────

  setReplaySnapshots(snapshots: RecordedSnapshot[]) {
    // Sort ascending by timestamp for efficient time-slice queries
    state.replay = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  },

  clearReplay() {
    state.replay = [];
  },

  /**
   * For each layer in the recording, return the most recent snapshot
   * whose capturedAt is ≤ `time`. Used by the replay renderer.
   */
  getItemsAtTime(time: number): { layerId: string; items: ExtractedItem[] }[] {
    const byLayer = new Map<string, RecordedSnapshot>();
    for (const snapshot of state.replay) {
      if (snapshot.timestamp > time) continue;
      const existing = byLayer.get(snapshot.layerId);
      if (!existing || snapshot.timestamp > existing.timestamp) {
        byLayer.set(snapshot.layerId, snapshot);
      }
    }
    return Array.from(byLayer.values()).map((s) => ({
      layerId: s.layerId,
      items: s.items,
    }));
  },

  getReplayTimeRange(): { start: number; end: number } | null {
    if (state.replay.length === 0) return null;
    const first = state.replay[0].timestamp;
    const last = state.replay[state.replay.length - 1].timestamp;
    return { start: first, end: last };
  },
};
