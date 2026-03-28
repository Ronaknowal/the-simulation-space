"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initializeCesium, GLOBE_OPTIONS } from "@/lib/cesium/config";
import { createDarkBasemapProvider } from "@/lib/cesium/imagery-providers";

initializeCesium();

/**
 * MiniGlobe — A small, dark, Palantir-style globe for the PULSE dashboard.
 *
 * Uses CartoDB Dark Matter basemap for visible landmass outlines on a dark
 * background. No stars, no sun, no moon — just a clean dark globe with
 * subtle atmosphere edge glow and slow auto-rotation.
 */
export default function MiniGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const creditContainer = document.createElement("div");
    creditContainer.style.display = "none";

    // Use CartoDB Dark Matter basemap — shows dark landmasses with subtle borders
    const darkBasemap = createDarkBasemapProvider();

    const viewer = new Cesium.Viewer(containerRef.current, {
      ...GLOBE_OPTIONS,
      creditContainer,
      baseLayer: new Cesium.ImageryLayer(darkBasemap),
      showRenderLoopErrors: false,
    });

    // ── Globe appearance ──
    const globe = viewer.scene.globe;
    globe.enableLighting = false;
    globe.showGroundAtmosphere = true;
    // Dark base color (visible through transparent parts of tiles)
    globe.baseColor = Cesium.Color.fromCssColorString("#080c14");
    // Reduce tile detail for performance in small panel
    globe.maximumScreenSpaceError = 8;

    // ── Atmosphere — subtle blue edge glow like Palantir ──
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      // Shift atmosphere toward blue-teal, dim it down
      viewer.scene.skyAtmosphere.hueShift = -0.05;
      viewer.scene.skyAtmosphere.saturationShift = -0.3;
      viewer.scene.skyAtmosphere.brightnessShift = -0.4;
    }

    // ── Background: solid dark, NO stars ──
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#06090d");
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;

    // ── Disable all user interaction — display only ──
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = false;
    controller.enableZoom = false;
    controller.enableTilt = false;
    controller.enableTranslate = false;
    controller.enableLook = false;

    // ── Camera: tilted slightly for depth, focused on Asia-Europe ──
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(40, 25, 18_000_000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-85),
        roll: 0,
      },
    });

    // ── Slow auto-rotation ──
    viewer.clock.onTick.addEventListener(() => {
      viewer.camera.rotateRight(0.0008);
    });

    // ── Resize guard: skip frames when canvas has zero dimensions ──
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
      style={{ cursor: "default", background: "#06090d" }}
    />
  );
}
