import type { StateCreator } from "zustand";
import type { RecordingMeta } from "@/types/recording";
import type { AppStore } from "../index";

export interface RecordingSlice {
  // Active recording
  isRecording: boolean;
  currentRecordingId: string | null;
  currentRecordingName: string;
  recordingStartTime: number | null;

  // Replay
  isReplaying: boolean;
  replayRecordingId: string | null;
  replayCurrentTime: number;
  replaySpeed: number;
  replayIsPlaying: boolean;
  replayTimeRange: { start: number; end: number } | null;

  // Saved sessions (metadata only -- full snapshots live in IndexedDB)
  savedRecordings: RecordingMeta[];

  // Actions
  startRecording: (name: string) => string;
  stopRecording: () => void;

  startReplay: (
    meta: RecordingMeta,
    timeRange: { start: number; end: number }
  ) => void;
  stopReplay: () => void;
  setReplayTime: (time: number) => void;
  setReplaySpeed: (speed: number) => void;
  setReplayPlaying: (playing: boolean) => void;

  setSavedRecordings: (recordings: RecordingMeta[]) => void;
  addSavedRecording: (meta: RecordingMeta) => void;
  removeSavedRecording: (id: string) => void;
}

export const createRecordingSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  RecordingSlice
> = (set) => ({
  isRecording: false,
  currentRecordingId: null,
  currentRecordingName: "",
  recordingStartTime: null,

  isReplaying: false,
  replayRecordingId: null,
  replayCurrentTime: 0,
  replaySpeed: 1,
  replayIsPlaying: false,
  replayTimeRange: null,

  savedRecordings: [],

  startRecording: (name) => {
    const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => {
      state.isRecording = true;
      state.currentRecordingId = id;
      state.currentRecordingName = name;
      state.recordingStartTime = Date.now();
    });
    return id;
  },

  stopRecording: () =>
    set((state) => {
      state.isRecording = false;
    }),

  startReplay: (meta, timeRange) =>
    set((state) => {
      state.isReplaying = true;
      state.replayRecordingId = meta.id;
      state.replayCurrentTime = timeRange.start;
      state.replayIsPlaying = false;
      state.replaySpeed = 1;
      state.replayTimeRange = timeRange;
    }),

  stopReplay: () =>
    set((state) => {
      state.isReplaying = false;
      state.replayRecordingId = null;
      state.replayIsPlaying = false;
      state.replayTimeRange = null;
    }),

  setReplayTime: (time) =>
    set((state) => {
      state.replayCurrentTime = time;
    }),

  setReplaySpeed: (speed) =>
    set((state) => {
      state.replaySpeed = speed;
    }),

  setReplayPlaying: (playing) =>
    set((state) => {
      state.replayIsPlaying = playing;
    }),

  setSavedRecordings: (recordings) =>
    set((state) => {
      state.savedRecordings = recordings;
    }),

  addSavedRecording: (meta) =>
    set((state) => {
      state.savedRecordings.unshift(meta);
    }),

  removeSavedRecording: (id) =>
    set((state) => {
      state.savedRecordings = state.savedRecordings.filter(
        (r) => r.id !== id
      );
    }),
});
