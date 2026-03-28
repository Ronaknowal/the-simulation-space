"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useStore } from "@/store";

// ── Seismic ──
import { createEarthquakeLayer } from "@/layers/seismic/earthquakes/renderer";
import { createTectonicPlatesLayer } from "@/layers/seismic/tectonic-plates/renderer";
import { createVolcanoLayer } from "@/layers/seismic/volcanoes/renderer";
import { createTsunamiLayer } from "@/layers/seismic/tsunamis/renderer";

// ── Aviation ──
import {
  createCommercialFlightsLayer,
  createMilitaryFlightsLayer,
} from "@/layers/aviation/commercial-flights/renderer";
import { filterCommercial, filterMilitary } from "@/layers/aviation/commercial-flights/fetcher";

// ── Satellites ──
import { createSatelliteLayer } from "@/layers/satellites/active-satellites/renderer";
import { createISSLayer } from "@/layers/satellites/iss/renderer";
import { createSpaceDebrisLayer } from "@/layers/satellites/debris/renderer";

// ── Maritime ──
import { createSubmarineCablesLayer } from "@/layers/maritime/submarine-cables/renderer";
import { createAISShipsLayer } from "@/layers/maritime/ais-ships/renderer";
import { createFishingActivityLayer } from "@/layers/maritime/fishing-activity/renderer";
import { createDarkVesselsLayer } from "@/layers/maritime/dark-vessels/renderer";

// ── Weather ──
import { createCurrentWeatherLayer } from "@/layers/weather/current-weather/renderer";
import { createLightningLayer } from "@/layers/weather/lightning/renderer";
import { createWindParticlesLayer } from "@/layers/weather/wind-particles/renderer";

// ── Environmental ──
import { createWildfiresLayer } from "@/layers/environmental/wildfires/renderer";
import { createCoralReefsLayer } from "@/layers/environmental/coral-reefs/renderer";
import { createOceanCurrentsLayer } from "@/layers/environmental/ocean-currents/renderer";

// ── Space Weather ──
import { createAuroraLayer } from "@/layers/space-weather/aurora/renderer";

// ── Infrastructure ──
import { createAirportsLayer } from "@/layers/infrastructure/airports/renderer";
import { createPowerPlantsLayer } from "@/layers/infrastructure/power-plants/renderer";
import { createCellTowersLayer } from "@/layers/infrastructure/cell-towers/renderer";
import { createRailwaysLayer } from "@/layers/infrastructure/railways/renderer";

// ── Population ──
import { createGDELTNewsLayer } from "@/layers/population/gdelt-news/renderer";
import { createConflictsLayer } from "@/layers/population/conflicts/renderer";
import { createWikipediaLayer } from "@/layers/population/wikipedia/renderer";

// ── Economic ──
import { createTradeFlowsLayer } from "@/layers/economic/trade-flows/renderer";
import { createSupplyChainRoutesLayer } from "@/layers/markets/supply-chain-routes/renderer";
import { createWorldBankLayer } from "@/layers/economic/world-bank/renderer";
import { createBitcoinNodesLayer } from "@/layers/economic/bitcoin-nodes/renderer";

// ── OSINT ──
import { createGPSJammingLayer } from "@/layers/osint/gps-jamming/renderer";
import { createSanctionsLayer } from "@/layers/osint/sanctions/renderer";
import { createBorderWaitLayer } from "@/layers/osint/border-wait/renderer";
import { createRadiationLayer } from "@/layers/osint/radiation/renderer";

// ── Cameras ──
import { createWebcamsLayer } from "@/layers/cameras/webcams/renderer";
import { createCCTVLayer } from "@/layers/cameras/cctv/renderer";

// ── Signals Intelligence ──
import { createKiwisdrLayer } from "@/layers/signals/kiwisdr/renderer";

// ── Historical ──
import { createTimelineLayer } from "@/layers/historical/timeline/renderer";
import { createRecordingReplayLayer } from "@/layers/historical/recording-replay/renderer";

/**
 * Helper: if a layer is enabled and has data, create it via the factory function.
 * Uses the standard (data, opacity, filters) signature that all renderers share.
 */
// Track which layers have already logged "no data" warnings (outside frozen Zustand state)
const _noDataLogged = new Set<string>();

