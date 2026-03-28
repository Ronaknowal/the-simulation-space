import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";

describe("Store", () => {
  beforeEach(() => {
    // Reset store state
    useStore.setState({
      layers: {},
      activeModule: "pulse",
      simulations: {},
    });
  });

  it("initializes a layer", () => {
    useStore.getState().initLayer("test.layer");
    const layer = useStore.getState().layers["test.layer"];
    expect(layer).toBeDefined();
    expect(layer.enabled).toBe(false);
    expect(layer.data).toBeNull();
  });

  it("toggles a layer", () => {
    useStore.getState().initLayer("test.layer");
    useStore.getState().toggleLayer("test.layer");
    expect(useStore.getState().layers["test.layer"].enabled).toBe(true);
    useStore.getState().toggleLayer("test.layer");
    expect(useStore.getState().layers["test.layer"].enabled).toBe(false);
  });

  it("sets active module", () => {
    useStore.getState().setActiveModule("globe");
    expect(useStore.getState().activeModule).toBe("globe");
  });

  it("manages alerts with deduplication", () => {
    const alert = {
      priority: "FLASH" as const,
      source: "USGS",
      title: "Earthquake",
      body: "M6.2",
      timestamp: Date.now(),
    };
    useStore.getState().addAlert(alert);
    expect(useStore.getState().alerts.length).toBe(1);
    // Duplicate within 10min window should be ignored
    useStore.getState().addAlert(alert);
    expect(useStore.getState().alerts.length).toBe(1);
  });

  it("starts a simulation", () => {
    const config = {
      agentCount: 500,
      durationMinutes: 30,
      focusSectors: ["Defense"],
      geographicScope: ["Global"],
    };
    const simId = useStore.getState().startSimulation("Test event", config);
    expect(simId).toMatch(/^sim-/);
    expect(useStore.getState().simulations[simId]).toBeDefined();
    expect(useStore.getState().simulations[simId].status).toBe("configuring");
  });

  it("enforces max 5 simulations", () => {
    const config = {
      agentCount: 100,
      durationMinutes: 15,
      focusSectors: [] as string[],
      geographicScope: [] as string[],
    };
    for (let i = 0; i < 5; i++) {
      useStore.getState().startSimulation(`Event ${i}`, config);
    }
    expect(Object.keys(useStore.getState().simulations).length).toBe(5);
    // 6th call returns an id string but does NOT add to the store
    useStore.getState().startSimulation("Event 6", config);
    expect(Object.keys(useStore.getState().simulations).length).toBeLessThanOrEqual(5);
  });
});
