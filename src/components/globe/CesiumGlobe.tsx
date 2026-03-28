"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initializeCesium, DEFAULT_CAMERA_POSITION, GLOBE_OPTIONS } from "@/lib/cesium/config";
import { createArcGISImageryProvider } from "@/lib/cesium/imagery-providers";

// Initialize Cesium on module load
initializeCesium();

export interface CesiumGlobeRef {
  viewer: Cesium.Viewer | null;
}

interface CesiumGlobeProps {
  onViewerReady?: (viewer: Cesium.Viewer) => void;
}

const CesiumGlobe = forwardRef<CesiumGlobeRef, CesiumGlobeProps>(
  ({ onViewerReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Cesium.Viewer | null>(null);

    useImperativeHandle(ref, () => ({
      get viewer() {
        return viewerRef.current;
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      // Create a credit container div to suppress default credit display
      const creditContainer = document.createElement("div");
      creditContainer.style.display = "none";

      const viewer = new Cesium.Viewer(containerRef.current, {
        ...GLOBE_OPTIONS,
        creditContainer,
        baseLayer: new Cesium.ImageryLayer(createArcGISImageryProvider()),
        // Suppress the default Cesium error dialog — we handle render errors
        // ourselves to recover from transient zero-dimension crashes.
        showRenderLoopErrors: false,
      });

      // Configure globe appearance
      const globe = viewer.scene.globe;
      globe.enableLighting = true;
      globe.showGroundAtmosphere = true;
      globe.baseColor = Cesium.Color.fromCssColorString("#070710");

      // Configure atmosphere
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.brightnessShift = -0.2;
      }

      // Set background to dark space
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#050508");

      // Configure sun/moon/skybox
      if (viewer.scene.sun) viewer.scene.sun.show = true;
      if (viewer.scene.moon) viewer.scene.moon.show = true;
      if (viewer.scene.skyBox) viewer.scene.skyBox.show = true;

      // Fly to default position
      viewer.camera.setView(DEFAULT_CAMERA_POSITION);

      // Enable depth testing against terrain
      viewer.scene.globe.depthTestAgainstTerrain = false;

      // Performance: limit max screen-space error for tiles
      globe.maximumScreenSpaceError = 2;

      // ── Resize guard ──
      // CesiumJS crashes fatally with "Expected width to be greater than 0" when
      // the canvas has zero dimensions (happens during HMR / React re-renders).
      // Once the scene's internal _renderError flag is set, the render loop stops
      // permanently and the globe goes black.
      //
      // Fix: monkey-patch CesiumWidget.render() to skip frames when the canvas
      // has zero dimensions. CesiumWidget.render() is the public method called
      // every animation frame; it checks _canRender internally, but the crash
      // occurs in Scene.render() → GlobeDepth.update() before _canRender is
      // recalculated. By guarding here we prevent the crash entirely.
      const widget = (viewer as any)._cesiumWidget || (viewer as any).cesiumWidget;
      if (widget) {
        const originalRender = widget.render.bind(widget);
        widget.render = function () {
          const canvas = widget._canvas || viewer.scene.canvas;
          if (!canvas || canvas.clientWidth <= 0 || canvas.clientHeight <= 0) {
            // Skip this frame — canvas has zero dimensions.
            // Force _canRender false so the internal render loop also skips.
            widget._canRender = false;
            return;
          }
          originalRender();
        };
      }

      // Suppress the Cesium error dialog for width/height errors
      // and auto-recover when dimensions are restored
      viewer.scene.renderError.addEventListener(
        (_scene: Cesium.Scene, error: any) => {
          const msg = error?.message || "";
          if (msg.includes("width") || msg.includes("height")) {
            // Suppress the default error widget display
            if ((viewer as any)._cesiumWidget?._showRenderLoopErrors !== undefined) {
              // Already showing — we'll recover below
            }
            // Schedule recovery
            const recover = () => {
              try {
                if (viewer.isDestroyed()) return;
                const c = viewer.scene.canvas;
                if (c && c.clientWidth > 0 && c.clientHeight > 0) {
                  viewer.resize();
                  // Reset the internal render error flag
                  (viewer.scene as any)._renderError = false;
                  viewer.scene.requestRender();
                } else {
                  // Still zero — retry
                  setTimeout(recover, 200);
                }
              } catch { /* give up */ }
            };
            setTimeout(recover, 100);
          }
        }
      );

      viewerRef.current = viewer;
      onViewerReady?.(viewer);

      return () => {
        viewer.destroy();
        viewerRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />
    );
  }
);

CesiumGlobe.displayName = "CesiumGlobe";
export default CesiumGlobe;
