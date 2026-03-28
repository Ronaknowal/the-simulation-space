/**
 * Projects geographic coordinates to screen-space pixels using CesiumJS's
 * 3D globe projection. This respects Earth's curvature — points on the far
 * side of the globe are correctly occluded (return null), and points near
 * the limb curve inward exactly as they appear on the 3D globe.
 *
 * Used to feed screen-space positions to deck.gl's OrthographicView,
 * bypassing deck.gl's flat Mercator projection entirely.
 */
import * as Cesium from "cesium";

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

// Scratch objects to avoid per-point allocation
const _scratchCartesian = new Cesium.Cartesian3();
const _scratchCartographic = new Cesium.Cartographic();

/**
 * Projects a single [lng, lat, altMeters] to screen pixel coords.
 * Returns null if the point is on the far side of the globe (occluded).
 */
export function projectToScreen(
  scene: Cesium.Scene,
  lng: number,
  lat: number,
  altMeters: number = 0
): ScreenPoint | null {
  // Convert geodetic → ECEF Cartesian
  const cartographic = Cesium.Cartographic.fromDegrees(
    lng,
    lat,
    altMeters,
    _scratchCartographic
  );
  const cartesian = Cesium.Cartographic.toCartesian(
    cartographic,
    Cesium.Ellipsoid.WGS84,
    _scratchCartesian
  );

  // Check if point is on the visible side of the globe
  // by checking if the camera can "see" it (dot product test)
  const cameraPos = scene.camera.positionWC;
  const toPoint = Cesium.Cartesian3.subtract(
    cartesian,
    cameraPos,
    new Cesium.Cartesian3()
  );
  const toCenter = Cesium.Cartesian3.negate(cameraPos, new Cesium.Cartesian3());

  // The point's position relative to the globe surface
  // If the angle between camera→point and camera→center is too large,
  // the point is behind the globe horizon
  const cameraHeight = Cesium.Cartesian3.magnitude(cameraPos);
  const EARTH_RADIUS = 6371000; // mean radius
  if (cameraHeight > EARTH_RADIUS) {
    // Horizon angle: the angle from camera-to-center line to the tangent
    const horizonAngle = Math.acos(EARTH_RADIUS / cameraHeight);

    // Angle from camera to this point relative to camera-to-center
    const pointDist = Cesium.Cartesian3.magnitude(cartesian);
    const dotProduct = Cesium.Cartesian3.dot(
      Cesium.Cartesian3.normalize(toPoint, new Cesium.Cartesian3()),
      Cesium.Cartesian3.normalize(toCenter, new Cesium.Cartesian3())
    );
    const angleToPoint = Math.acos(Math.min(1, Math.max(-1, dotProduct)));

    // For surface points, also check: is the surface normal pointing away?
    // A simpler and more robust test: is the point farther than the horizon?
    const surfaceNormal = Cesium.Cartesian3.normalize(
      cartesian,
      new Cesium.Cartesian3()
    );
    const camToPointDir = Cesium.Cartesian3.normalize(
      toPoint,
      new Cesium.Cartesian3()
    );
    const normalDot = Cesium.Cartesian3.dot(surfaceNormal, camToPointDir);

    // If the surface normal points away from the camera, the point is
    // on the far side of the globe
    if (normalDot > 0 && altMeters <= 0) {
      return null;
    }
  }

  // Project to screen using CesiumJS's full pipeline
  const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
    scene,
    cartesian
  );

  if (!screenPos) {
    return null;
  }

  return { x: screenPos.x, y: screenPos.y, visible: true };
}

/**
 * Batch-project an array of points. Returns a Float32Array of [x, y] pairs
 * and a visibility mask. Much more efficient than individual calls.
 *
 * @param scene - CesiumJS scene
 * @param positions - Array of [lng, lat] or [lng, lat, alt] positions
 * @returns Object with screenPositions (Float32Array) and visibleMask (boolean[])
 */
export function batchProjectToScreen(
  scene: Cesium.Scene,
  positions: Array<[number, number] | [number, number, number]>
): { screenPositions: Float32Array; visibleMask: boolean[] } {
  const count = positions.length;
  const screenPositions = new Float32Array(count * 2);
  const visibleMask = new Array<boolean>(count);

  const cameraPos = scene.camera.positionWC;
  const cameraHeight = Cesium.Cartesian3.magnitude(cameraPos);
  const EARTH_RADIUS = 6371000;
  const canOcclude = cameraHeight > EARTH_RADIUS;

  // Reuse scratch objects
  const cartographic = new Cesium.Cartographic();
  const cartesian = new Cesium.Cartesian3();
  const surfaceNormal = new Cesium.Cartesian3();
  const toPoint = new Cesium.Cartesian3();

  for (let i = 0; i < count; i++) {
    const pos = positions[i];
    const lng = pos[0];
    const lat = pos[1];
    const alt = pos[2] ?? 0;

    // Convert geodetic → ECEF
    Cesium.Cartographic.fromDegrees(lng, lat, alt, cartographic);
    Cesium.Cartographic.toCartesian(
      cartographic,
      Cesium.Ellipsoid.WGS84,
      cartesian
    );

    // Occlusion test for surface-level points
    if (canOcclude && alt <= 0) {
      Cesium.Cartesian3.normalize(cartesian, surfaceNormal);
      Cesium.Cartesian3.subtract(cartesian, cameraPos, toPoint);
      const camToPointDir = Cesium.Cartesian3.normalize(
        toPoint,
        new Cesium.Cartesian3()
      );
      const normalDot = Cesium.Cartesian3.dot(surfaceNormal, camToPointDir);
      if (normalDot > 0) {
        screenPositions[i * 2] = -9999;
        screenPositions[i * 2 + 1] = -9999;
        visibleMask[i] = false;
        continue;
      }
    }

    // Project to screen
    const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
      scene,
      cartesian
    );

    if (screenPos) {
      screenPositions[i * 2] = screenPos.x;
      screenPositions[i * 2 + 1] = screenPos.y;
      visibleMask[i] = true;
    } else {
      screenPositions[i * 2] = -9999;
      screenPositions[i * 2 + 1] = -9999;
      visibleMask[i] = false;
    }
  }

  return { screenPositions, visibleMask };
}
