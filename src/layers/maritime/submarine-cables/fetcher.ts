export interface SubmarineCable {
  id: string;
  name: string;
  length: string;
  owners: string;
  year: number;
  coordinates: number[][]; // Array of [lon, lat] pairs
}

/**
 * TeleGeography submarine cable GeoJSON URLs.
 * The repo has moved over the years — try multiple known paths.
 */
const CABLE_URLS = [
  "https://raw.githubusercontent.com/telegeography/www.submarinecablemap.com/master/web/public/api/v3/cable/cable-geo.json",
  "https://raw.githubusercontent.com/telegeography/www.submarinecablemap.com/master/public/api/v3/cable/cable-geo.json",
  "https://raw.githubusercontent.com/telegeography/www.submarinecablemap.com/main/web/public/api/v3/cable/cable-geo.json",
];

/**
 * Fetches submarine cable routes from TeleGeography's public GeoJSON.
 * Tries multiple known URL paths, falls back to curated cable data.
 * Returns GeoJSON FeatureCollection for use with GeoJsonLayer.
 */
export async function fetchSubmarineCables(): Promise<any> {
  // Try each URL until one works
  for (const url of CABLE_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const geojson = await res.json();
        if (geojson?.features?.length > 0) {
          console.info(`[Submarine Cables] loaded ${geojson.features.length} cables from TeleGeography`);
          return geojson;
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback: curated major submarine cable routes as GeoJSON
  console.info("[Submarine Cables] Using curated fallback data");
  return generateFallbackCableGeoJSON();
}

/**
 * Parses individual cable features into structured SubmarineCable objects.
 * Useful for tooltips, search, and data analysis.
 */
export function parseCableFeatures(geojson: any): SubmarineCable[] {
  if (!geojson?.features) return [];

  return geojson.features.map((f: any, idx: number) => {
    const props = f.properties || {};
    const geom = f.geometry;

    let coordinates: number[][] = [];
    if (geom?.type === "LineString") {
      coordinates = geom.coordinates;
    } else if (geom?.type === "MultiLineString") {
      coordinates = geom.coordinates.flat();
    }

    return {
      id: props.id || `cable-${idx}`,
      name: props.name || "Unknown Cable",
      length: props.length || "Unknown",
      owners: props.owners || "Unknown",
      year: props.year ? Number(props.year) : 0,
      coordinates,
    };
  });
}

/**
 * Generates curated GeoJSON for major submarine cable routes.
 * Based on publicly known major cable systems worldwide.
 */
function generateFallbackCableGeoJSON(): any {
  const cables: Array<{
    name: string;
    coords: [number, number][]; // [lon, lat] waypoints
    year: number;
    color: string;
  }> = [
    // Transatlantic
    {
      name: "TAT-14 (Transatlantic)",
      coords: [[-1.0, 50.8], [-10.0, 50.0], [-25.0, 47.0], [-40.0, 44.0], [-55.0, 42.0], [-65.0, 41.0], [-71.0, 40.7]],
      year: 2001, color: "#3b82f6",
    },
    {
      name: "MAREA",
      coords: [[-3.0, 43.3], [-15.0, 42.0], [-30.0, 40.0], [-50.0, 39.0], [-70.0, 39.0], [-74.0, 39.3]],
      year: 2018, color: "#8b5cf6",
    },
    {
      name: "AEC-1 (Atlantic Express)",
      coords: [[-9.1, 38.7], [-20.0, 35.0], [-35.0, 30.0], [-50.0, 28.0], [-65.0, 25.8], [-80.0, 25.8]],
      year: 2024, color: "#06b6d4",
    },
    // Transpacific
    {
      name: "FASTER (US-Japan)",
      coords: [[-122.4, 37.8], [-140.0, 38.0], [-160.0, 35.0], [-180.0, 30.0], [175.0, 28.0], [160.0, 30.0], [140.0, 33.5], [139.7, 35.0]],
      year: 2016, color: "#ef4444",
    },
    {
      name: "PLCN (Pacific Light Cable)",
      coords: [[-118.2, 33.7], [-140.0, 30.0], [-160.0, 25.0], [180.0, 20.0], [160.0, 18.0], [140.0, 18.0], [121.5, 14.5]],
      year: 2020, color: "#f97316",
    },
    // Asia intra-regional
    {
      name: "SJC (Southeast Asia–Japan)",
      coords: [[139.7, 35.0], [130.0, 30.0], [121.5, 25.0], [118.0, 22.0], [114.2, 22.3], [110.0, 18.0], [106.7, 10.8], [103.8, 1.3]],
      year: 2013, color: "#22c55e",
    },
    {
      name: "SEA-ME-WE 6",
      coords: [[103.8, 1.3], [95.0, 5.0], [80.0, 8.0], [73.0, 10.0], [65.0, 15.0], [55.0, 22.0], [45.0, 12.5], [40.0, 15.0], [35.0, 30.0], [30.0, 31.5], [20.0, 35.0], [10.0, 37.0], [3.0, 43.0]],
      year: 2025, color: "#eab308",
    },
    // Africa
    {
      name: "2Africa",
      coords: [[-5.6, 36.0], [-10.0, 33.0], [-17.0, 15.0], [-16.0, 5.0], [-5.0, -5.0], [5.0, -8.0], [12.0, -5.0], [18.5, -34.0], [30.0, -30.0], [40.0, -12.0], [45.0, -2.0], [50.0, 12.5], [55.0, 25.0], [35.0, 30.5]],
      year: 2024, color: "#a855f7",
    },
    {
      name: "WACS (West Africa Cable System)",
      coords: [[-0.1, 51.5], [-5.0, 43.0], [-10.0, 35.0], [-17.0, 15.0], [-15.0, 5.0], [3.5, 6.5], [8.0, 4.0], [12.0, -4.5], [13.2, -8.8], [18.5, -33.9]],
      year: 2012, color: "#14b8a6",
    },
    // South America
    {
      name: "EllaLink (EU-Brazil)",
      coords: [[-8.6, 41.1], [-15.0, 30.0], [-25.0, 15.0], [-35.0, 0.0], [-38.5, -3.7]],
      year: 2021, color: "#f43f5e",
    },
    {
      name: "SAC (South America Crossing)",
      coords: [[-43.2, -22.9], [-35.0, -15.0], [-25.0, -5.0], [-10.0, 5.0], [-5.0, 6.0]],
      year: 2000, color: "#64748b",
    },
    // Australia / Pacific
    {
      name: "Southern Cross NEXT",
      coords: [[174.8, -41.3], [-180.0, -25.0], [-170.0, -15.0], [-160.0, -5.0], [-150.0, 10.0], [-140.0, 20.0], [-122.4, 37.8]],
      year: 2022, color: "#0ea5e9",
    },
    {
      name: "Australia-Singapore Cable",
      coords: [[115.9, -31.9], [110.0, -20.0], [106.0, -5.0], [103.8, 1.3]],
      year: 2018, color: "#84cc16",
    },
  ];

  const features = cables.map((cable, idx) => ({
    type: "Feature",
    properties: {
      id: `cable-fallback-${idx}`,
      name: cable.name,
      color: cable.color,
      year: cable.year,
      owners: "TeleGeography Data",
      length: "Unknown",
    },
    geometry: {
      type: "LineString",
      coordinates: cable.coords,
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}
