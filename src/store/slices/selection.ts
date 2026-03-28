import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface SelectionSlice {
  selectedEntity: { layerId: string; data: unknown } | null;
  hoveredEntity: { layerId: string; data: unknown; x: number; y: number } | null;
  setSelectedEntity: (entity: SelectionSlice["selectedEntity"]) => void;
  setHoveredEntity: (entity: SelectionSlice["hoveredEntity"]) => void;
}

export const createSelectionSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  SelectionSlice
> = (set) => ({
  selectedEntity: null,
  hoveredEntity: null,

  setSelectedEntity: (entity) =>
    set((state) => {
      state.selectedEntity = entity;
    }),
  setHoveredEntity: (entity) =>
    set((state) => {
      state.hoveredEntity = entity;
    }),
});
