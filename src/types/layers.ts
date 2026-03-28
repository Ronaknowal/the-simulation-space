export type LayerCategory =
  | "maritime" | "aviation" | "satellites" | "weather" | "seismic"
  | "space-weather" | "imagery" | "environmental" | "infrastructure"
  | "population" | "economic" | "osint" | "cameras" | "historical"
  | "markets" | "health" | "social" | "signals" | "news";

export type RenderTarget = "deckgl" | "cesium" | "both";
export type RealtimeSource = "sse" | "websocket" | "polling";

export interface LayerDefinition {
  id: string;
  category: LayerCategory;
  name: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
  renderTarget: RenderTarget;
  realtimeSource?: RealtimeSource;
  refreshInterval?: number;
  maxZoom?: number;
  minZoom?: number;
}

export interface LayerState<T = any> {
  enabled: boolean;
  opacity: number;
  loading: boolean;
  error: string | null;
  data: T | null;
  filters: Record<string, any>;
  lastUpdated: number;
}

export interface LayerCategoryInfo {
  id: LayerCategory;
  name: string;
  icon: string;
  color: string;
}

export const LAYER_CATEGORIES: LayerCategoryInfo[] = [
  { id: "maritime", name: "Maritime", icon: "Ship", color: "#4abba8" },
  { id: "aviation", name: "Aviation", icon: "Plane", color: "#6b9bd2" },
  { id: "satellites", name: "Satellites", icon: "Satellite", color: "#8b7fd4" },
  { id: "weather", name: "Weather", icon: "CloudRain", color: "#6bb8d4" },
  { id: "seismic", name: "Seismic", icon: "Activity", color: "#d46b6b" },
  { id: "space-weather", name: "Space Weather", icon: "Sun", color: "#d4b86b" },
  { id: "imagery", name: "Satellite Imagery", icon: "Image", color: "#6bd49e" },
  { id: "environmental", name: "Environmental", icon: "TreePine", color: "#6bd46b" },
  { id: "infrastructure", name: "Infrastructure", icon: "Building2", color: "#8b9ba8" },
  { id: "population", name: "Population & Social", icon: "Users", color: "#d46ba8" },
  { id: "economic", name: "Economic", icon: "TrendingUp", color: "#9b8bd4" },
  { id: "osint", name: "OSINT", icon: "Shield", color: "#d46b6b" },
  { id: "cameras", name: "Cameras", icon: "Camera", color: "#d49b6b" },
  { id: "historical", name: "Historical Replay", icon: "Clock", color: "#6b6bd4" },
  { id: "markets", name: "Markets & Economic", icon: "TrendingUp", color: "#4a9aba" },
  { id: "health", name: "Health & Humanitarian", icon: "Heart", color: "#6bd4a8" },
  { id: "social", name: "Social & Sentiment", icon: "MessageSquare", color: "#4a9aba" },
  { id: "signals", name: "Signals Intelligence", icon: "Radio", color: "#9b6bd4" },
  { id: "news", name: "News & Media", icon: "Newspaper", color: "#6ba8d4" },
];
