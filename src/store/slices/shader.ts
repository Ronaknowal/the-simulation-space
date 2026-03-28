import type { StateCreator } from "zustand";
import type { ShaderMode } from "@/types/store";
import type { AppStore } from "../index";

export interface ShaderSlice {
  activeShader: ShaderMode;
  bloomEnabled: boolean;
  bloomStrength: number;
  sharpenEnabled: boolean;
  sharpenStrength: number;
  lutEnabled: boolean;
  activeLut: string;
  setActiveShader: (mode: ShaderMode) => void;
  setBloomEnabled: (enabled: boolean) => void;
  setBloomStrength: (strength: number) => void;
  setSharpenEnabled: (enabled: boolean) => void;
  setSharpenStrength: (strength: number) => void;
  setLutEnabled: (enabled: boolean) => void;
  setActiveLut: (lut: string) => void;
}

export const createShaderSlice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  ShaderSlice
> = (set) => ({
  activeShader: "none",
  bloomEnabled: false,
  bloomStrength: 0.5,
  sharpenEnabled: false,
  sharpenStrength: 0.5,
  lutEnabled: false,
  activeLut: "cinematic-warm",

  setActiveShader: (mode) =>
    set((state) => {
      state.activeShader = mode;
    }),
  setBloomEnabled: (enabled) =>
    set((state) => {
      state.bloomEnabled = enabled;
    }),
  setBloomStrength: (strength) =>
    set((state) => {
      state.bloomStrength = strength;
    }),
  setSharpenEnabled: (enabled) =>
    set((state) => {
      state.sharpenEnabled = enabled;
    }),
  setSharpenStrength: (strength) =>
    set((state) => {
      state.sharpenStrength = strength;
    }),
  setLutEnabled: (enabled) =>
    set((state) => {
      state.lutEnabled = enabled;
    }),
  setActiveLut: (lut) =>
    set((state) => {
      state.activeLut = lut;
    }),
});