function addLayer(
  deckLayers: any[],
  layers: Record<string, any>,
  layerId: string,
  factory: (data: any, opacity: number, filters: Record<string, any>) => any
) {
  const state = layers[layerId];
  if (state?.enabled) {
    const hasData = state.data && (Array.isArray(state.data) ? state.data.length > 0 : true);
    if (!hasData) {
      // Only log once per missing-data occurrence
      if (!_noDataLogged.has(layerId)) {
        console.warn(`[addLayer] ${layerId} is enabled but has no data. loading=${state.loading}, error=${state.error}`);
        _noDataLogged.add(layerId);
      }
      return;
    }
    _noDataLogged.delete(layerId);
    try {
      const layer = factory(state.data, state.opacity ?? 1, state.filters ?? {});
      if (layer) {
        deckLayers.push(layer);
      } else {
        console.warn(`[addLayer] ${layerId} factory returned null/undefined`);
      }
    } catch (err) {
      console.warn(`[addLayer] Failed to create layer ${layerId}:`, err);
    }
  }
}

/**
 * Aggregates all active deck.gl layers into a single array
 * for the DeckOverlay component.
 */
// Stable snapshot function to avoid React 19 infinite loop.
// Returns a serialized "fingerprint" of which layers are enabled + have data.
// This is a primitive string, so useSyncExternalStore won't loop.
function getLayerFingerprint(): string {
  const storeState = useStore.getState();
  const layers = storeState.layers;
  const parts: string[] = [];
  for (const [id, state] of Object.entries(layers)) {
    if (state.enabled) {
      const hasData = state.data != null && (Array.isArray(state.data) ? state.data.length > 0 : true);
      parts.push(`${id}:${hasData ? state.lastUpdated : 0}`);
    }
  }
  // Include replay time at 100 ms granularity so replay frames re-render
  if (storeState.isReplaying) {
    parts.push(`replay:${Math.floor(storeState.replayCurrentTime / 100)}`);
  }
  return parts.join("|");
}

