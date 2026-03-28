import * as Cesium from "cesium";

export interface DeckViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

/**
 * Converts CesiumJS camera state to a deck.gl viewState.
 * Called on every frame via scene.preRender to keep the two canvases in sync.
 *
 * Key insight: deck.gl MapView expects the look-at point on the ground
 * (where the camera is pointing), NOT the camera position in space.
 * We cast a ray from the camera center to the globe to find this point.
 */
export function cesiumToDeckViewState(
  viewer: Cesium.Viewer
): DeckViewState | null {
  const scene = viewer.scene;
  const camera = viewer.camera;
  const canvas = scene.canvas;

  // ── Step 1: Find the look-at point (center of screen → globe intersection) ──
  const centerPixel = new Cesium.Cartesian2(
    canvas.clientWidth / 2,
    canvas.clientHeight / 2
  );
  const ray = camera.getPickRay(centerPixel);
  if (!ray) return null;

  const intersection = scene.globe.pick(ray, scene);
  if (!intersection) {
    // Camera isn't looking at the globe — fall back to camera's nadir point
    const camCarto = camera.positionCartographic;
    if (!camCarto) return null;
    return {
      longitude: Cesium.Math.toDegrees(camCarto.longitude),
      latitude: Cesium.Math.toDegrees(camCarto.latitude),
      zoom: 1,
      pitch: 0,
      bearing: Cesium.Math.toDegrees(camera.heading) % 360,
    };
  }

  const lookAtCarto = Cesium.Cartographic.fromCartesian(intersection);
  const longitude = Cesium.Math.toDegrees(lookAtCarto.longitude);
  const latitude = Cesium.Math.toDegrees(lookAtCarto.latitude);

  // ── Step 2: Compute distance from camera to look-at point ──
  const cameraPosition = camera.positionWC;
  const distance = Cesium.Cartesian3.distance(cameraPosition, intersection);

  // ── Step 3: Convert distance to deck.gl zoom level ──
  // deck.gl WebMercator: at zoom Z, one pixel ≈ (earth_circ / 512) / 2^Z meters
  // The camera sees `distance * 2 * tan(fov/2)` meters across the viewport height,
  // so meters_per_pixel = distance * 2 * tan(fov/2) / viewport_height
  // Setting equal: (earth_circ / 512) / 2^Z = meters_per_pixel
  // => Z = log2( (earth_circ / 512) / meters_per_pixel )
  const fov = (camera.frustum as Cesium.PerspectiveFrustum).fovy ?? 1.0;
  const viewportHeight = canvas.clientHeight || 1;
  const metersPerPixelZoom0 = (2 * Math.PI * 6378137) / 512;
  const metersPerPixel = (distance * 2 * Math.tan(fov / 2)) / viewportHeight;
  const zoom = Math.log2(metersPerPixelZoom0 / metersPerPixel);

  // ── Step 4: Convert pitch and bearing ──
  // Cesium pitch: 0 = horizontal, -PI/2 = looking straight down
  // deck.gl pitch: 0 = looking straight down, 60 = tilted
  const pitch = Math.max(0, Math.min(90 + Cesium.Math.toDegrees(camera.pitch), 85));
  const bearing = Cesium.Math.toDegrees(camera.heading) % 360;

  return {
    longitude,
    latitude,
    zoom: Math.max(0, Math.min(zoom, 24)),
    pitch,
    bearing,
  };
}
