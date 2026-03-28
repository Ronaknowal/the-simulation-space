"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchBitcoinNodes } from "./fetcher";

export default function BitcoinNodesController() {
  useLayerData("economic.bitcoin-nodes", fetchBitcoinNodes, 600_000);
  return null;
}
