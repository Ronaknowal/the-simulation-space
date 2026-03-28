"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useStore } from "@/store";

// ---------------------------------------------------------------------------
// Controller registry — dynamic imports so controllers only load when their
// layer is enabled. Each controller renders null (invisible data-fetch hook).
// ---------------------------------------------------------------------------

const controllerImports: Record<string, ReturnType<typeof dynamic>> = {};

function registerController(layerId: string, importFn: () => Promise<any>) {
  controllerImports[layerId] = dynamic(importFn, { ssr: false });
}

// ── Seismic ──────────────────────────────────────────────
registerController("seismic.earthquakes", () => import("@/layers/seismic/earthquakes/EarthquakeLayerController"));
registerController("seismic.tectonic-plates", () => import("@/layers/seismic/tectonic-plates/TectonicPlatesController"));
registerController("seismic.volcanoes", () => import("@/layers/seismic/volcanoes/VolcanoLayerController"));
registerController("seismic.tsunamis", () => import("@/layers/seismic/tsunamis/TsunamiLayerController"));

// ── Aviation ─────────────────────────────────────────────
registerController("aviation.commercial-flights", () => import("@/layers/aviation/commercial-flights/FlightLayerController"));
registerController("aviation.military-flights", () => import("@/layers/aviation/military-flights/MilitaryFlightsController"));

// ── Satellites ───────────────────────────────────────────
registerController("satellites.active", () => import("@/layers/satellites/active-satellites/SatelliteLayerController"));
registerController("satellites.iss", () => import("@/layers/satellites/iss/ISSController"));
registerController("satellites.debris", () => import("@/layers/satellites/debris/SpaceDebrisController"));

// ── Maritime ─────────────────────────────────────────────
registerController("maritime.ais-ships", () => import("@/layers/maritime/ais-ships/AISShipsController"));
registerController("maritime.submarine-cables", () => import("@/layers/maritime/submarine-cables/SubmarineCablesController"));
registerController("maritime.fishing-activity", () => import("@/layers/maritime/fishing-activity/FishingActivityController"));
registerController("maritime.dark-vessels", () => import("@/layers/maritime/dark-vessels/DarkVesselsController"));

// ── Weather ──────────────────────────────────────────────
registerController("weather.current", () => import("@/layers/weather/current-weather/CurrentWeatherController"));
registerController("weather.radar", () => import("@/layers/weather/radar/RadarController"));
registerController("weather.wind-particles", () => import("@/layers/weather/wind-particles/WindParticlesController"));
registerController("weather.lightning", () => import("@/layers/weather/lightning/LightningController"));

// ── Space Weather ────────────────────────────────────────
registerController("space-weather.aurora", () => import("@/layers/space-weather/aurora/AuroraController"));
registerController("space-weather.solar-wind", () => import("@/layers/space-weather/solar-wind/SolarWindController"));
registerController("space-weather.neo", () => import("@/layers/space-weather/neo/NEOController"));

// ── Imagery ──────────────────────────────────────────────
registerController("imagery.nasa-gibs", () => import("@/layers/imagery/nasa-gibs/NASAGIBSController"));
registerController("imagery.sentinel2", () => import("@/layers/imagery/sentinel2/Sentinel2Controller"));
registerController("imagery.nightlights", () => import("@/layers/imagery/nightlights/NightlightsController"));

// ── Environmental ────────────────────────────────────────
registerController("environmental.wildfires", () => import("@/layers/environmental/wildfires/WildfiresController"));
registerController("environmental.deforestation", () => import("@/layers/environmental/deforestation/DeforestationController"));
registerController("environmental.ocean-currents", () => import("@/layers/environmental/ocean-currents/OceanCurrentsController"));
registerController("environmental.coral-reefs", () => import("@/layers/environmental/coral-reefs/CoralReefsController"));
registerController("environmental.sea-ice", () => import("@/layers/environmental/sea-ice/SeaIceController"));

// ── Infrastructure ───────────────────────────────────────
registerController("infrastructure.airports", () => import("@/layers/infrastructure/airports/AirportsController"));
registerController("infrastructure.railways", () => import("@/layers/infrastructure/railways/RailwaysController"));
registerController("infrastructure.power-plants", () => import("@/layers/infrastructure/power-plants/PowerPlantsController"));
registerController("infrastructure.cell-towers", () => import("@/layers/infrastructure/cell-towers/CellTowersController"));

