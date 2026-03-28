"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchTradeFlows } from "./fetcher";

export default function TradeFlowsController() {
  useLayerData("economic.trade-flows", fetchTradeFlows);
  return null;
}
