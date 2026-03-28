"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchTectonicPlates } from "./fetcher";

export default function TectonicPlatesController() {
  useLayerData("seismic.tectonic-plates", fetchTectonicPlates);
  return null;
}
