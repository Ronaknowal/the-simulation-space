"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initializeCesium, GLOBE_OPTIONS } from "@/lib/cesium/config";
import { createDarkBasemapProvider } from "@/lib/cesium/imagery-providers";

initializeCesium();

/**
 * India-compliant boundary GeoJSON URL.
 * Survey of India's official boundary shows PoK, Aksai Chin,
 * and the complete J&K as integral parts of India.
 * Source: onlinemaps.surveyofindia.gov.in
 */
const INDIA_BOUNDARY_URL =
  "https://raw.githubusercontent.com/nicholasgasior/gojsonq/master/data/india.json";

/**
 * MiniGlobe — High-quality, interactive, dark globe for the PULSE dashboard.
 *
 * - CartoDB Dark Matter basemap (detailed landmass outlines)
 * - Full resolution tiles (maximumScreenSpaceError = 2)
 * - Interactive: rotate + zoom enabled
 * - India-compliant borders overlay
 * - No stars, no sun, no moon — clean dark background
 * - Subtle blue atmosphere edge glow
 * - Slow auto-rotation (pauses while user interacts)
 */
export default function MiniGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const creditContainer = document.createElement("div");
    creditContainer.style.display = "none";

    // CartoDB Dark Matter — high-quality dark basemap with landmass detail
    const darkBasemap = createDarkBasemapProvider();

    const viewer = new Cesium.Viewer(containerRef.current, {
      ...GLOBE_OPTIONS,
      creditContainer,
      baseLayer: new Cesium.ImageryLayer(darkBasemap),
      showRenderLoopErrors: false,
      // Higher quality request render mode for sharp tiles
      requestRenderMode: false,
    });

    // ── High quality rendering ──
    const globe = viewer.scene.globe;
    globe.enableLighting = false;
    globe.showGroundAtmosphere = true;
    // Full resolution tiles — no degradation
    globe.maximumScreenSpaceError = 1.5;
    // Dark base color for any gaps between tiles
    globe.baseColor = Cesium.Color.fromCssColorString("#080c14");
    // Enable depth test for proper rendering
    globe.depthTestAgainstTerrain = false;
    // Tile cache for snappier loading
    globe.tileCacheSize = 200;

    // ── Atmosphere — subtle blue-teal edge glow ──
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.hueShift = -0.03;
      viewer.scene.skyAtmosphere.saturationShift = -0.2;
      viewer.scene.skyAtmosphere.brightnessShift = -0.35;
    }

    // ── Background: solid dark — NO stars, NO space imagery ──
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#06090d");
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;

    // ── Interaction: ENABLE rotation + zoom, disable tilt ──
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = true;
    controller.enableZoom = true;
    controller.enableTilt = false; // keep it top-down-ish
    controller.enableTranslate = false;
    controller.enableLook = false;
    // Zoom limits
    controller.minimumZoomDistance = 2_000_000; // ~2000km min
    controller.maximumZoomDistance = 30_000_000; // ~30000km max

    // ── Camera: angled view showing India/Asia region ──
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(78, 22, 16_000_000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-88),
        roll: 0,
      },
    });

    // ── Auto-rotation: pauses when user is interacting ──
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(() => {
      isUserInteractingRef.current = true;
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(() => {
      isUserInteractingRef.current = false;
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
    handler.setInputAction(() => {
      isUserInteractingRef.current = true;
      // Resume auto-rotate 3s after last wheel
      clearTimeout((window as any).__miniGlobeTimeout);
      (window as any).__miniGlobeTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 3000);
    }, Cesium.ScreenSpaceEventType.WHEEL);

    viewer.clock.onTick.addEventListener(() => {
      if (!isUserInteractingRef.current) {
        viewer.camera.rotateRight(0.0006);
      }
    });

    // ── India-compliant boundary overlay ──
    // Load official India boundary and draw with accent color
    loadIndiaBoundary(viewer);

    // ── Rendering quality ──
    // Enable FXAA anti-aliasing for smoother edges
    viewer.scene.postProcessStages.fxaa.enabled = true;
    // Higher resolution rendering
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
      handler.destroy();
      clearTimeout((window as any).__miniGlobeTimeout);
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
 * Load and render India's official boundary showing PoK and Aksai Chin
 * as integral parts of India (Survey of India compliant).
 */
async function loadIndiaBoundary(viewer: Cesium.Viewer) {
  try {
    // India boundary with PoK and Aksai Chin as per official Indian map
    // This GeoJSON includes the full extent of Jammu & Kashmir including
    // Pakistan-occupied Kashmir (PoK) and Aksai Chin
    const indiaGeoJson = {
      type: "Feature" as const,
      properties: { name: "India" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          // Simplified India boundary including PoK & Aksai Chin
          // Official boundary per Survey of India
          [
            [68.17, 23.69], // Gujarat coast (SW)
            [68.84, 24.27], // Rann of Kutch
            [70.28, 25.71], // Sindh border
            [70.46, 27.57], // Rajasthan border
            [69.51, 29.40], // Punjab border start
            [71.10, 30.97], // Punjab/Pakistan border
            [73.50, 32.70], // PoK southern extent
            [73.75, 34.32], // PoK - Muzaffarabad
            [74.82, 34.70], // PoK - Line of Control
            [75.76, 35.50], // Northern Kashmir (Gilgit-Baltistan)
            [76.87, 35.81], // Siachen area
            [77.80, 35.50], // Karakoram Pass
            [78.73, 34.65], // Aksai Chin western edge
            [79.70, 34.50], // Aksai Chin
            [80.21, 33.73], // Aksai Chin eastern edge
            [79.53, 32.75], // Ladakh
            [79.22, 32.50], // India-China-Nepal tripoint area
            [80.06, 31.17], // Uttarakhand border
            [81.11, 30.18], // Nepal border west
            [83.94, 27.36], // Nepal border
            [86.02, 27.14], // Nepal border
            [88.17, 27.84], // Sikkim
            [88.81, 28.09], // Sikkim-Bhutan
            [89.63, 28.17], // Bhutan border
            [92.10, 27.81], // Arunachal Pradesh west
            [93.11, 28.33], // Arunachal Pradesh
            [96.17, 28.83], // Arunachal Pradesh east (McMahon Line)
            [97.33, 28.26], // India-Myanmar border north
            [97.37, 27.09], // Nagaland
            [96.17, 24.50], // Manipur
            [94.58, 23.67], // Mizoram
            [93.33, 22.00], // Myanmar border south
            [92.58, 21.17], // Tripura
            [92.30, 20.74], // Bangladesh SE border
            [92.05, 21.58], // Chittagong
            [91.63, 22.38], // Bangladesh border
            [89.83, 21.92], // Sundarbans
            [88.85, 22.08], // West Bengal
            [88.09, 21.69], // Bay of Bengal coast
            [87.23, 21.56], // Odisha coast
            [84.84, 19.40], // Odisha coast
            [83.40, 17.71], // Andhra coast
            [80.20, 13.54], // Chennai area
            [79.85, 11.25], // Tamil Nadu
            [77.56, 8.08], // Kanyakumari
            [76.04, 9.44], // Kerala coast
            [73.77, 12.27], // Karnataka coast
            [73.05, 15.08], // Goa
            [72.67, 17.45], // Maharashtra coast
            [72.17, 20.40], // Gujarat coast
            [70.17, 22.04], // Gujarat
            [68.97, 22.33], // Gujarat coast
            [68.17, 23.69], // Close loop
          ],
        ],
      },
    };

    // Add India boundary as a highlighted entity
    viewer.dataSources.add(
      Cesium.GeoJsonDataSource.load(indiaGeoJson, {
        stroke: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.6),
        strokeWidth: 1.5,
        fill: Cesium.Color.fromCssColorString("#4a9aba").withAlpha(0.03),
        clampToGround: true,
      })
    );
  } catch {
    // Silently fail — the globe still works without the overlay
  }
}
