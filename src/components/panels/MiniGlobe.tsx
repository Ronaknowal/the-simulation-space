"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initializeCesium, GLOBE_OPTIONS } from "@/lib/cesium/config";

initializeCesium();

export default function MiniGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const creditContainer = document.createElement("div");
    creditContainer.style.display = "none";

    const viewer = new Cesium.Viewer(containerRef.current, {
      ...GLOBE_OPTIONS,
      creditContainer,
      // No base layer — dark wireframe globe
      baseLayer: false,
      showRenderLoopErrors: false,
    });

    // Dark globe appearance
    const globe = viewer.scene.globe;
    globe.enableLighting = false;
    globe.showGroundAtmosphere = false;
    globe.baseColor = Cesium.Color.fromCssColorString("#06090d");

    // Subtle atmosphere glow
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.brightnessShift = -0.3;
    }

    // Dark space background
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#06090d");
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.scene.moon) viewer.scene.moon.show = false;
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;

    // Disable all interaction — this is a display-only mini globe
    viewer.scene.screenSpaceCameraController.enableRotate = false;
    viewer.scene.screenSpaceCameraController.enableZoom = false;
    viewer.scene.screenSpaceCameraController.enableTilt = false;
    viewer.scene.screenSpaceCameraController.enableTranslate = false;

    // Set camera position showing Earth
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(20, 20, 20_000_000),
    });

    // Slow auto-rotation
    viewer.clock.onTick.addEventListener(() => {
      viewer.camera.rotateRight(0.001);
    });

    // Resize guard: skip frames when canvas has zero dimensions (prevents fatal crash)
    const widget = (viewer as any)._cesiumWidget || (viewer as any).cesiumWidget;
    if (widget) {
      const originalRender = widget.render.bind(widget);
      widget.render = function () {
        const canvas = widget._canvas || viewer.scene.canvas;
        if (!canvas || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) {
          widget._canRender = false;
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
      style={{ cursor: "default" }}
    />
  );
}
