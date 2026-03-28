"use client";

import { useEffect, useRef, useCallback } from "react";
import { Deck, OrthographicView, COORDINATE_SYSTEM } from "@deck.gl/core";
import { ScatterplotLayer, GeoJsonLayer, PathLayer, ArcLayer } from "@deck.gl/layers";
import * as Cesium from "cesium";
import { getLayerTooltip } from "./layer-tooltips";

interface DeckOverlayProps {
  viewer: Cesium.Viewer | null;
  layers?: any[];
}

// Debug: frame counter for throttled logging
let _debugFrameCounter = 0;

// ── Scratch objects for CesiumJS projection (reused to avoid GC) ──
const _cartographic = new Cesium.Cartographic();
const _cartesian = new Cesium.Cartesian3();
const _normal = new Cesium.Cartesian3();
const _toPoint = new Cesium.Cartesian3();
const _camDir = new Cesium.Cartesian3();

/**
 * Approximate meters-per-pixel at the globe surface center of view.
 */
function getMetersPerPixel(scene: Cesium.Scene): number {
  const cameraHeight = Cesium.Cartesian3.magnitude(scene.camera.positionWC);
  const altitude = Math.max(1000, cameraHeight - 6371000);
  const fov = (scene.camera.frustum as Cesium.PerspectiveFrustum).fovy ?? 1.0;
  return (altitude * 2 * Math.tan(fov / 2)) / (scene.canvas.clientHeight || 1);
}

/** Layer IDs that represent moving objects with heading/track data */
const HEADING_LAYER_IDS = ["aviation-commercial-flights", "aviation-military-flights", "maritime-ais-ships"];

/** Length of heading trail in pixels */
const TRAIL_LENGTH_PX = 18;

/**
 * Checks if a layer should get heading trails based on its ID.
 */
function isHeadingLayer(layerId: string): boolean {
  return HEADING_LAYER_IDS.some((id) => layerId.includes(id));
}

/**
 * Extract the heading/track angle from a data item.
 * Supports `track` (aviation) and `heading`/`course` (maritime).
 * Returns degrees (0 = North, clockwise) or null if unavailable.
 */
function getHeadingDegrees(d: any): number | null {
  if (typeof d.track === "number" && isFinite(d.track)) return d.track;
  if (typeof d.heading === "number" && isFinite(d.heading) && d.heading !== 0) return d.heading;
  if (typeof d.course === "number" && isFinite(d.course)) return d.course;
  return null;
}

/**
 * Project a ScatterplotLayer's data through CesiumJS's 3D globe pipeline.
 * Returns an array of layers: the projected ScatterplotLayer, plus an
 * optional PathLayer for heading trails on flight/ship layers.
 *
 * Points on the back of the globe are automatically filtered out.
 */
