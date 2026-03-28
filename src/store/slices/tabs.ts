import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface WorkspaceTab {
  id: string;
  label: string;
  type: "simulation" | "situation" | "analysis" | "default";
  referenceId?: string;  // simId or situationId
  moduleId: string;      // which module to show
  createdAt: number;
}

export interface TabsSlice {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  addTab: (tab: Omit<WorkspaceTab, "id" | "createdAt">) => string;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<WorkspaceTab>) => void;
}

export const createTabsSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  TabsSlice
> = (set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab) => {
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => {
      if (state.tabs.length >= 10) return;
      state.tabs.push({ ...tab, id, createdAt: Date.now() });
      state.activeTabId = id;
      state.activeModule = tab.moduleId as AppStore["activeModule"];
    });
    return id;
  },

  removeTab: (tabId) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return;
      state.tabs.splice(idx, 1);
      if (state.activeTabId === tabId) {
        const prev = state.tabs[idx - 1] ?? state.tabs[0] ?? null;
        state.activeTabId = prev ? prev.id : null;
        if (prev) {
          state.activeModule = prev.moduleId as AppStore["activeModule"];
        }
      }
    });
  },

  setActiveTab: (tabId) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return;
      state.activeTabId = tabId;
      state.activeModule = tab.moduleId as AppStore["activeModule"];
    });
  },

  updateTab: (tabId, updates) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return;
      Object.assign(tab, updates);
    });
  },
});
