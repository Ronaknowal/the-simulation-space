import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createLayerSlice, type LayerSlice } from "./slices/layer";
import { createCameraSlice, type CameraSlice } from "./slices/camera";
import { createShaderSlice, type ShaderSlice } from "./slices/shader";
import { createUISlice, type UISlice } from "./slices/ui";
import { createSelectionSlice, type SelectionSlice } from "./slices/selection";
import { createTimelineSlice, type TimelineSlice } from "./slices/timeline";
import { createRealtimeSlice, type RealtimeSlice } from "./slices/realtime";
import { createMarketSlice, type MarketSlice } from "./slices/market";
import { createAlertSlice, type AlertSlice } from "./slices/alert";
import { createRecordingSlice, type RecordingSlice } from "./slices/recording";
import {
  createSimulationSlice,
  type SimulationSlice,
} from "./slices/simulation";
import {
  createSituationSlice,
  type SituationSlice,
} from "./slices/situation";
import { createTabsSlice, type TabsSlice } from "./slices/tabs";

export type AppStore = LayerSlice &
  CameraSlice &
  ShaderSlice &
  UISlice &
  SelectionSlice &
  TimelineSlice &
  RealtimeSlice &
  MarketSlice &
  AlertSlice &
  RecordingSlice &
  SimulationSlice &
  SituationSlice &
  TabsSlice;

export const useStore = create<AppStore>()(
  devtools(
    persist(
      immer((...args) => ({
        ...createLayerSlice(...args),
        ...createCameraSlice(...args),
        ...createShaderSlice(...args),
        ...createUISlice(...args),
        ...createSelectionSlice(...args),
        ...createTimelineSlice(...args),
        ...createRealtimeSlice(...args),
        ...createMarketSlice(...args),
        ...createAlertSlice(...args),
        ...createRecordingSlice(...args),
        ...createSimulationSlice(...args),
        ...createSituationSlice(...args),
        ...createTabsSlice(...args),
      })),
      {
        name: "tss-store",
        partialize: (state: AppStore) => ({
          bookmarks: state.bookmarks,
          activeShader: state.activeShader,
          bloomEnabled: state.bloomEnabled,
          bloomStrength: state.bloomStrength,
          sharpenEnabled: state.sharpenEnabled,
          sharpenStrength: state.sharpenStrength,
          activeModule: state.activeModule,
          activeSituationId: state.activeSituationId,
        }),
      }
    ),
    { name: "SimulationSpaceStore" }
  )
);