function projectScatterplotLayer(
  layer: ScatterplotLayer,
  scene: Cesium.Scene,
  w: number,
  h: number,
  mpp: number
): any[] {
  const props = layer.props as any;
  const data = props.data;
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  const getPos = props.getPosition;
  if (!getPos || typeof getPos !== "function") return [];

  const cameraPos = scene.camera.positionWC;
  const cameraHeight = Cesium.Cartesian3.magnitude(cameraPos);
  const canOcclude = cameraHeight > 6371000;

  const projected: Array<{ _orig: any; _sx: number; _sy: number }> = [];

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    let pos: number[];
    try {
      pos = getPos(d, { index: i, data, target: [] });
    } catch {
      continue;
    }
    if (!pos || pos.length < 2) continue;

    const lng = pos[0];
    const lat = pos[1];
    const alt = pos[2] ?? 0;

    // Geodetic → ECEF
    Cesium.Cartographic.fromDegrees(lng, lat, Math.max(0, alt), _cartographic);
    Cesium.Cartographic.toCartesian(
      _cartographic,
      Cesium.Ellipsoid.WGS84,
      _cartesian
    );

    // Occlusion: surface normal facing away from camera = behind globe
    if (canOcclude && alt <= 100) {
      Cesium.Cartesian3.normalize(_cartesian, _normal);
      Cesium.Cartesian3.subtract(_cartesian, cameraPos, _toPoint);
      Cesium.Cartesian3.normalize(_toPoint, _camDir);
      if (Cesium.Cartesian3.dot(_normal, _camDir) > 0) continue;
    }

    // Project to screen pixels via CesiumJS 3D pipeline
    let sp: Cesium.Cartesian2 | undefined;
    try {
      sp = Cesium.SceneTransforms.worldToWindowCoordinates(scene, _cartesian);
    } catch {
      continue;
    }
    if (!sp) continue;

    // Skip off-screen (with generous margin)
    if (sp.x < -200 || sp.x > w + 200 || sp.y < -200 || sp.y > h + 200) continue;

    projected.push({ _orig: d, _sx: sp.x, _sy: sp.y });
  }

  if (projected.length === 0) return [];

  // Wrap accessor functions to dereference _orig
  const wrap = (acc: any) =>
    typeof acc === "function" ? (d: any, info: any) => acc(d._orig, info) : acc;

  // Convert meter-based radius to pixel radius
  const origRadius = props.getRadius;
  const minPx = props.radiusMinPixels ?? 2;
  const maxPx = props.radiusMaxPixels ?? 40;

  let radiusFn: any;
  if (typeof origRadius === "function") {
    radiusFn = (d: any, info: any) => {
      const meters = origRadius(d._orig, info);
      return Math.max(minPx, Math.min(maxPx, meters / mpp));
    };
  } else {
    const val = origRadius ?? 4;
    radiusFn = Math.max(minPx, Math.min(maxPx, val / mpp));
  }

  const result: any[] = [];

  result.push(
    new ScatterplotLayer({
      id: props.id,
      data: projected,
      pickable: props.pickable ?? false,
      opacity: props.opacity ?? 1,
      stroked: props.stroked ?? false,
      filled: props.filled ?? true,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: (d: any) => [d._sx, d._sy, 0],
      radiusUnits: "pixels" as any,
      radiusScale: 1,
      radiusMinPixels: 0,
      radiusMaxPixels: 9999,
      getRadius: radiusFn,
      getFillColor: wrap(props.getFillColor),
      getLineColor: wrap(props.getLineColor),
      getLineWidth: wrap(props.getLineWidth),
      lineWidthMinPixels: props.lineWidthMinPixels,
      lineWidthMaxPixels: props.lineWidthMaxPixels,
      lineWidthUnits: "pixels" as any,
      updateTriggers: {
        getRadius: [mpp],
      },
    })
  );

  // ── Heading trail for flight/ship layers ──
  // Draws a short directional tail behind each moving object.
  // The trail extends in the OPPOSITE direction of travel (behind the object)
  // so it looks like a wake/trail showing where the object came from.
  if (isHeadingLayer(props.id)) {
    const trails: Array<{ path: number[][]; color: [number, number, number, number] }> = [];

    for (const p of projected) {
      const heading = getHeadingDegrees(p._orig);
      if (heading === null) continue;

      // Convert heading (degrees, 0=North clockwise) to screen angle.
      // Screen coords: +x = right, +y = DOWN. Heading 0 = North = -y direction.
      // We want the TAIL (opposite direction), so add 180 degrees.
      const tailAngleRad = ((heading + 180) * Math.PI) / 180;

      // In screen space: sin = dx (east/right), -cos = dy (screen y is inverted)
      const dx = Math.sin(tailAngleRad) * TRAIL_LENGTH_PX;
      const dy = -Math.cos(tailAngleRad) * TRAIL_LENGTH_PX;

      const tailX = p._sx + dx;
      const tailY = p._sy + dy;

      // Get the fill color for this point to make the trail match
      const fillColor = typeof props.getFillColor === "function"
        ? props.getFillColor(p._orig, {})
        : props.getFillColor || [255, 255, 255, 255];

      trails.push({
        path: [
          [p._sx, p._sy],
          [tailX, tailY],
        ],
        color: [fillColor[0], fillColor[1], fillColor[2], Math.round((fillColor[3] ?? 255) * 0.5)],
      });
    }

    if (trails.length > 0) {
      result.push(
        new PathLayer({
          id: `${props.id}-heading-trails`,
          data: trails,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: 1.5,
          widthUnits: "pixels" as any,
          widthMinPixels: 1,
          widthMaxPixels: 3,
          opacity: props.opacity ?? 1,
          pickable: false,
        })
      );
    }
  }

  return result;
}

/**
 * Project a GeoJSON LineString/MultiLineString through CesiumJS.
 * Converts the GeoJSON into a PathLayer with screen-space coordinates.
 * Line segments that cross behind the globe are clipped.
 */
