"use client";

import { useCallback, useRef, useState } from "react";
import * as Cesium from "cesium";
import CesiumGlobe, { type CesiumGlobeRef } from "@/components/globe/CesiumGlobe";
import DeckOverlay from "@/components/globe/DeckOverlay";
import LayerManager from "@/components/globe/LayerManager";
import { useDeckLayers } from "@/hooks/useDeckLayers";
import { useShaderPipeline } from "@/hooks/useShaderPipeline";
import { useCesiumLayers } from "@/hooks/useCesiumLayers";
import { useAlertEngine } from "@/hooks/useAlertEngine";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function GlobeModule() {
  const cesiumRef = useRef<CesiumGlobeRef>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

  const handleViewerReady = useCallback((v: Cesium.Viewer) => {
    setViewer(v);
  }, []);

  // Initialize hooks that need the viewer
  useDeckLayers();
  useShaderPipeline(viewer);
  useCesiumLayers(viewer);
  useAlertEngine();

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Layer controllers — only enabled layers mount */}
      <LayerManager />

      {/* 3D Globe */}
      <ErrorBoundary name="CesiumGlobe">
        <CesiumGlobe ref={cesiumRef} onViewerReady={handleViewerReady} />
      </ErrorBoundary>

      {/* deck.gl overlay */}
      {viewer && (
        <ErrorBoundary name="DeckOverlay">
          <DeckOverlay viewer={viewer} />
        </ErrorBoundary>
      )}
    </div>
  );
}
