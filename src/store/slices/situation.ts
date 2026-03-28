import type { StateCreator } from "zustand";
import type { Situation, SituationSeverity } from "@/types/situation";
import type { VyomAlert, AlertPriority } from "@/types/store";
import type { AppStore } from "../index";

export interface SituationSlice {
  situations: Record<string, Situation>;
  activeSituationId: string | null;
  createSituation: (situation: Situation) => void;
  updateSituation: (id: string, updates: Partial<Situation>) => void;
  resolveSituation: (id: string) => void;
  setActiveSituation: (id: string | null) => void;
  createFromAlert: (alert: VyomAlert) => string;
}

const PRIORITY_TO_SEVERITY: Record<AlertPriority, SituationSeverity> = {
  FLASH: "CRITICAL",
  PRIORITY: "HIGH",
  ROUTINE: "MEDIUM",
};

export const createSituationSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  SituationSlice
> = (set) => ({
  situations: {},
  activeSituationId: null,

  createSituation: (situation) =>
    set((state) => {
      state.situations[situation.id] = situation;
    }),

  updateSituation: (id, updates) =>
    set((state) => {
      if (state.situations[id]) {
        Object.assign(state.situations[id], updates);
      }
    }),

  resolveSituation: (id) =>
    set((state) => {
      if (state.situations[id]) {
        state.situations[id].status = "resolved";
      }
    }),

  setActiveSituation: (id) =>
    set((state) => {
      state.activeSituationId = id;
    }),

  createFromAlert: (alert) => {
    const id = `sit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const situation: Situation = {
      id,
      title: alert.title,
      severity: PRIORITY_TO_SEVERITY[alert.priority],
      createdAt: alert.timestamp,
      source: alert.source,
      details: alert.body,
      intelligence: [],
      possibleActivity: [],
      relatedAlertIds: [alert.id],
      relatedSimulationIds: [],
      status: "active",
      lat: alert.lat,
      lng: alert.lng,
    };
    set((state) => {
      state.situations[id] = situation;
    });
    return id;
  },
});