function projectGeoJsonLayer(
  layer: any,
  scene: Cesium.Scene,
  _w: number,
  _h: number
): PathLayer | null {
  const props = layer.props as any;
  const data = props.data;
  if (!data) return null;

  // Extract features from GeoJSON
  const features = data.features || data;
  if (!Array.isArray(features)) return null;

  const cameraPos = scene.camera.positionWC;
  const cameraHeight = Cesium.Cartesian3.magnitude(cameraPos);
  const canOcclude = cameraHeight > 6371000;

  const paths: Array<{ path: number[][]; color: any; _feature: any }> = [];

  for (const feature of features) {
    const geom = feature.geometry || feature;
    if (!geom || !geom.coordinates) continue;

    // Handle LineString and MultiLineString
    const lineStrings =
      geom.type === "MultiLineString"
        ? geom.coordinates
        : geom.type === "LineString"
          ? [geom.coordinates]
          : [];

    for (const coords of lineStrings) {
      const screenPath: number[][] = [];

      for (const coord of coords) {
        const lng = coord[0];
        const lat = coord[1];

        Cesium.Cartographic.fromDegrees(lng, lat, 0, _cartographic);
        Cesium.Cartographic.toCartesian(
          _cartographic,
          Cesium.Ellipsoid.WGS84,
          _cartesian
        );

        // Occlusion test
        if (canOcclude) {
          Cesium.Cartesian3.normalize(_cartesian, _normal);
          Cesium.Cartesian3.subtract(_cartesian, cameraPos, _toPoint);
          Cesium.Cartesian3.normalize(_toPoint, _camDir);
          if (Cesium.Cartesian3.dot(_normal, _camDir) > 0) {
            // Behind globe — break the path segment
            if (screenPath.length >= 2) {
              paths.push({ path: [...screenPath], color: props.getLineColor || [249, 115, 22, 200], _feature: feature });
            }
            screenPath.length = 0;
            continue;
          }
        }

        let sp: Cesium.Cartesian2 | undefined;
        try {
          sp = Cesium.SceneTransforms.worldToWindowCoordinates(scene, _cartesian);
        } catch {
          continue;
        }
        if (!sp) {
          if (screenPath.length >= 2) {
            paths.push({ path: [...screenPath], color: props.getLineColor || [249, 115, 22, 200], _feature: feature });
          }
          screenPath.length = 0;
          continue;
        }

        screenPath.push([sp.x, sp.y]);
      }

      if (screenPath.length >= 2) {
        paths.push({ path: screenPath, color: props.getLineColor || [249, 115, 22, 200], _feature: feature });
      }
    }
  }

  if (paths.length === 0) return null;

  return new PathLayer({
    id: props.id,
    data: paths,
    pickable: props.pickable ?? false,
    opacity: props.opacity ?? 1,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    getPath: (d: any) => d.path,
    getColor: (d: any) => d.color,
    getWidth: props.getLineWidth ?? 2,
    widthUnits: "pixels" as any,
    widthMinPixels: props.lineWidthMinPixels ?? 1,
    widthMaxPixels: props.lineWidthMaxPixels ?? 4,
  });
}

/**
 * Project a raw PathLayer (e.g. ISS orbit path) through CesiumJS.
 * Each path datum has a `path` accessor returning [lng, lat, alt] arrays.
 * Segments behind the globe are clipped. Altitude is used for projection.
 */
