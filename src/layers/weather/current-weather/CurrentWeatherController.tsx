"use client";

import { useLayerData } from "@/hooks/useLayerData";
import { fetchCurrentWeather } from "./fetcher";

/**
 * Invisible controller component that manages current weather data fetching.
 * Mount this when the weather layer is available.
 */
export default function CurrentWeatherController() {
  useLayerData("weather.current", fetchCurrentWeather, 600_000);
  return null;
}
