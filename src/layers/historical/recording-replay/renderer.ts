import { ScatterplotLayer } from "@deck.gl/layers";
import { recordingBuffer } from "@/lib/recording-buffer";

// Per-layer color palette (falls back to gray)
const LAYER_COLORS: Record<string, [number, number, number, number]> = {
  "seismic.earthquakes":           [239, 68,  68,  210],
  "seismic.volcanoes":             [249, 115, 22,  210],
  "seismic.tsunamis":              [56,  189, 248, 210],
  "aviation.commercial-flights":   [251, 191, 36,  210],
  "aviation.military-flights":     [239, 68,  68,  210],
  "satellites.active":             [147, 197, 253, 210],
  "satellites.iss":                [167, 243, 208, 210],
  "satellites.debris":             [148, 163, 184, 180],
  "maritime.ais-ships":            [52,  211, 153, 210],
  "maritime.dark-vessels":         [239, 68,  68,  210],
  "maritime.fishing-activity":     [251, 191, 36,  180],
  "environmental.wildfires":       [249, 115, 22,  210],
  "environmental.coral-reefs":     [52,  211, 153, 180],
  "weather.lightning":             [250, 240, 70,  230],
  "weather.current":               [96,  165, 250, 180],
  "population.gdelt-news":         [96,  165, 250, 210],
  "population.conflicts":          [248, 113, 113, 210],
  "population.wikipedia":          [167, 139, 250, 180],
  "infrastructure.airports":       [148, 163, 184, 200],
  "infrastructure.power-plants":   [251, 191, 36,  200],
  "infrastructure.cell-towers":    [100, 240, 200, 180],
  "space-weather.aurora":          [100, 240, 200, 180],
  "osint.gps-jamming":             [239, 68,  68,  200],
  "osint.sanctions":               [249, 115, 22,  200],
  "osint.radiation":               [100, 240, 200, 210],
  "economic.bitcoin-nodes":        [251, 191, 36,  200],
  "signals.kiwisdr":               [178, 136, 255, 210],
};

function layerColor(layerId: string): [number, number, number, number] {
  return LAYER_COLORS[layerId] ?? [148, 163, 184, 180];
}

interface ReplayItem {
  longitude: number;
  latitude: number;
  layerId: string;
  label?: string;
  type?: string;
}

/**
 * Creates a ScatterplotLayer rendering all events from the recording
 * buffer that are visible at `replayTime`.
 * Returns null if there is no data at that time.
 */
export function createRecordingReplayLayer(
  replayTime: number,
  opacity: number = 1
): ScatterplotLayer<ReplayItem> | null {
  const groups = recordingBuffer.getItemsAtTime(replayTime);
  if (groups.length === 0) return null;

  // Flatten all layer groups into a single array for one draw call
  const data: ReplayItem[] = [];
  for (const { layerId, items } of groups) {
    for (const item of items) {
      data.push({
        longitude: item.longitude,
        latitude: item.latitude,
        layerId,
        label: item.label,
        type: item.type,
      });
    }
  }

  if (data.length === 0) return null;

  return new ScatterplotLayer<ReplayItem>({
    id: "recording-replay",
    data,
    pickable: true,
    opacity,
    filled: true,
    stroked: true,
    radiusMinPixels: 3,
    radiusMaxPixels: 12,
    lineWidthMinPixels: 1,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 4000,
    getFillColor: (d) => layerColor(d.layerId),
    getLineColor: [255, 255, 255, 60],
    getLineWidth: 1,
  });
}
