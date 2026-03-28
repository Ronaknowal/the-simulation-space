"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initializeCesium, GLOBE_OPTIONS } from "@/lib/cesium/config";
import { createDarkBasemapProvider } from "@/lib/cesium/imagery-providers";

initializeCesium();

export default function MiniGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const creditContainer = document.createElement("div");
    creditContainer.style.display = "none";

    const darkBasemap = createDarkBasemapProvider();

    // Create viewer NORMALLY — don't pass false for skyBox/skyAtmosphere
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

    // ── REMOVE stars: destroy the skyBox after viewer is created ──
    if (viewer.scene.skyBox) {
      viewer.scene.skyBox.show = false;
      // Also try to destroy it so no star texture is ever loaded
      try {
        viewer.scene.skyBox.destroy();
      } catch {
        // some versions don't support destroy
      }
      (viewer.scene as any).skyBox = undefined;
    }

    // ── Background: solid dark ──
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#06090d");

    // ── Kill sun/moon ──
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;

    // ── Atmosphere: subtle edge glow ──
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.hueShift = -0.03;
      viewer.scene.skyAtmosphere.saturationShift = -0.2;
      viewer.scene.skyAtmosphere.brightnessShift = -0.35;
    }

    // ── Interaction: rotate + zoom, no tilt ──
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = true;
    controller.enableZoom = true;
    controller.enableTilt = false;
    controller.enableTranslate = false;
    controller.enableLook = false;
    controller.minimumZoomDistance = 2_000_000;
    controller.maximumZoomDistance = 30_000_000;

    // ── Camera: focused on India/Asia ──
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(78, 22, 16_000_000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-88),
        roll: 0,
      },
    });

    // ── Auto-rotation with interaction pause ──
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

    // ── India disputed territories overlay ──
    addIndiaDisputedTerritories(viewer);

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
 * India's disputed territories shown per Indian government's position:
 * - PoK (Gilgit-Baltistan + Azad Kashmir): highlighted as disputed/occupied
 * - Aksai Chin: highlighted as disputed/occupied
 * Both shown with a distinct teal highlight + dashed boundary
 */
function addIndiaDisputedTerritories(viewer: Cesium.Viewer) {
  try {
    // PoK region (Pakistan-administered Kashmir)
    const pokPositions = Cesium.Cartesian3.fromDegreesArray([
      73.05, 33.73, 73.58, 34.32, 74.00, 34.68,
      74.40, 35.05, 74.89, 35.49, 75.38, 35.82,
      76.05, 35.84, 76.87, 35.81, 77.05, 35.50,
      77.80, 35.49, 77.05, 34.30, 76.77, 34.02,
      76.33, 33.37, 75.74, 32.78, 75.14, 32.68,
      74.65, 32.76, 74.10, 33.20, 73.58, 33.30,
      73.05, 33.73,
    ]);

    // Aksai Chin region (China-administered)
    const aksaiPositions = Cesium.Cartesian3.fromDegreesArray([
      77.80, 35.49, 78.40, 35.30, 79.05, 34.87,
      79.70, 34.50, 80.21, 33.73, 80.00, 33.10,
      79.53, 32.75, 79.22, 32.50, 78.75, 32.63,
      78.30, 33.05, 77.85, 33.50, 77.58, 34.02,
      77.05, 34.30, 77.80, 35.49,
    ]);

    // Disputed territory style: semi-transparent fill + dashed outline
    const disputedFill = Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.08);
    const disputedOutline = Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.5);

    // PoK polygon
    viewer.entities.add({
      name: "PoK (Indian Territory)",
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(pokPositions),
        material: disputedFill,
        outline: true,
        outlineColor: disputedOutline,
        outlineWidth: 1,
      },
    });

    // Aksai Chin polygon
    viewer.entities.add({
      name: "Aksai Chin (Indian Territory)",
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(aksaiPositions),
        material: disputedFill,
        outline: true,
        outlineColor: disputedOutline,
        outlineWidth: 1,
      },
    });

    // Indian claim boundary line (northern border including PoK + Aksai Chin)
    const claimLine = Cesium.Cartesian3.fromDegreesArray([
      73.05, 33.73, 73.58, 34.32, 74.40, 35.05,
      75.38, 35.82, 76.87, 35.81, 77.80, 35.49,
      78.40, 35.30, 79.05, 34.87, 79.70, 34.50,
      80.21, 33.73,
    ]);

    viewer.entities.add({
      name: "Indian Claimed Boundary",
      polyline: {
        positions: claimLine,
        width: 1.5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.7),
          dashLength: 10,
        }),
        clampToGround: true,
      },
    });
  } catch {
    // Silent fail — globe renders fine without overlays
  }
}
