import type { SolarWindData } from "./fetcher";

export interface SolarWindDisplay {
  speed: number; // km/s — latest reading
  density: number; // p/cm^3
  bz: number; // nT
  bt: number; // nT
  kpEstimate: string; // Estimated Kp index category
}

/**
 * Estimates a rough Kp index category from solar wind parameters.
 * This is a simplified heuristic — real Kp depends on many factors.
 */
function estimateKp(speed: number, bz: number): string {
  // Southward Bz (negative) + high speed = geomagnetic activity
  const bzFactor = bz < 0 ? Math.abs(bz) : 0;
  const score = (speed / 100) + (bzFactor / 2);

  if (score < 3) return "Quiet (Kp 0-2)";
  if (score < 5) return "Unsettled (Kp 3)";
  if (score < 7) return "Active (Kp 4)";
  if (score < 9) return "Storm (Kp 5-6)";
  return "Severe Storm (Kp 7+)";
}

/**
 * Formats solar wind time-series data for HUD/status bar display.
 * Returns the latest readings and an estimated Kp index.
 * Solar wind is non-spatial — no deck.gl layer is needed.
 */
export function formatSolarWindForDisplay(
  data: SolarWindData[]
): SolarWindDisplay {
  if (data.length === 0) {
    return { speed: 0, density: 0, bz: 0, bt: 0, kpEstimate: "No data" };
  }

  const latest = data[data.length - 1];

  return {
    speed: Math.round(latest.speed),
    density: Math.round(latest.density * 10) / 10,
    bz: Math.round(latest.bz * 10) / 10,
    bt: Math.round(latest.bt * 10) / 10,
    kpEstimate: estimateKp(latest.speed, latest.bz),
  };
}

/**
 * Solar wind is non-spatial time-series data displayed in the HUD.
 * No deck.gl layer is rendered on the globe.
 */
export function createSolarWindLayer() {
  return null;
}