// ── Population & Social ──────────────────────────────────
registerController("population.density", () => import("@/layers/population/density/DensityController"));
registerController("population.gdelt-news", () => import("@/layers/population/gdelt-news/GDELTNewsController"));
registerController("population.conflicts", () => import("@/layers/population/conflicts/ConflictsController"));
registerController("population.wikipedia", () => import("@/layers/population/wikipedia/WikipediaController"));

// ── Economic ─────────────────────────────────────────────
registerController("economic.trade-flows", () => import("@/layers/economic/trade-flows/TradeFlowsController"));
registerController("economic.world-bank", () => import("@/layers/economic/world-bank/WorldBankController"));
registerController("economic.bitcoin-nodes", () => import("@/layers/economic/bitcoin-nodes/BitcoinNodesController"));

// ── Markets ──────────────────────────────────────────────
registerController("markets.supply-chain-routes", () => import("@/layers/markets/supply-chain-routes/SupplyChainRoutesController"));
registerController("markets.fred", () => import("@/layers/markets/fred/FredLayerController"));
registerController("markets.yahoo-finance", () => import("@/layers/markets/yahoo-finance/YahooFinanceLayerController"));
registerController("markets.treasury", () => import("@/layers/markets/treasury/TreasuryLayerController"));
registerController("markets.bls", () => import("@/layers/markets/bls/BlsLayerController"));
registerController("markets.eia", () => import("@/layers/markets/eia/EiaLayerController"));
registerController("markets.gscpi", () => import("@/layers/markets/gscpi/GscpiLayerController"));
registerController("markets.usaspending", () => import("@/layers/markets/usaspending/UsaspendingLayerController"));

// ── OSINT ────────────────────────────────────────────────
registerController("osint.gps-jamming", () => import("@/layers/osint/gps-jamming/GPSJammingController"));
registerController("osint.sanctions", () => import("@/layers/osint/sanctions/SanctionsController"));
registerController("osint.border-wait", () => import("@/layers/osint/border-wait/BorderWaitController"));
registerController("osint.radiation", () => import("@/layers/osint/radiation/RadiationController"));

// ── Cameras ──────────────────────────────────────────────
registerController("cameras.webcams", () => import("@/layers/cameras/webcams/WebcamsController"));
registerController("cameras.cctv", () => import("@/layers/cameras/cctv/CCTVController"));

// ── Historical ───────────────────────────────────────────
registerController("historical.timeline", () => import("@/layers/historical/timeline/TimelineController"));

// ── Health & Humanitarian ────────────────────────────────
registerController("health.who-alerts", () => import("@/layers/health/who-alerts/WhoAlertsLayerController"));
registerController("health.reliefweb", () => import("@/layers/health/reliefweb/ReliefwebLayerController"));

// ── Social & Sentiment ───────────────────────────────────
registerController("social.reddit", () => import("@/layers/social/reddit/RedditLayerController"));
registerController("social.bluesky", () => import("@/layers/social/bluesky/BlueskyLayerController"));
registerController("social.telegram", () => import("@/layers/social/telegram/TelegramLayerController"));

// ── Signals Intelligence ─────────────────────────────────
registerController("signals.kiwisdr", () => import("@/layers/signals/kiwisdr/KiwisdrLayerController"));
registerController("signals.patents", () => import("@/layers/signals/patents/PatentsLayerController"));

// ── News & Media ─────────────────────────────────────────
registerController("news.rss-feeds", () => import("@/layers/news/rss-feeds/RssFeedsLayerController"));

// ---------------------------------------------------------------------------
// LayerManager — mounts controller components only for enabled layers
// ---------------------------------------------------------------------------

export default function LayerManager() {
  const layers = useStore((s) => s.layers);

  const enabledControllers = useMemo(() => {
    return Object.entries(layers)
      .filter(([_, state]) => state.enabled)
      .map(([id]) => id)
      .filter((id) => id in controllerImports);
  }, [layers]);

  return (
    <>
      {enabledControllers.map((id) => {
        const Controller = controllerImports[id];
        return Controller ? <Controller key={id} /> : null;
      })}
    </>
  );
}
