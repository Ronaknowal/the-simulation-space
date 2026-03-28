import type { StateCreator } from "zustand";
import type { ModuleId } from "@/types/store";
import type { AppStore } from "../index";

export interface UISlice {
  activeModule: ModuleId;
  expandedPanel: string | null;
  searchOpen: boolean;
  performanceMonitorVisible: boolean;
  activePreset: string | null;
  setActiveModule: (module: ModuleId) => void;
  setExpandedPanel: (panelId: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  togglePerformanceMonitor: () => void;
  setActivePreset: (preset: string | null) => void;
}

export const createUISlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  UISlice
> = (set) => ({
  activeModule: "pulse",
  expandedPanel: null,
  searchOpen: false,
  performanceMonitorVisible: false,
  activePreset: null,

  setActiveModule: (module) =>
    set((state) => {
      state.activeModule = module;
    }),
  setExpandedPanel: (panelId) =>
    set((state) => {
      state.expandedPanel = panelId;
    }),
  setSearchOpen: (open) =>
    set((state) => {
      state.searchOpen = open;
    }),
  togglePerformanceMonitor: () =>
    set((state) => {
      state.performanceMonitorVisible = !state.performanceMonitorVisible;
    }),
  setActivePreset: (preset) =>
    set((state) => {
      state.activePreset = preset;
    }),
});
