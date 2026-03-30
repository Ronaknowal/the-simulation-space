"use client";

import { Monitor, Eye, Crosshair, Palette, Zap, Sparkles } from "lucide-react";
import { useStore } from "@/store";
import type { ShaderMode } from "@/types/store";

const SHADER_MODES: {
  id: ShaderMode;
  name: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { id: "none", name: "Standard", icon: Monitor, description: "Default view — no post-processing" },
  { id: "crt", name: "CRT", icon: Monitor, description: "Retro CRT scanline overlay" },
  { id: "nvg", name: "Night Vision", icon: Eye, description: "Night vision green phosphor" },
  { id: "flir", name: "FLIR", icon: Crosshair, description: "Thermal imaging false color" },
  { id: "anime", name: "Anime", icon: Palette, description: "Cel-shaded cartoon effect" },
  { id: "god", name: "GOD", icon: Zap, description: "All overlays + bloom + sharpen" },
];

export default function ShadersSidebarPanel() {
  const activeShader = useStore((s) => s.activeShader);
  const setActiveShader = useStore((s) => s.setActiveShader);
  const bloomEnabled = useStore((s) => s.bloomEnabled);
  const setBloomEnabled = useStore((s) => s.setBloomEnabled);
  const bloomStrength = useStore((s) => s.bloomStrength);
  const setBloomStrength = useStore((s) => s.setBloomStrength);
  const sharpenEnabled = useStore((s) => s.sharpenEnabled);
  const setSharpenEnabled = useStore((s) => s.setSharpenEnabled);
  const sharpenStrength = useStore((s) => s.sharpenStrength);
  const setSharpenStrength = useStore((s) => s.setSharpenStrength);

  return (
    <div className="flex flex-col">
      {/* Shader modes */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <span className="text-[8px] text-text-disabled uppercase tracking-widest">Shader Mode</span>
        <div className="grid grid-cols-2 gap-1 mt-1.5">
          {SHADER_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeShader === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveShader(mode.id)}
                title={mode.description}
                className={[
                  "flex items-center gap-1.5 px-2 py-1.5 text-[9px] uppercase tracking-wider transition-all",
                  isActive
                    ? "bg-accent text-bg font-bold"
                    : "text-text-disabled hover:text-accent hover:bg-accent-subtle",
                ].join(" ")}
              >
                <Icon size={12} />
                {mode.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bloom controls */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-text-disabled uppercase tracking-widest">Bloom</span>
          <button
            onClick={() => setBloomEnabled(!bloomEnabled)}
            className={`text-[8px] px-2 py-0.5 transition-colors ${
              bloomEnabled ? "text-accent bg-accent-subtle" : "text-text-disabled hover:text-accent"
            }`}
          >
            {bloomEnabled ? "ON" : "OFF"}
          </button>
        </div>
        {bloomEnabled && (
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={bloomStrength}
              onChange={(e) => setBloomStrength(parseFloat(e.target.value))}
              className="flex-1 h-1 appearance-none bg-border accent-accent cursor-pointer"
            />
            <span className="text-[8px] text-text-disabled w-8 text-right">
              {Math.round(bloomStrength * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Sharpen controls */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-text-disabled uppercase tracking-widest">Sharpen</span>
          <button
            onClick={() => setSharpenEnabled(!sharpenEnabled)}
            className={`text-[8px] px-2 py-0.5 transition-colors ${
              sharpenEnabled ? "text-accent bg-accent-subtle" : "text-text-disabled hover:text-accent"
            }`}
          >
            {sharpenEnabled ? "ON" : "OFF"}
          </button>
        </div>
        {sharpenEnabled && (
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sharpenStrength}
              onChange={(e) => setSharpenStrength(parseFloat(e.target.value))}
              className="flex-1 h-1 appearance-none bg-border accent-accent cursor-pointer"
            />
            <span className="text-[8px] text-text-disabled w-8 text-right">
              {Math.round(sharpenStrength * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2">
        <p className="text-[8px] text-text-disabled leading-relaxed">
          Shader effects apply to the Globe view. Switch to GLOBE module to see changes in real-time.
        </p>
      </div>
    </div>
  );
}
