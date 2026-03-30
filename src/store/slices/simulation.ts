import type { StateCreator } from "zustand";
import type { SimulationState, SimConfig } from "@/types/simulation";
import type { AppStore } from "../index";

export interface SimulationSlice {
  simulations: Record<string, SimulationState>;
  comparisonActive: boolean;
  comparisonIds: string[];
  startSimulation: (seed: string, config: SimConfig) => string;
  updateSimulation: (simId: string, update: Partial<SimulationState>) => void;
  stopSimulation: (simId: string) => void;
  compareSimulations: (simIds: string[]) => void;
  clearComparison: () => void;
}

const MAX_SIMULATIONS = 5;

export const createSimulationSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  SimulationSlice
> = (set) => ({
  simulations: {},
  comparisonActive: false,
  comparisonIds: [],

  startSimulation: (seed, config) => {
    const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => {
      if (Object.keys(state.simulations).length >= MAX_SIMULATIONS) return;
      state.simulations[id] = {
        id,
        seed,
        config,
        status: "configuring",
        statusMessage: null,
        agentCount: config.agentCount,
        elapsed: 0,
        progress: 0,
        agentFeed: [],
        impacts: [],
        dependencyGraph: { nodes: [], edges: [] },
        marketImpacts: [],
        report: null,
        error: null,
        createdAt: Date.now(),
      };
    });
    return id;
  },

  updateSimulation: (simId, update) =>
    set((state) => {
      if (state.simulations[simId]) {
        Object.assign(state.simulations[simId], update);
      }
    }),

  stopSimulation: (simId) =>
    set((state) => {
      if (state.simulations[simId]) {
        state.simulations[simId].status = "failed";
        delete state.simulations[simId];
      }
    }),

  compareSimulations: (simIds) =>
    set((state) => {
      state.comparisonActive = true;
      state.comparisonIds = simIds;
    }),

  clearComparison: () =>
    set((state) => {
      state.comparisonActive = false;
      state.comparisonIds = [];
    }),
});
