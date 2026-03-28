import type { NearEarthObject } from "./fetcher";

export interface NEODisplayData {
  totalCount: number;
  hazardousCount: number;
  closestApproach: {
    name: string;
    missDistance: number; // km
    velocity: number; // km/s
  } | null;
  largestObject: {
    name: string;
    estimatedDiameter: number; // meters
    isPotentiallyHazardous: boolean;
  } | null;
  objects: NearEarthObject[];
}

/**
 * Formats NEO data for HUD/panel display.
 * NEOs are in space, not on Earth's surface — no spatial layer is rendered.
 * Returns summary statistics: total count, closest approach, largest object.
 */
export function formatNEOForDisplay(data: NearEarthObject[]): NEODisplayData {
  if (data.length === 0) {
    return {
      totalCount: 0,
      hazardousCount: 0,
      closestApproach: null,
      largestObject: null,
      objects: [],
    };
  }

  const hazardousCount = data.filter((d) => d.isPotentiallyHazardous).length;

  // Find closest approach
  const sorted = [...data].sort((a, b) => a.missDistance - b.missDistance);
  const closest = sorted[0];

  // Find largest object
  const bySize = [...data].sort(
    (a, b) => b.estimatedDiameter - a.estimatedDiameter
  );
  const largest = bySize[0];

  return {
    totalCount: data.length,
    hazardousCount,
    closestApproach: closest
      ? {
          name: closest.name,
          missDistance: closest.missDistance,
          velocity: closest.relativeVelocity,
        }
      : null,
    largestObject: largest
      ? {
          name: largest.name,
          estimatedDiameter: largest.estimatedDiameter,
          isPotentiallyHazardous: largest.isPotentiallyHazardous,
        }
      : null,
    objects: data,
  };
}

/**
 * NEOs are non-spatial (in orbital space, not on Earth's surface).
 * Data is displayed in HUD/panel overlays. No deck.gl layer is rendered.
 */
export function createNEOLayer() {
  return null;
}
