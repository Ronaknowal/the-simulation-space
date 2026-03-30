import type { StateCreator } from "zustand";
import type { TSSAlert } from "@/types/store";
import type { AppStore } from "../index";

export interface AlertSlice {
  alerts: TSSAlert[];
  addAlert: (alert: Omit<TSSAlert, "id" | "dismissed">) => void;
  dismissAlert: (id: string) => void;
  clearDismissed: () => void;
}

export const createAlertSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  AlertSlice
> = (set) => ({
  alerts: [],

  addAlert: (alert) =>
    set((state) => {
      const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      // De-duplicate by title+source within 10 min window
      const recent = Date.now() - 10 * 60_000;
      const exists = state.alerts.some(
        (a) =>
          !a.dismissed &&
          a.title === alert.title &&
          a.source === alert.source &&
          a.timestamp > recent
      );
      if (!exists) {
        state.alerts.unshift({ ...alert, id, dismissed: false });
        // Keep max 100 alerts
        if (state.alerts.length > 100)
          state.alerts = state.alerts.slice(0, 100);
      }
    }),

  dismissAlert: (id) =>
    set((state) => {
      const alert = state.alerts.find((a) => a.id === id);
      if (alert) alert.dismissed = true;
    }),

  clearDismissed: () =>
    set((state) => {
      state.alerts = state.alerts.filter((a) => !a.dismissed);
    }),
});
