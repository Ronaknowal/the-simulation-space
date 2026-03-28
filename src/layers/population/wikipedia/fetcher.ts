export interface WikiPOI {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  distance: number;
  description: string;
}

const WIKIPEDIA_GEOSEARCH_API = "https://en.wikipedia.org/w/api.php";

/**
 * Fetches Wikipedia geotagged articles near a given coordinate.
 * Free, no API key required. Uses the MediaWiki GeoSearch API.
 *
 * @param lat - Latitude of the center point
 * @param lon - Longitude of the center point
 * @param radius - Search radius in meters (max 10000)
 */
export async function fetchWikipediaPOIs(
  lat: number,
  lon: number,
  radius: number = 10000
): Promise<WikiPOI[]> {
  const clampedRadius = Math.min(radius, 10000);
  const url =
    `${WIKIPEDIA_GEOSEARCH_API}?action=query&list=geosearch` +
    `&gscoord=${lat}|${lon}&gsradius=${clampedRadius}&gslimit=50` +
    `&format=json&origin=*`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);

  const json = await res.json();
  const results = json?.query?.geosearch || [];

  return results.map((r: any) => ({
    id: r.pageid,
    title: r.title || "",
    latitude: r.lat || 0,
    longitude: r.lon || 0,
    distance: r.dist || 0,
    description: r.title || "",
  }));
}

/** Major city coordinates for initial global coverage */
const MAJOR_CITIES: [number, number][] = [
  [40.7128, -74.006],   // New York
  [51.5074, -0.1278],   // London
  [48.8566, 2.3522],    // Paris
  [35.6762, 139.6503],  // Tokyo
  [28.6139, 77.209],    // New Delhi
  [-33.8688, 151.2093], // Sydney
  [-23.5505, -46.6333], // Sao Paulo
  [55.7558, 37.6173],   // Moscow
  [31.2304, 121.4737],  // Shanghai
  [37.5665, 126.978],   // Seoul
  [30.0444, 31.2357],   // Cairo
  [1.3521, 103.8198],   // Singapore
  [-1.2921, 36.8219],   // Nairobi
  [19.4326, -99.1332],  // Mexico City
  [52.52, 13.405],      // Berlin
];

/**
 * Fetches Wikipedia POIs from a grid of major cities for global coverage.
 * Used by the controller for initial data load.
 */
export async function fetchGlobalWikipediaPOIs(): Promise<WikiPOI[]> {
  const allPOIs: WikiPOI[] = [];
  const seenIds = new Set<number>();

  const results = await Promise.allSettled(
    MAJOR_CITIES.map(([lat, lon]) => fetchWikipediaPOIs(lat, lon, 10000))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const poi of result.value) {
        if (!seenIds.has(poi.id)) {
          seenIds.add(poi.id);
          allPOIs.push(poi);
        }
      }
    }
  }

  return allPOIs;
}
