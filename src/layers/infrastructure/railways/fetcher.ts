export interface RailwaySegment {
  id: string;
  name: string;
  type: "rail" | "subway" | "light_rail" | "tram";
  coordinates: number[][];
}

/** Minimal GeoJSON types for the railway layer (avoids @types/geojson dependency). */
interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * Major cities with tight bounding boxes for Overpass API queries.
 * Each bbox is [south, west, north, east] (~0.4-0.5 deg around city center).
 */
interface CityBBox {
  name: string;
  south: number;
  west: number;
  north: number;
  east: number;
}

const MAJOR_CITIES: CityBBox[] = [
  { name: "London", south: 51.3, west: -0.5, north: 51.7, east: 0.3 },
  { name: "Paris", south: 48.7, west: 2.1, north: 49.0, east: 2.6 },
  { name: "Tokyo", south: 35.5, west: 139.4, north: 35.9, east: 139.9 },
  { name: "New York", south: 40.5, west: -74.3, north: 40.9, east: -73.7 },
  { name: "Beijing", south: 39.7, west: 116.1, north: 40.1, east: 116.7 },
  { name: "Mumbai", south: 18.8, west: 72.7, north: 19.3, east: 73.1 },
  { name: "Moscow", south: 55.5, west: 37.3, north: 55.9, east: 37.9 },
  { name: "Berlin", south: 52.3, west: 13.1, north: 52.7, east: 13.7 },
  { name: "Istanbul", south: 40.8, west: 28.7, north: 41.2, east: 29.2 },
  { name: "Dubai", south: 25.0, west: 55.0, north: 25.4, east: 55.5 },
  { name: "Bangkok", south: 13.5, west: 100.3, north: 13.9, east: 100.8 },
  { name: "Sydney", south: -34.0, west: 150.9, north: -33.7, east: 151.4 },
  { name: "Toronto", south: 43.5, west: -79.6, north: 43.9, east: -79.2 },
  { name: "Chicago", south: 41.7, west: -87.9, north: 42.0, east: -87.5 },
  { name: "Seoul", south: 37.4, west: 126.8, north: 37.7, east: 127.2 },
];

/** Max concurrent Overpass requests to be polite to the public API. */
const CONCURRENCY = 3;

/**
 * Build an Overpass query for main railway lines within a bounding box.
 */
function buildOverpassQuery(bbox: CityBBox): string {
  const { south, west, north, east } = bbox;
  // Query main railway lines (usage=main) and subway/metro
  return `[out:json][timeout:25];(way["railway"="rail"]["usage"="main"](${south},${west},${north},${east});way["railway"="subway"](${south},${west},${north},${east}););out geom;`;
}

/**
 * Convert an Overpass API response to a GeoJSON FeatureCollection.
 */
function overpassToGeoJSON(data: any, cityName: string): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = [];

  if (!data?.elements || !Array.isArray(data.elements)) {
    return { type: "FeatureCollection", features };
  }

  for (const element of data.elements) {
    if (element.type !== "way" || !element.geometry) continue;

    const coords: [number, number][] = element.geometry
      .filter((g: any) => g.lat != null && g.lon != null)
      .map((g: any) => [g.lon, g.lat]); // GeoJSON is [lon, lat]

    if (coords.length < 2) continue;

    const railway = element.tags?.railway || "rail";
    const name =
      element.tags?.name ||
      element.tags?.["name:en"] ||
      `${cityName} ${railway} ${element.id}`;

    features.push({
      type: "Feature",
      properties: {
        id: `osm-${element.id}`,
        name,
        type: railway as RailwaySegment["type"],
        city: cityName,
        operator: element.tags?.operator || "",
      },
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * Fetch railway data from the Overpass API for a single city.
 */
async function fetchCityRailways(city: CityBBox): Promise<GeoJSONFeature[]> {
  const query = buildOverpassQuery(city);
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`Overpass API error for ${city.name}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const geojson = overpassToGeoJSON(data, city.name);
    return geojson.features;
  } catch (err) {
    console.warn(`Railway fetch failed for ${city.name}:`, err);
    return [];
  }
}

/**
 * Fetch railway data for major cities worldwide using the Overpass API.
 *
 * Queries 15 major urban areas with tight bounding boxes for main railway
 * lines (usage=main) and subway/metro lines. Results are merged into a
 * single GeoJSON FeatureCollection for the GeoJsonLayer renderer.
 *
 * The Overpass API is free, requires no authentication, and provides
 * comprehensive OpenStreetMap railway data.
 *
 * To be polite to the public API, requests are batched with limited
 * concurrency and include reasonable timeouts.
 */
export async function fetchRailways(): Promise<any> {
  try {
    const allFeatures: GeoJSONFeature[] = [];

    // Process cities in groups of CONCURRENCY
    for (let i = 0; i < MAJOR_CITIES.length; i += CONCURRENCY) {
      const group = MAJOR_CITIES.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        group.map((city) => fetchCityRailways(city))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          allFeatures.push(...result.value);
        }
      }

      // Small delay between groups to be polite to the API
      if (i + CONCURRENCY < MAJOR_CITIES.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Railways: fetched ${allFeatures.length} segments from ${MAJOR_CITIES.length} cities`);

    return {
      type: "FeatureCollection" as const,
      features: allFeatures,
    };
  } catch (err) {
    console.warn("Railway fetch failed:", err);
    return {
      type: "FeatureCollection" as const,
      features: [],
    };
  }
}