export function useDeckLayers() {
  // Subscribe to a stable fingerprint string to trigger re-renders only when
  // layer enable/disable or data updates occur. Avoids the React 19
  // "getSnapshot should be cached" infinite loop from selecting mutable objects.
  const fingerprint = useSyncExternalStore(
    useStore.subscribe,
    getLayerFingerprint,
    getLayerFingerprint
  );

  return useMemo(() => {
    // Read layers inside useMemo so we get the latest state
    // when fingerprint changes trigger a re-compute.
    const layers = useStore.getState().layers;
    const deckLayers: any[] = [];

    // ── Seismic ──
    addLayer(deckLayers, layers, "seismic.earthquakes", createEarthquakeLayer);
    addLayer(deckLayers, layers, "seismic.tectonic-plates", (data, opacity) =>
      createTectonicPlatesLayer(data, opacity)
    );
    addLayer(deckLayers, layers, "seismic.volcanoes", createVolcanoLayer);
    addLayer(deckLayers, layers, "seismic.tsunamis", createTsunamiLayer);

    // ── Aviation ──
    const flights = layers["aviation.commercial-flights"];
    if (flights?.enabled && flights.data) {
      const commercial = filterCommercial(flights.data);
      deckLayers.push(
        createCommercialFlightsLayer(commercial, flights.opacity ?? 1, flights.filters ?? {})
      );
    }

    const milFlights = layers["aviation.military-flights"];
    if (milFlights?.enabled && flights?.data) {
      const military = filterMilitary(flights.data);
      deckLayers.push(
        createMilitaryFlightsLayer(military, milFlights.opacity ?? 1)
      );
    }

    // ── Satellites ──
    addLayer(deckLayers, layers, "satellites.active", createSatelliteLayer);

    // ISS returns array of layers (orbit path + position marker)
    const issState = layers["satellites.iss"];
    if (issState?.enabled && issState.data) {
      try {
        const issLayers = createISSLayer(
          issState.data,
          issState.opacity ?? 1,
          issState.filters ?? {}
        );
        if (Array.isArray(issLayers)) deckLayers.push(...issLayers);
        else if (issLayers) deckLayers.push(issLayers);
      } catch (err) {
        console.warn("Failed to create ISS layer:", err);
      }
    }

    addLayer(deckLayers, layers, "satellites.debris", createSpaceDebrisLayer);

    // ── Maritime ──
    addLayer(deckLayers, layers, "maritime.submarine-cables", (data, opacity) =>
      createSubmarineCablesLayer(data, opacity)
    );
    addLayer(deckLayers, layers, "maritime.ais-ships", createAISShipsLayer);
    addLayer(deckLayers, layers, "maritime.fishing-activity", createFishingActivityLayer);
    addLayer(deckLayers, layers, "maritime.dark-vessels", createDarkVesselsLayer);

    // ── Weather (deck.gl only — radar is Cesium imagery) ──
    addLayer(deckLayers, layers, "weather.current", createCurrentWeatherLayer);
    addLayer(deckLayers, layers, "weather.lightning", createLightningLayer);
    addLayer(deckLayers, layers, "weather.wind-particles", createWindParticlesLayer);

    // ── Environmental (deck.gl only — sea-ice/deforestation are Cesium imagery) ──
    addLayer(deckLayers, layers, "environmental.wildfires", createWildfiresLayer);
    addLayer(deckLayers, layers, "environmental.coral-reefs", createCoralReefsLayer);
    addLayer(deckLayers, layers, "environmental.ocean-currents", createOceanCurrentsLayer);

    // ── Space Weather ──
    addLayer(deckLayers, layers, "space-weather.aurora", createAuroraLayer);
    // solar-wind and neo are HUD-only (no spatial layer)

    // ── Infrastructure ──
    addLayer(deckLayers, layers, "infrastructure.airports", createAirportsLayer);
    addLayer(deckLayers, layers, "infrastructure.power-plants", createPowerPlantsLayer);
    addLayer(deckLayers, layers, "infrastructure.cell-towers", createCellTowersLayer);
    addLayer(deckLayers, layers, "infrastructure.railways", createRailwaysLayer);

    // ── Population (deck.gl only — density is Cesium imagery) ──
    addLayer(deckLayers, layers, "population.gdelt-news", createGDELTNewsLayer);
    addLayer(deckLayers, layers, "population.conflicts", createConflictsLayer);
    addLayer(deckLayers, layers, "population.wikipedia", createWikipediaLayer);

    // ── Markets (terminal-sourced) ──
    const scRoutesState = layers["markets.supply-chain-routes"];
    if (scRoutesState?.enabled && scRoutesState.data) {
      try {
        const scLayers = createSupplyChainRoutesLayer(scRoutesState.data, scRoutesState.opacity ?? 1);
        deckLayers.push(...scLayers);
      } catch (err) {
        console.warn("[useDeckLayers] Failed to create supply chain routes layer:", err);
      }
    }

    // ── Economic ──
    addLayer(deckLayers, layers, "economic.trade-flows", createTradeFlowsLayer);
    addLayer(deckLayers, layers, "economic.world-bank", createWorldBankLayer);
    addLayer(deckLayers, layers, "economic.bitcoin-nodes", createBitcoinNodesLayer);

    // ── OSINT ──
    addLayer(deckLayers, layers, "osint.gps-jamming", createGPSJammingLayer);
    addLayer(deckLayers, layers, "osint.sanctions", createSanctionsLayer);
    addLayer(deckLayers, layers, "osint.border-wait", createBorderWaitLayer);
    addLayer(deckLayers, layers, "osint.radiation", createRadiationLayer);

    // ── Cameras ──
    addLayer(deckLayers, layers, "cameras.webcams", createWebcamsLayer);
    addLayer(deckLayers, layers, "cameras.cctv", createCCTVLayer);

    // ── Historical ──
    addLayer(deckLayers, layers, "historical.timeline", createTimelineLayer);

    // ── Recording Replay overlay (on top of all other layers) ──
    const { isReplaying, replayCurrentTime } = useStore.getState();
    if (isReplaying) {
      try {
        const replayLayer = createRecordingReplayLayer(replayCurrentTime);
        if (replayLayer) deckLayers.push(replayLayer);
      } catch (err) {
        console.warn("[useDeckLayers] Failed to create replay layer:", err);
      }
    }

    // ── Signals Intelligence ──
    // KiwiSDR has geographic data (receiver lat/lon) so it renders on the globe
    const kiwisdrState = layers["signals.kiwisdr"];
    if (kiwisdrState?.enabled && kiwisdrState.data) {
      try {
        const layer = createKiwisdrLayer(kiwisdrState.data, kiwisdrState.opacity ?? 1, kiwisdrState.filters ?? {});
        if (layer) deckLayers.push(layer);
      } catch (err) {
        console.warn("Failed to create KiwiSDR layer:", err);
      }
    }

    return deckLayers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
}
