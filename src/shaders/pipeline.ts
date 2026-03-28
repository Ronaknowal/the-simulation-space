import * as Cesium from "cesium";
import type { ShaderMode } from "@/types/store";
import { CRT_FRAGMENT_SHADER } from "./crt-scanlines";
import { NVG_FRAGMENT_SHADER } from "./night-vision";
import { FLIR_FRAGMENT_SHADER } from "./flir-thermal";
import { ANIME_CEL_FRAGMENT_SHADER } from "./anime-cel";
import { SHARPEN_FRAGMENT_SHADER } from "./sharpen";

/**
 * Manages the CesiumJS PostProcessStage pipeline for visual modes.
 * Creates/removes stages based on the active shader mode from the store.
 */
export class ShaderPipeline {
  private viewer: Cesium.Viewer;
  private activeStages: Cesium.PostProcessStage[] = [];
  private startTime: number;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.startTime = Date.now();
  }

  /** Remove all active post-process stages */
  clear() {
    for (const stage of this.activeStages) {
      this.viewer.scene.postProcessStages.remove(stage);
    }
    this.activeStages = [];
  }

  /** Apply a shader mode */
  setMode(mode: ShaderMode) {
    this.clear();

    const canvas = this.viewer.scene.canvas;
    const resolution = new Cesium.Cartesian2(canvas.width, canvas.height);

    switch (mode) {
      case "crt":
        this.addStage("vyom-crt", CRT_FRAGMENT_SHADER, {
          time: 0,
          resolution,
        });
        break;

      case "nvg":
        this.addStage("vyom-nvg", NVG_FRAGMENT_SHADER, {
          time: 0,
          resolution,
        });
        break;

      case "flir":
        this.addStage("vyom-flir", FLIR_FRAGMENT_SHADER, {
          time: 0,
          resolution,
        });
        break;

      case "anime":
        this.addStage("vyom-anime", ANIME_CEL_FRAGMENT_SHADER, {
          resolution,
        });
        break;

      case "god":
        // God mode: CRT + sharpen
        this.addStage("vyom-sharpen", SHARPEN_FRAGMENT_SHADER, {
          resolution,
          strength: 0.5,
        });
        this.addStage("vyom-crt", CRT_FRAGMENT_SHADER, {
          time: 0,
          resolution,
        });
        break;

      case "none":
      default:
        // No post-processing
        break;
    }

    // Start the animation loop for time-based uniforms
    if (mode !== "none") {
      this.startTimeUpdate();
    }
  }

  /** Enable/disable bloom effect */
  setBloom(enabled: boolean, strength: number = 0.5) {
    // CesiumJS has a built-in bloom stage
    const bloom = this.viewer.scene.postProcessStages.bloom;
    bloom.enabled = enabled;
    if (enabled) {
      bloom.uniforms.glowOnly = false;
      bloom.uniforms.brightness = strength;
      bloom.uniforms.contrast = 128;
      bloom.uniforms.delta = 1.0;
      bloom.uniforms.sigma = 3.78;
      bloom.uniforms.stepSize = 1.0;
    }
  }

  /** Enable/disable sharpen */
  setSharpen(enabled: boolean, strength: number = 0.5) {
    // Remove existing sharpen stage
    const existing = this.activeStages.find(
      (s) => (s as any)._name === "vyom-sharpen"
    );
    if (existing) {
      this.viewer.scene.postProcessStages.remove(existing);
      this.activeStages = this.activeStages.filter((s) => s !== existing);
    }

    if (enabled) {
      const canvas = this.viewer.scene.canvas;
      this.addStage("vyom-sharpen", SHARPEN_FRAGMENT_SHADER, {
        resolution: new Cesium.Cartesian2(canvas.width, canvas.height),
        strength,
      });
    }
  }

  private addStage(
    name: string,
    fragmentShader: string,
    uniforms: Record<string, any>
  ) {
    const stage = new Cesium.PostProcessStage({
      name,
      fragmentShader,
      uniforms,
    });
    this.viewer.scene.postProcessStages.add(stage);
    this.activeStages.push(stage);
  }

  private startTimeUpdate() {
    // Update time uniform each frame for animated shaders
    const listener = this.viewer.scene.preRender.addEventListener(() => {
      const elapsed = (Date.now() - this.startTime) / 1000;
      for (const stage of this.activeStages) {
        if (stage.uniforms && "time" in (stage.uniforms as any)) {
          (stage.uniforms as any).time = elapsed;
        }
      }
    });

    // Store cleanup reference
    (this as any)._timeListener = listener;
  }

  /** Destroy the pipeline and clean up */
  destroy() {
    this.clear();
    if ((this as any)._timeListener) {
      (this as any)._timeListener();
    }
  }
}
