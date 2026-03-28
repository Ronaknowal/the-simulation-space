"use client";

import { useEffect } from "react";
import { useStore } from "@/store";

/**
 * Controller for military flights layer.
 *
 * Military flights share data with commercial-flights (from ADSB.fi).
 * This controller just initializes the layer state so it can be toggled
 * in the UI. The actual filtering (dbFlags & 1) happens in useDeckLayers.
 */
export default function MilitaryFlightsController() {
  const initLayer = useStore((s) => s.initLayer);

  useEffect(() => {
    initLayer("aviation.military-flights");
  }, [initLayer]);

  return null;
}
