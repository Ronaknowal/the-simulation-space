import type { StateCreator } from "zustand";
import type { RealtimeConnection } from "@/types/store";
import type { AppStore } from "../index";

export interface RealtimeSlice {
  connections: Record<string, RealtimeConnection>;
  setConnectionStatus: (
    id: string,
    status: RealtimeConnection["status"]
  ) => void;
  updateConnection: (id: string, updates: Partial<RealtimeConnection>) => void;
  removeConnection: (id: string) => void;
}

export const createRealtimeSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  RealtimeSlice
> = (set) => ({
  connections: {},

  setConnectionStatus: (id, status) =>
    set((state) => {
      if (state.connections[id]) {
        state.connections[id].status = status;
      }
    }),

  updateConnection: (id, updates) =>
    set((state) => {
      if (!state.connections[id]) {
        state.connections[id] = {
          id,
          type: "sse",
          status: "connecting",
          lastMessage: 0,
          messageCount: 0,
          ...updates,
        };
      } else {
        Object.assign(state.connections[id], updates);
      }
    }),

  removeConnection: (id) =>
    set((state) => {
      delete state.connections[id];
    }),
});
