"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchSubmarineCables } from "./fetcher";

export default function SubmarineCablesController() {
  useLayerData("maritime.submarine-cables", fetchSubmarineCables);
  return null;
}