function projectPathLayer(
  layer: PathLayer,
  scene: Cesium.Scene,
  _w: number,
  _h: number
): PathLayer | null {
  const props = layer.props as any;
  const data = props.data;
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const getPath = props.getPath;
  if (!getPath || typeof getPath !== "function") return null;

  const cameraPos = scene.camera.positionWC;
  const cameraHeight = Cesium.Cartesian3.magnitude(cameraPos);
  const canOcclude = cameraHeight > 6371000;

  const projectedPaths: Array<{ path: number[][]; color: any }> = [];

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    let pathCoords: number[][];
    try {
      pathCoords = getPath(d, { index: i, data, target: [] });
    } catch {
      continue;
    }
    if (!pathCoords || !Array.isArray(pathCoords) || pathCoords.length < 2) continue;

    const screenPath: number[][] = [];

    for (const coord of pathCoords) {
      const lng = coord[0];
      const lat = coord[1];
      const alt = coord[2] ?? 0;

      Cesium.Cartographic.fromDegrees(lng, lat, Math.max(0, alt), _cartographic);
      Cesium.Cartographic.toCartesian(
        _cartographic,
        Cesium.Ellipsoid.WGS84,
        _cartesian
      );

      // Occlusion test (skip for high-altitude paths like ISS orbit at ~400km)
      if (canOcclude && alt <= 50000) {
        Cesium.Cartesian3.normalize(_cartesian, _normal);
        Cesium.Cartesian3.subtract(_cartesian, cameraPos, _toPoint);
        Cesium.Cartesian3.normalize(_toPoint, _camDir);
        if (Cesium.Cartesian3.dot(_normal, _camDir) > 0) {
          // Behind globe — break the path segment
          if (screenPath.length >= 2) {
            projectedPaths.push({
              path: [...screenPath],
              color: props.getColor || [100, 200, 255, 80],
            });
          }
          screenPath.length = 0;
          continue;
        }
      }

      let sp: Cesium.Cartesian2 | undefined;
      try {
        sp = Cesium.SceneTransforms.worldToWindowCoordinates(scene, _cartesian);
      } catch {
        continue;
      }
      if (!sp) {
        if (screenPath.length >= 2) {
          projectedPaths.push({
            path: [...screenPath],
            color: props.getColor || [100, 200, 255, 80],
          });
        }
        screenPath.length = 0;
        continue;
      }

      screenPath.push([sp.x, sp.y]);
    }

    if (screenPath.length >= 2) {
      projectedPaths.push({
        path: screenPath,
        color: props.getColor || [100, 200, 255, 80],
      });
    }
  }

  if (projectedPaths.length === 0) return null;

  return new PathLayer({
    id: props.id,
    data: projectedPaths,
    pickable: props.pickable ?? false,
    opacity: props.opacity ?? 1,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    getPath: (d: any) => d.path,
    getColor: (d: any) => d.color,
    getWidth: props.getWidth ?? 1,
    widthUnits: "pixels" as any,
    widthMinPixels: props.widthMinPixels ?? 1,
    widthMaxPixels: props.widthMaxPixels ?? 4,
  });
}

/**
 * Project an ArcLayer through CesiumJS's 3D globe pipeline.
 *
 * Since deck.gl ArcLayer draws 3D arcs in its own coordinate space, we can't
 * use it directly with our screen-space projection. Instead, we convert each
 * arc into a multi-segment PathLayer that follows a great-circle path.
 *
 * Each arc is discretized into N segments, with each point projected through
 * CesiumJS. Points behind the globe are clipped, maintaining correct occlusion.
 */
