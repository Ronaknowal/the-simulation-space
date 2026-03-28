"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initializeCesium, GLOBE_OPTIONS } from "@/lib/cesium/config";
import { createDarkBasemapProvider } from "@/lib/cesium/imagery-providers";

initializeCesium();

/**
 * MiniGlobe — High-quality interactive globe for the PULSE dashboard.
 *
 * Uses CartoDB Dark Matter (no labels) basemap with an overlay of India's
 * official boundary per Survey of India (datameet/maps composite).
 * The boundary includes PoK, Aksai Chin, and Shaksgam Valley as Indian
 * territory. Disputed areas are highlighted with a distinct overlay.
 */
export default function MiniGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const creditContainer = document.createElement("div");
    creditContainer.style.display = "none";

    const darkBasemap = createDarkBasemapProvider();

    const viewer = new Cesium.Viewer(containerRef.current, {
      ...GLOBE_OPTIONS,
      creditContainer,
      baseLayer: new Cesium.ImageryLayer(darkBasemap),
      showRenderLoopErrors: false,
    });

    // ── Globe quality ──
    const globe = viewer.scene.globe;
    globe.enableLighting = false;
    globe.showGroundAtmosphere = true;
    globe.maximumScreenSpaceError = 1.5;
    globe.baseColor = Cesium.Color.fromCssColorString("#080c14");
    globe.depthTestAgainstTerrain = false;
    globe.tileCacheSize = 200;

    // ── Remove stars completely ──
    if (viewer.scene.skyBox) {
      viewer.scene.skyBox.show = false;
      try { viewer.scene.skyBox.destroy(); } catch { /* noop */ }
      (viewer.scene as any).skyBox = undefined;
    }
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#06090d");
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;

    // ── Atmosphere edge glow ──
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.hueShift = -0.03;
      viewer.scene.skyAtmosphere.saturationShift = -0.2;
      viewer.scene.skyAtmosphere.brightnessShift = -0.35;
    }

    // ── Interaction ──
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = true;
    controller.enableZoom = true;
    controller.enableTilt = false;
    controller.enableTranslate = false;
    controller.enableLook = false;
    controller.minimumZoomDistance = 2_000_000;
    controller.maximumZoomDistance = 30_000_000;

    // ── Camera: focused on India ──
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(78, 22, 16_000_000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-88),
        roll: 0,
      },
    });

    // ── Auto-rotation ──
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let resumeTimeout: ReturnType<typeof setTimeout>;

    handler.setInputAction(() => {
      isUserInteractingRef.current = true;
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(() => {
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 3000);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
    handler.setInputAction(() => {
      isUserInteractingRef.current = true;
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 3000);
    }, Cesium.ScreenSpaceEventType.WHEEL);

    viewer.clock.onTick.addEventListener(() => {
      if (!isUserInteractingRef.current) {
        viewer.camera.rotateRight(0.0006);
      }
    });

    // ── Load India's official boundary (Survey of India compliant) ──
    loadIndiaBoundary(viewer);

    // ── Rendering quality ──
    viewer.scene.postProcessStages.fxaa.enabled = true;
    if (viewer.resolutionScale !== undefined) {
      viewer.resolutionScale = window.devicePixelRatio || 1;
    }

    // ── Resize guard ──
    const widget =
      (viewer as any)._cesiumWidget || (viewer as any).cesiumWidget;
    if (widget) {
      const originalRender = widget.render.bind(widget);
      widget.render = function () {
        const canvas = widget._canvas || viewer.scene.canvas;
        if (!canvas || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) {
          return;
        }
        originalRender();
      };
    }

    viewerRef.current = viewer;

    return () => {
      clearTimeout(resumeTimeout);
      handler.destroy();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: "#06090d" }}
    />
  );
}

/**
 * Load India's official boundary from the pre-processed GeoJSON file.
 * Source: datameet/maps india-composite.geojson (Survey of India compliant)
 * This boundary includes PoK, Aksai Chin, and Shaksgam Valley as Indian territory.
 *
 * The boundary is rendered as a highlighted outline on the globe. Since the
 * CartoDB basemap uses international borders (which do NOT show PoK/Aksai Chin
 * as Indian territory), our overlay draws India's CLAIMED boundary on top,
 * effectively showing the full territory India claims — including the
 * areas occupied by Pakistan and China.
 */
async function loadIndiaBoundary(viewer: Cesium.Viewer) {
  try {
    // Load the Survey of India compliant boundary (simplified to ~100KB)
    const response = await fetch("/geo/india-boundary.geojson");
    if (!response.ok) return;

    const geojson = await response.json();

    // Render India's full boundary as an accent-colored outline
    const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
      stroke: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.5),
      strokeWidth: 1.5,
      fill: Cesium.Color.TRANSPARENT,
      clampToGround: true,
    });

    viewer.dataSources.add(dataSource);

    // Now separately highlight the disputed regions with a visible fill.
    // These coordinates approximate the PoK and Aksai Chin regions that
    // are part of India per Survey of India but shown differently on
    // international maps.

    // PoK (Gilgit-Baltistan + Azad Kashmir)
    // The area between the LoC and the Indian claim line
    viewer.entities.add({
      name: "PoK — Indian Territory (Occupied by Pakistan)",
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray([
            73.0, 33.7, 73.5, 34.3, 74.0, 34.7,
            74.4, 35.0, 74.9, 35.5, 75.4, 35.8,
            76.1, 35.8, 76.9, 35.8, 77.0, 35.5,
            77.8, 35.5, 77.0, 34.3, 76.8, 34.0,
            76.3, 33.4, 75.7, 32.8, 75.1, 32.7,
            74.7, 32.8, 74.1, 33.2, 73.6, 33.3,
            73.0, 33.7,
          ])
        ),
        material: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.15),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.4),
        outlineWidth: 1,
      },
    });

    // Aksai Chin (occupied by China)
    viewer.entities.add({
      name: "Aksai Chin — Indian Territory (Occupied by China)",
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray([
            77.8, 35.5, 78.4, 35.3, 79.1, 34.9,
            79.7, 34.5, 80.2, 33.7, 80.0, 33.1,
            79.5, 32.8, 79.2, 32.5, 78.8, 32.6,
            78.3, 33.1, 77.9, 33.5, 77.6, 34.0,
            77.1, 34.3, 77.8, 35.5,
          ])
        ),
        material: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.15),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.4),
        outlineWidth: 1,
      },
    });
  } catch {
    // Silent fail — globe works without the overlay
  }
}
