import { ScatterplotLayer } from "@deck.gl/layers";
import type { WeatherStation } from "./fetcher";

/**
 * Maps temperature (Celsius) to RGBA color.
 * Cold blues (-20C) -> green (10C) -> yellow (25C) -> red (40C+)
 */
function temperatureToColor(temp: number): [number, number, number, number] {
  const alpha = 200;

  if (temp <= -20) return [59, 130, 246, alpha];        // Blue — extreme cold
  if (temp <= -10) return [96, 165, 250, alpha];         // Light blue — very cold
  if (temp <= 0) return [147, 197, 253, alpha];          // Pale blue — cold
  if (temp <= 10) return [74, 222, 128, alpha];          // Green — cool
  if (temp <= 18) return [163, 230, 53, alpha];          // Lime — mild
  if (temp <= 25) return [250, 204, 21, alpha];          // Yellow — warm
  if (temp <= 32) return [251, 146, 60, alpha];          // Orange — hot
  if (temp <= 40) return [239, 68, 68, alpha];           // Red — very hot
  return [185, 28, 28, alpha];                            // Dark red — extreme heat
}

export function createCurrentWeatherLayer(
  data: WeatherStation[],
  opacity: number = 1,
  filters: Record<string, any> = {}
) {
  const minTemp = filters.minTemperature ?? -100;
  const maxTemp = filters.maxTemperature ?? 100;

  const filtered = data.filter(
    (s) => s.temperature >= minTemp && s.temperature <= maxTemp
  );

  return new ScatterplotLayer<WeatherStation>({
    id: "weather-current",
    data: filtered,
    pickable: true,
    opacity,
    filled: true,
    radiusMinPixels: 4,
    radiusMaxPixels: 15,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 50000,
    getFillColor: (d) => temperatureToColor(d.temperature),
    updateTriggers: {
      getFillColor: [filters],
    },
  });
}
