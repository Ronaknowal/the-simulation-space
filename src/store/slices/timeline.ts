import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface TimelineSlice {
  timelineEnabled: boolean;
  currentTime: number;
  playbackSpeed: number;
  isPlaying: boolean;
  timeRange: { start: number; end: number };
  setTimelineEnabled: (enabled: boolean) => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setTimeRange: (range: { start: number; end: number }) => void;
}

export const createTimelineSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  TimelineSlice
> = (set) => ({
  timelineEnabled: false,
  currentTime: Date.now(),
  playbackSpeed: 1,
  isPlaying: false,
  timeRange: {
    start: Date.now() - 24 * 60 * 60 * 1000,
    end: Date.now(),
  },

  setTimelineEnabled: (enabled) =>
    set((state) => {
      state.timelineEnabled = enabled;
    }),
  setCurrentTime: (time) =>
    set((state) => {
      state.currentTime = time;
    }),
  setPlaybackSpeed: (speed) =>
    set((state) => {
      state.playbackSpeed = speed;
    }),
  setIsPlaying: (playing) =>
    set((state) => {
      state.isPlaying = playing;
    }),
  setTimeRange: (range) =>
    set((state) => {
      state.timeRange = range;
    }),
});
