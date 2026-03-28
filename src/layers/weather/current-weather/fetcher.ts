export interface WeatherStation {
  latitude: number;
  longitude: number;
  temperature: number;      // degrees Celsius
  humidity: number;          // percent
  windSpeed: number;         // km/h
  windDirection: number;     // degrees
  weatherCode: number;       // WMO weather code
  isDay: boolean;
}

/**
 * ~200 major world cities covering all continents.
 * [latitude, longitude, name] — name is kept for debugging only.
 */
const WORLD_CITIES: [number, number, string][] = [
  // North America
  [40.71, -74.01, "New York"], [34.05, -118.24, "Los Angeles"], [41.88, -87.63, "Chicago"],
  [29.76, -95.37, "Houston"], [33.45, -112.07, "Phoenix"], [39.95, -75.17, "Philadelphia"],
  [29.42, -98.49, "San Antonio"], [32.72, -117.16, "San Diego"], [32.78, -96.80, "Dallas"],
  [37.77, -122.42, "San Francisco"], [47.61, -122.33, "Seattle"], [39.74, -104.99, "Denver"],
  [25.76, -80.19, "Miami"], [33.75, -84.39, "Atlanta"], [42.36, -71.06, "Boston"],
  [38.91, -77.04, "Washington DC"], [36.17, -115.14, "Las Vegas"], [45.50, -73.57, "Montreal"],
  [43.65, -79.38, "Toronto"], [49.28, -123.12, "Vancouver"], [51.05, -114.07, "Calgary"],
  [19.43, -99.13, "Mexico City"], [20.97, -89.62, "Merida"], [25.67, -100.31, "Monterrey"],
  [14.63, -90.51, "Guatemala City"], [9.93, -84.08, "San Jose CR"], [8.98, -79.52, "Panama City"],
  [18.47, -69.90, "Santo Domingo"], [23.11, -82.37, "Havana"],

  // South America
  [-23.55, -46.63, "Sao Paulo"], [-22.91, -43.17, "Rio de Janeiro"], [-34.60, -58.38, "Buenos Aires"],
  [-33.45, -70.65, "Santiago"], [-12.05, -77.04, "Lima"], [4.71, -74.07, "Bogota"],
  [10.48, -66.90, "Caracas"], [-0.18, -78.47, "Quito"], [-16.50, -68.15, "La Paz"],
  [-25.26, -57.58, "Asuncion"], [-34.88, -56.17, "Montevideo"], [-15.79, -47.88, "Brasilia"],
  [-3.12, -60.02, "Manaus"], [3.43, -76.52, "Cali"], [-1.83, -79.53, "Guayaquil"],

  // Europe
  [51.51, -0.13, "London"], [48.86, 2.35, "Paris"], [52.52, 13.41, "Berlin"],
  [40.42, -3.70, "Madrid"], [41.39, 2.17, "Barcelona"], [41.90, 12.50, "Rome"],
  [48.21, 16.37, "Vienna"], [47.37, 8.54, "Zurich"], [52.37, 4.90, "Amsterdam"],
  [50.85, 4.35, "Brussels"], [59.33, 18.07, "Stockholm"], [60.17, 24.94, "Helsinki"],
  [59.91, 10.75, "Oslo"], [55.68, 12.57, "Copenhagen"], [50.08, 14.44, "Prague"],
  [52.23, 21.01, "Warsaw"], [47.50, 19.04, "Budapest"], [44.43, 26.10, "Bucharest"],
  [42.70, 23.32, "Sofia"], [37.98, 23.73, "Athens"], [38.72, -9.14, "Lisbon"],
  [53.35, -6.26, "Dublin"], [55.95, -3.19, "Edinburgh"], [53.48, -2.24, "Manchester"],
  [45.46, 9.19, "Milan"], [43.30, 5.37, "Marseille"], [50.94, 6.96, "Cologne"],
  [48.14, 11.58, "Munich"], [41.01, 28.98, "Istanbul"],

  // Africa
  [30.04, 31.24, "Cairo"], [33.59, -7.59, "Casablanca"], [36.75, 3.04, "Algiers"],
  [36.81, 10.17, "Tunis"], [6.52, 3.38, "Lagos"], [-1.29, 36.82, "Nairobi"],
  [9.02, 38.75, "Addis Ababa"], [-33.93, 18.42, "Cape Town"], [-26.20, 28.05, "Johannesburg"],
  [-6.79, 39.28, "Dar es Salaam"], [-4.32, 15.31, "Kinshasa"], [5.56, -0.19, "Accra"],
  [14.69, -17.44, "Dakar"], [12.37, -1.52, "Ouagadougou"], [-15.39, 28.32, "Lusaka"],
  [-17.83, 31.05, "Harare"], [-25.97, 32.57, "Maputo"], [0.31, 32.58, "Kampala"],
  [-1.94, 29.87, "Kigali"], [32.88, 13.18, "Tripoli"],

  // Middle East
  [25.20, 55.27, "Dubai"], [24.47, 54.37, "Abu Dhabi"], [21.49, 39.19, "Jeddah"],
  [24.71, 46.68, "Riyadh"], [29.38, 47.99, "Kuwait City"], [26.23, 50.59, "Manama"],
  [25.29, 51.53, "Doha"], [23.61, 58.54, "Muscat"], [33.89, 35.50, "Beirut"],
  [31.95, 35.93, "Amman"], [33.31, 44.37, "Baghdad"], [35.69, 51.39, "Tehran"],
  [32.07, 34.78, "Tel Aviv"], [15.35, 44.21, "Sanaa"],

  // South Asia
  [28.61, 77.21, "New Delhi"], [19.08, 72.88, "Mumbai"], [13.08, 80.27, "Chennai"],
  [12.97, 77.59, "Bangalore"], [22.57, 88.36, "Kolkata"], [17.39, 78.49, "Hyderabad"],
  [23.81, 90.41, "Dhaka"], [27.72, 85.32, "Kathmandu"], [6.93, 79.84, "Colombo"],
  [33.69, 73.04, "Islamabad"], [24.86, 67.01, "Karachi"], [31.55, 74.35, "Lahore"],
  [23.02, 72.57, "Ahmedabad"], [26.85, 80.95, "Lucknow"],

  // East Asia
  [35.68, 139.69, "Tokyo"], [34.69, 135.50, "Osaka"], [37.57, 126.98, "Seoul"],
  [35.18, 129.08, "Busan"], [39.90, 116.41, "Beijing"], [31.23, 121.47, "Shanghai"],
  [23.13, 113.26, "Guangzhou"], [22.54, 114.06, "Shenzhen"], [30.57, 104.07, "Chengdu"],
  [29.56, 106.55, "Chongqing"], [22.32, 114.17, "Hong Kong"], [25.03, 121.57, "Taipei"],
  [47.91, 106.91, "Ulaanbaatar"], [43.24, 76.95, "Almaty"],

  // Southeast Asia
  [1.35, 103.82, "Singapore"], [13.76, 100.50, "Bangkok"], [14.60, 120.98, "Manila"],
  [21.03, 105.85, "Hanoi"], [10.82, 106.63, "Ho Chi Minh City"], [-6.21, 106.85, "Jakarta"],
  [3.14, 101.69, "Kuala Lumpur"], [16.87, 96.20, "Yangon"], [11.56, 104.92, "Phnom Penh"],
  [17.97, 102.63, "Vientiane"], [4.90, 114.94, "Bandar Seri Begawan"],

  // Oceania
  [-33.87, 151.21, "Sydney"], [-37.81, 144.96, "Melbourne"], [-27.47, 153.03, "Brisbane"],
  [-31.95, 115.86, "Perth"], [-34.93, 138.60, "Adelaide"], [-36.85, 174.76, "Auckland"],
  [-41.29, 174.78, "Wellington"], [-17.78, 177.97, "Suva"], [-13.84, -171.76, "Apia"],

  // Central Asia / Russia
  [55.76, 37.62, "Moscow"], [59.93, 30.32, "Saint Petersburg"], [56.84, 60.60, "Yekaterinburg"],
  [55.03, 82.92, "Novosibirsk"], [43.24, 76.95, "Almaty"], [41.30, 69.28, "Tashkent"],
  [38.56, 68.77, "Dushanbe"], [42.87, 74.59, "Bishkek"], [51.17, 71.43, "Astana"],
  [37.95, 58.38, "Ashgabat"],

  // Additional global coverage
  [64.15, -21.94, "Reykjavik"], [78.22, 15.64, "Longyearbyen"], [71.29, -156.79, "Utqiagvik"],
  [-54.81, -68.30, "Ushuaia"], [-77.85, 166.67, "McMurdo Station"],
  [21.31, -157.86, "Honolulu"], [-17.53, -149.57, "Papeete"], [13.45, 144.78, "Guam"],
];

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

