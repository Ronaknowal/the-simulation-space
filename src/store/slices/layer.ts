import type { StateCreator } from "zustand";
import type { LayerState } from "@/types/layers";
import type { AppStore } from "../index";

export interface LayerSlice {
  layers: Record<string, LayerState>;
  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerData: (id: string, data: unknown) => void;
  setLayerFilter: (id: string, key: string, value: unknown) => void;
  setLayerLoading: (id: string, loading: boolean) => void;
  setLayerError: (id: string, error: string | null) => void;
  initLayer: (id: string, enabled?: boolean) => void;
  soloLayer: (id: string) => void;
  soloLayerWithData: (id: string, data: unknown) => void;
}

export const createLayerSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  LayerSlice
> = (set) => ({
  layers: {},

  initLayer: (id, enabled = false) =>
    set((state) => {
      if (!state.layers[id]) {
        state.layers[id] = {
          enabled,
          opacity: 1,
          loading: false,
          error: null,
          data: null,
          filters: {},
          lastUpdated: 0,
        };
      }
    }),

  soloLayer: (id) =>
    set((state) => {
      for (const layerId of Object.keys(state.layers)) {
        state.layers[layerId].enabled = false;
        state.layers[layerId].data = null;
        state.layers[layerId].loading = false;
        state.layers[layerId].error = null;
      }
      if (!state.layers[id]) {
        state.layers[id] = {
          enabled: true,
          opacity: 1,
          loading: false,
          error: null,
          data: null,
          filters: {},
          lastUpdated: 0,
        };
      } else {
        state.layers[id].enabled = true;
      }
    }),

  soloLayerWithData: (id, data) =>
    set((state) => {
      for (const layerId of Object.keys(state.layers)) {
        state.layers[layerId].enabled = false;
        state.layers[layerId].data = null;
        state.layers[layerId].loading = false;
        state.layers[layerId].error = null;
      }
      if (!state.layers[id]) {
        state.layers[id] = {
          enabled: true,
          opacity: 1,
          loading: false,
          error: null,
          data,
          filters: {},
          lastUpdated: Date.now(),
        };
      } else {
        state.layers[id].enabled = true;
        state.layers[id].data = data;
        state.layers[id].lastUpdated = Date.now();
      }
    }),

  toggleLayer: (id) =>
    set((state) => {
      if (!state.layers[id]) {
        state.layers[id] = {
          enabled: true,
          opacity: 1,
          loading: false,
          error: null,
          data: null,
          filters: {},
          lastUpdated: 0,
        };
      } else {
        state.layers[id].enabled = !state.layers[id].enabled;
        if (!state.layers[id].enabled) {
          state.layers[id].data = null;
          state.layers[id].loading = false;
          state.layers[id].error = null;
        }
      }
    }),

  setLayerOpacity: (id, opacity) =>
    set((state) => {
      if (state.layers[id]) state.layers[id].opacity = opacity;
    }),

  setLayerData: (id, data) =>
    set((state) => {
      if (!state.layers[id]) return;
      state.layers[id].loading = false;
      if (!state.layers[id].enabled) return;
      state.layers[id].data = data;
      state.layers[id].lastUpdated = Date.now();
    }),

  setLayerFilter: (id, key, value) =>
    set((state) => {
      if (state.layers[id]) state.layers[id].filters[key] = value;
    }),

  setLayerLoading: (id, loading) =>
    set((state) => {
      if (state.layers[id]) state.layers[id].loading = loading;
    }),

  setLayerError: (id, error) =>
    set((state) => {
      if (!state.layers[id]) return;
      state.layers[id].loading = false;
      if (!state.layers[id].enabled) return;
      state.layers[id].error = error;
    }),
});