function projectArcLayer(
  layer: ArcLayer,
  scene: Cesium.Scene,
  w: number,
  h: number
): PathLayer | null {
  const props = layer.props as any;
  const data = props.data;
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const getSource = props.getSourcePosition;
  const getTarget = props.getTargetPosition;
  if (typeof getSource !== "function" || typeof getTarget !== "function") return null;

  const cameraPos = scene.camera.positionWC;
  const cameraHeight = Cesium.Cartesian3.magnitude(cameraPos);
  const canOcclude = cameraHeight > 6371000;

  const ARC_SEGMENTS = 48; // More segments = cleaner horizon clipping
  const MAX_ARC_HEIGHT = 0.15; // Max height as fraction of arc distance in radians

  const paths: Array<{ path: number[][]; color: [number, number, number, number]; width: number }> = [];

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    let srcPos: number[];
    let tgtPos: number[];
    try {
      srcPos = getSource(d, { index: i, data, target: [] });
      tgtPos = getTarget(d, { index: i, data, target: [] });
    } catch { continue; }

    if (!srcPos || !tgtPos || srcPos.length < 2 || tgtPos.length < 2) continue;

    // Compute great-circle arc points with altitude for visual height
    const srcCart = Cesium.Cartographic.fromDegrees(srcPos[0], srcPos[1], 0);
    const tgtCart = Cesium.Cartographic.fromDegrees(tgtPos[0], tgtPos[1], 0);

    // Angular distance between source and target
    const srcCartesian = Cesium.Cartesian3.fromRadians(srcCart.longitude, srcCart.latitude, 0);
    const tgtCartesian = Cesium.Cartesian3.fromRadians(tgtCart.longitude, tgtCart.latitude, 0);
    const angularDist = Cesium.Cartesian3.angleBetween(srcCartesian, tgtCartesian);

    // Arc height proportional to distance (capped)
    const arcMaxHeight = Math.min(angularDist * MAX_ARC_HEIGHT, 0.3) * 6371000; // meters

    const screenPath: number[][] = [];

    // Use spherical interpolation (SLERP on lat/lng) instead of
    // Cartesian3.lerp which cuts a straight line through the earth.
    const srcLon = srcCart.longitude; // radians
    const srcLat = srcCart.latitude;
    const tgtLon = tgtCart.longitude;
    const tgtLat = tgtCart.latitude;

    for (let s = 0; s <= ARC_SEGMENTS; s++) {
      const t = s / ARC_SEGMENTS;

      // Interpolate on the sphere surface (geodesic lerp in lat/lng)
      const interpLon = srcLon + (tgtLon - srcLon) * t;
      const interpLat = srcLat + (tgtLat - srcLat) * t;

      // Parabolic height profile: peak at midpoint
      const heightFraction = 4 * t * (1 - t); // 0 at ends, 1 at midpoint
      const alt = arcMaxHeight * heightFraction;

      const interpCarto = new Cesium.Cartographic(interpLon, interpLat, alt);

      Cesium.Cartographic.toCartesian(
        interpCarto,
        Cesium.Ellipsoid.WGS84,
        _cartesian
      );

      // Occlusion test (skip for elevated arc points)
      if (canOcclude && alt < 50000) {
        Cesium.Cartesian3.normalize(_cartesian, _normal);
        Cesium.Cartesian3.subtract(_cartesian, cameraPos, _toPoint);
        Cesium.Cartesian3.normalize(_toPoint, _camDir);
        if (Cesium.Cartesian3.dot(_normal, _camDir) > 0) {
          // Behind globe — break path
          if (screenPath.length >= 2) {
            paths.push({
              path: [...screenPath],
              color: getArcColor(props, d, i, true),
              width: getArcWidth(props, d, i),
            });
          }
          screenPath.length = 0;
          continue;
        }
      }

      let sp: Cesium.Cartesian2 | undefined;
      try {
        sp = Cesium.SceneTransforms.worldToWindowCoordinates(scene, _cartesian);
      } catch { continue; }
      if (!sp) {
        if (screenPath.length >= 2) {
          paths.push({
            path: [...screenPath],
            color: getArcColor(props, d, i, true),
            width: getArcWidth(props, d, i),
          });
        }
        screenPath.length = 0;
        continue;
      }

      if (sp.x < -500 || sp.x > w + 500 || sp.y < -500 || sp.y > h + 500) continue;

      screenPath.push([sp.x, sp.y]);
    }

    if (screenPath.length >= 2) {
      // Use gradient: source color → target color by interpolating at midpoint
      paths.push({
        path: screenPath,
        color: getArcColor(props, d, i, false),
        width: getArcWidth(props, d, i),
      });
    }
  }

  if (paths.length === 0) return null;

  return new PathLayer({
    id: props.id,
    data: paths,
    pickable: props.pickable ?? false,
    opacity: props.opacity ?? 1,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    getPath: (d: any) => d.path,
    getColor: (d: any) => d.color,
    getWidth: (d: any) => d.width,
    widthUnits: "pixels" as any,
    widthMinPixels: 1,
    widthMaxPixels: 5,
  });
}

/** Extract arc source/target color, blending for the path representation */
function getArcColor(props: any, d: any, i: number, _isSource: boolean): [number, number, number, number] {
  const srcColor = resolveColor(props.getSourceColor, d, i) || [0, 212, 255, 180];
  const tgtColor = resolveColor(props.getTargetColor, d, i) || [168, 85, 247, 180];
  // Blend source and target colors
  return [
    Math.round((srcColor[0] + tgtColor[0]) / 2),
    Math.round((srcColor[1] + tgtColor[1]) / 2),
    Math.round((srcColor[2] + tgtColor[2]) / 2),
    Math.round(((srcColor[3] ?? 255) + (tgtColor[3] ?? 255)) / 2),
  ];
}