/**
 * Fetches current weather for ~200 world cities from Open-Meteo.
 * Open-Meteo supports batch queries with comma-separated coordinates.
 * No API key needed; full CORS support.
 */
export async function fetchCurrentWeather(): Promise<WeatherStation[]> {
  // Open-Meteo supports batching but very long URLs can fail.
  // Split into chunks of ~50 cities per request.
  const chunkSize = 50;
  const chunks: [number, number, string][][] = [];

  for (let i = 0; i < WORLD_CITIES.length; i += chunkSize) {
    chunks.push(WORLD_CITIES.slice(i, i + chunkSize));
  }

  const allStations: WeatherStation[] = [];

  for (const chunk of chunks) {
    const lats = chunk.map((c) => c[0]).join(",");
    const lons = chunk.map((c) => c[1]).join(",");

    const url =
      `${OPEN_METEO_BASE}?latitude=${lats}&longitude=${lons}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

      const data = await res.json();

      // Open-Meteo returns an array when multiple coordinates are provided
      const results = Array.isArray(data) ? data : [data];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r.current) continue;

        allStations.push({
          latitude: r.latitude,
          longitude: r.longitude,
          temperature: r.current.temperature_2m ?? 0,
          humidity: r.current.relative_humidity_2m ?? 0,
          windSpeed: r.current.wind_speed_10m ?? 0,
          windDirection: r.current.wind_direction_10m ?? 0,
          weatherCode: r.current.weather_code ?? 0,
          isDay: r.current.is_day === 1,
        });
      }
    } catch (err) {
      console.warn("Open-Meteo chunk fetch failed:", err);
      // Continue with other chunks
    }
  }

  return allStations;
}
