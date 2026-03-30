// Temporary: will import from store/slices/* after Task 4
// For now, define the combined type shape

import type { LayerState } from "./layers";
import type { RecordingMeta } from "./recording";
import type { SimulationState, SimConfig } from "./simulation";

export type ModuleId = "pulse" | "globe" | "terminal" | "simulation";

export type ShaderMode = "none" | "crt" | "nvg" | "flir" | "anime" | "god";

export type AlertPriority = "FLASH" | "PRIORITY" | "ROUTINE";

export interface CameraBookmark {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  altitude: number;
  heading: number;
  pitch: number;
}

export interface MarketQuoteData {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  currency: string;
  marketState: string;
}

export interface RiskGaugeData {
  vix: number | null;
  hySpread: number | null;
  gscpi: number | null;
  yieldCurve10y2y: number | null;
  lastUpdated: number;
}

export interface TSSAlert {
  id: string;
  priority: AlertPriority;
  source: string;
  title: string;
  body: string;
  timestamp: number;
  dismissed: boolean;
  url?: string;
  lat?: number;
  lng?: number;
}

export interface RealtimeConnection {
  id: string;
  type: "sse" | "websocket";
  status: "connecting" | "connected" | "disconnected" | "error";
  lastMessage: number;
  messageCount: number;
}

// The full AppStore type — will be assembled from slice imports in Task 4
// This file provides shared types that slices reference

// Re-export imported types so store slices can import from a single location
export type { LayerState, RecordingMeta, SimulationState, SimConfig };