/** Resolve a color accessor (function or constant) */
function resolveColor(accessor: any, d: any, i: number): [number, number, number, number] | null {
  if (!accessor) return null;
  if (typeof accessor === "function") {
    try { return accessor(d, { index: i }); } catch { return null; }
  }
  if (Array.isArray(accessor)) return accessor as [number, number, number, number];
  return null;
}

/** Extract arc width */
function getArcWidth(props: any, d: any, i: number): number {
  const getWidth = props.getWidth;
  if (typeof getWidth === "function") {
    try { return Math.max(1, getWidth(d, { index: i })); } catch { return 2; }
  }
  if (typeof getWidth === "number") return getWidth;
  return 2;
}

/**
 * DeckOverlay renders deck.gl layers overlaid on the CesiumJS globe.
 *
 * All points are projected through CesiumJS's 3D globe pipeline to get
 * true screen-space pixel positions that perfectly respect Earth's curvature.
 * Points behind the globe are automatically filtered out (true occlusion).
 *
 * Uses OrthographicView in CARTESIAN coordinates — deck.gl is just a pixel
 * renderer, CesiumJS handles all the 3D globe math.
 */
export default function DeckOverlay({ viewer, layers = [] }: DeckOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any>(null);
  // Store layers in a ref so syncAndProject never changes identity.
  // This prevents the Deck instance from being destroyed/recreated on every data update.
  const layersRef = useRef<any[]>(layers);
  layersRef.current = layers;

  const syncAndProject = useCallback(() => {
    if (!viewer || !deckRef.current || !containerRef.current) return;

    const scene = viewer.scene;
    const canvas = scene.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Guard: canvas not ready
    if (w <= 0 || h <= 0) return;

    const mpp = getMetersPerPixel(scene);
    const projectedLayers: any[] = [];
    const currentLayers = layersRef.current;

    // Debug: log layer stats every ~120 frames (~2s at 60fps)
    const debugFrame = (++_debugFrameCounter % 120 === 0);

    for (const layer of currentLayers) {
      if (layer instanceof ScatterplotLayer) {
        const projected = projectScatterplotLayer(layer, scene, w, h, mpp);
        if (debugFrame && projected.length > 0) {
          const pts = (projected[0]?.props as any)?.data?.length ?? 0;
          console.debug(`[DeckOverlay] ScatterplotLayer "${(layer.props as any).id}" → ${pts} projected points`);
        }
        projectedLayers.push(...projected);
      } else if (layer instanceof GeoJsonLayer) {
        const projected = projectGeoJsonLayer(layer, scene, w, h);
        if (projected) projectedLayers.push(projected);
      } else if (layer instanceof PathLayer) {
        const projected = projectPathLayer(layer, scene, w, h);
        if (projected) projectedLayers.push(projected);
      } else if (layer instanceof ArcLayer) {
        const projected = projectArcLayer(layer, scene, w, h);
        if (projected) projectedLayers.push(projected);
      } else {
        // Unknown layer type — skip
      }
    }

    if (debugFrame && currentLayers.length > 0) {
      console.debug(`[DeckOverlay] ${currentLayers.length} input layers → ${projectedLayers.length} projected layers`);
    }

    deckRef.current.setProps({
      width: w,
      height: h,
      layers: projectedLayers,
      viewState: {
        target: [w / 2, h / 2, 0],
        zoom: 0,
      },
    });
  }, [viewer]);

  useEffect(() => {
    if (!containerRef.current || !viewer) return;

    const canvas = viewer.scene.canvas;
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;

    const deck = new Deck({
      parent: containerRef.current,
      controller: false,
      views: new OrthographicView({}),
      viewState: {
        target: [w / 2, h / 2, 0],
        zoom: 0,
      },
      width: w,
      height: h,
      layers: [],
      useDevicePixels: true,
      style: { pointerEvents: "none" },
    });

    // Fix deck.gl's internal canvas layout after it finishes initializing.
    // deck.gl v9 creates two canvases:
    //   1. An internal overlay canvas (huge default size, no position:absolute)
    //   2. The actual WebGL rendering canvas (position:absolute, 100% size)
    // The overlay canvas blocks the rendering canvas. We hide it.
    // IMPORTANT: The entire container + all canvases must have pointer-events: none
    // so that mouse events pass through to the CesiumJS globe underneath.
    // deck.gl overrides the container's styles (cursor, touch-action, etc.),
    // so we must forcefully re-apply pointer-events after init.
    const fixPointerEvents = () => {
      if (!containerRef.current) return;
      // Force container to not intercept any mouse/touch events
      containerRef.current.style.pointerEvents = "none";
      containerRef.current.style.cursor = "unset";
      containerRef.current.style.touchAction = "unset";
      containerRef.current.style.userSelect = "unset";

      const allCanvases = containerRef.current.querySelectorAll("canvas");
      allCanvases.forEach((c: HTMLCanvasElement) => {
        if (c.style.position !== "absolute") {
          c.style.display = "none";
        }
        c.style.pointerEvents = "none";
      });
    };
    // Apply fix immediately and after deck.gl finishes async init
    requestAnimationFrame(fixPointerEvents);
    setTimeout(fixPointerEvents, 100);
    setTimeout(fixPointerEvents, 500);

    // Watch for deck.gl re-applying its styles (it does this on various events)
    const observer = new MutationObserver(() => {
      if (containerRef.current && containerRef.current.style.pointerEvents !== "none") {
        fixPointerEvents();
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current, { attributes: true, attributeFilter: ["style"] });
    }

    deckRef.current = deck;

    // Sync on every CesiumJS render frame
    const removeListener =
      viewer.scene.preRender.addEventListener(syncAndProject);

    // ── Manual tooltip picking via Cesium's mouse events ──
    // Since deck.gl canvases have pointer-events:none (so globe interaction works),
    // we listen for mouse moves on the Cesium canvas and forward to deck.pickObject().
    const tooltipDiv = document.createElement("div");
    tooltipDiv.style.cssText =
      "position:fixed;pointer-events:none;z-index:9999;background:rgba(0,0,0,0.85);" +
      "color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;max-width:320px;" +
      "line-height:1.4;display:none;border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(4px);";
    document.body.appendChild(tooltipDiv);

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: any) => {
      if (!deckRef.current) return;
      const pos = movement.endPosition;
      if (!pos) return;

      try {
        const pickInfo = deckRef.current.pickObject({
          x: pos.x,
          y: pos.y,
          radius: 10,
        });

        if (pickInfo && pickInfo.object) {
          // Unwrap projected data: ScatterplotLayer wraps in {_orig}, GeoJSON PathLayer uses {_feature}
          const orig = pickInfo.object._orig || pickInfo.object._feature || pickInfo.object;
          const layerId = pickInfo.layer?.id || "";
          const tooltipResult = getLayerTooltip(layerId, orig);

          if (tooltipResult) {
            const html = typeof tooltipResult === "string" ? tooltipResult : (tooltipResult as any).html || "";
            if (html) {
              tooltipDiv.innerHTML = html;
              tooltipDiv.style.display = "block";
              // Position tooltip near cursor
              const tx = Math.min(pos.x + 16, window.innerWidth - 340);
              const ty = Math.min(pos.y + 16, window.innerHeight - 200);
              tooltipDiv.style.left = tx + "px";
              tooltipDiv.style.top = ty + "px";
              return;
            }
          }
        }
      } catch {
        // Picking can fail during transitions
      }

      tooltipDiv.style.display = "none";
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // ── Click handler for interactive layers (webcams, CCTV) ──
    // Opens webcam player or CCTV image in a new tab when clicked.
    handler.setInputAction((movement: any) => {
      if (!deckRef.current) return;
      const pos = movement.position;
      if (!pos) return;

      try {
        const pickInfo = deckRef.current.pickObject({
          x: pos.x,
          y: pos.y,
          radius: 10,
        });

        if (pickInfo && pickInfo.object) {
          const orig = pickInfo.object._orig || pickInfo.object._feature || pickInfo.object;
          const layerId = pickInfo.layer?.id || "";

          // Webcam click: open live player
          if (layerId === "cameras-webcams") {
            const playerUrl = orig.player;
            if (playerUrl) {
              window.open(playerUrl, "_blank", "noopener,noreferrer");
            }
          }

          // CCTV click: open image/stream
          if (layerId === "cameras-cctv") {
            const imageUrl = orig.url;
            if (imageUrl) {
              window.open(imageUrl, "_blank", "noopener,noreferrer");
            }
          }
        }
      } catch {
        // Picking can fail during transitions
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      observer.disconnect();
      removeListener();
      handler.destroy();
      tooltipDiv.remove();
      deck.finalize();
      deckRef.current = null;
    };
  }, [viewer, syncAndProject]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
