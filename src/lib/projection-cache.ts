interface CachedProjection {
  layerId: string;
  cameraHash: string; // hash of camera position to detect changes
  projectedData: any;
  timestamp: number;
}

const cache = new Map<string, CachedProjection>();

// Static layers that only need re-projection on camera change
const STATIC_LAYERS = new Set([
  "seismic.tectonic-plates",
  "seismic.volcanoes",
  "infrastructure.airports",
  "infrastructure.power-plants",
  "infrastructure.railways",
  "maritime.submarine-cables",
  "environmental.coral-reefs",
]);

export function isStaticLayer(layerId: string): boolean {
  return STATIC_LAYERS.has(layerId);
}

export function getCameraHash(camera: {
  longitude: number;
  latitude: number;
  altitude: number;
  heading: number;
  pitch: number;
}): string {
  // Round to reduce unnecessary cache misses from micro-movements
  return `${camera.longitude.toFixed(2)}_${camera.latitude.toFixed(2)}_${camera.altitude.toFixed(0)}_${camera.heading.toFixed(1)}_${camera.pitch.toFixed(1)}`;
}

export function getCachedProjection(
  layerId: string,
  cameraHash: string
): any | null {
  const entry = cache.get(layerId);
  if (entry && entry.cameraHash === cameraHash) {
    return entry.projectedData;
  }
  return null;
}

export function setCachedProjection(
  layerId: string,
  cameraHash: string,
  data: any
): void {
  cache.set(layerId, {
    layerId,
    cameraHash,
    projectedData: data,
    timestamp: Date.now(),
  });
}

export function clearProjectionCache(): void {
  cache.clear();
}
