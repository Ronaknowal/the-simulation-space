import type { StateCreator } from "zustand";
import type { CameraBookmark } from "@/types/store";
import type { AppStore } from "../index";

export interface CameraSlice {
  cameraPosition: {
    longitude: number;
    latitude: number;
    altitude: number;
    heading: number;
    pitch: number;
  };
  bookmarks: CameraBookmark[];
  flyToTarget: { lat: number; lng: number; alt?: number } | null;
  setCameraPosition: (pos: CameraSlice["cameraPosition"]) => void;
  addBookmark: (bookmark: CameraBookmark) => void;
  removeBookmark: (id: string) => void;
  setFlyToTarget: (target: CameraSlice["flyToTarget"]) => void;
}

export const createCameraSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  CameraSlice
> = (set) => ({
  cameraPosition: {
    longitude: 0,
    latitude: 20,
    altitude: 20_000_000,
    heading: 0,
    pitch: -90,
  },
  bookmarks: [],
  flyToTarget: null,

  setCameraPosition: (pos) =>
    set((state) => {
      state.cameraPosition = pos;
    }),

  addBookmark: (bookmark) =>
    set((state) => {
      state.bookmarks.push(bookmark);
    }),

  removeBookmark: (id) =>
    set((state) => {
      state.bookmarks = state.bookmarks.filter((b) => b.id !== id);
    }),

  setFlyToTarget: (target) =>
    set((state) => {
      state.flyToTarget = target;
    }),
});
