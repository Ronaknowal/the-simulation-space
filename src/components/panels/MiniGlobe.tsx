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

    // India boundary overlay removed — using standard international map for now

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

// India boundary overlay available at /geo/india-boundary.geojson (Survey of India compliant)
// Can be re-enabled in the future with proper cartographic styling
