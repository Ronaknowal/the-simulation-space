"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useStore } from "@/store";
import { ShaderPipeline } from "@/shaders/pipeline";

/**
 * Connects the Zustand shader store to the CesiumJS PostProcessStage pipeline.
 * Reacts to changes in activeShader, bloomEnabled, sharpenEnabled.
 */
export function useShaderPipeline(viewer: Cesium.Viewer | null) {
  const pipelineRef = useRef<ShaderPipeline | null>(null);
  const activeShader = useStore((s) => s.activeShader);
  const bloomEnabled = useStore((s) => s.bloomEnabled);
  const bloomStrength = useStore((s) => s.bloomStrength);
  const sharpenEnabled = useStore((s) => s.sharpenEnabled);
  const sharpenStrength = useStore((s) => s.sharpenStrength);

  // Initialize pipeline when viewer is ready
  useEffect(() => {
    if (!viewer) return;

    const pipeline = new ShaderPipeline(viewer);
    pipelineRef.current = pipeline;

    return () => {
      pipeline.destroy();
      pipelineRef.current = null;
    };
  }, [viewer]);

  // Apply shader mode changes
  useEffect(() => {
    pipelineRef.current?.setMode(activeShader);
  }, [activeShader]);

  // Apply bloom changes
  useEffect(() => {
    pipelineRef.current?.setBloom(bloomEnabled, bloomStrength);
  }, [bloomEnabled, bloomStrength]);

  // Apply sharpen changes
  useEffect(() => {
    pipelineRef.current?.setSharpen(sharpenEnabled, sharpenStrength);
  }, [sharpenEnabled, sharpenStrength]);
}
