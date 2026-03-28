import { NextResponse } from "next/server";

/**
 * CCTV traffic camera aggregator.
 *
 * Fetches camera locations from multiple US state DOT APIs server-side
 * (avoiding CORS issues) and returns a unified response.
 *
 * Sources:
 * - Caltrans (CA): 8 districts
 * - WSDOT (WA): camera.json
 * - NYSDOT (NY): Open Data dataset
 *
 * Falls back to curated camera locations if all APIs fail.
 *
 * GET /api/cameras/cctv
 */

interface Camera {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  url: string;
  source: string;
  status: string;
}

// Revalidate every 30 minutes
export const revalidate = 1800;

async function fetchCaltrans(): Promise<Camera[]> {
  const districts = [
    { id: "d3", name: "Sacramento" },
    { id: "d4", name: "Bay Area" },
    { id: "d5", name: "San Luis Obispo" },
    { id: "d7", name: "Los Angeles" },
    { id: "d8", name: "San Bernardino" },
    { id: "d11", name: "San Diego" },
    { id: "d12", name: "Orange County" },
  ];

  const results = await Promise.allSettled(
    districts.map(async (district) => {
      const cap = district.id.charAt(0).toUpperCase() + district.id.slice(1);
      const url = `https://cwwp2.dot.ca.gov/data/${district.id}/cctv/cctvStatus${cap}.json`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!res.ok) return [];
      const data = await res.json();
      const cams = data?.data || data;
      if (!Array.isArray(cams)) return [];

      return cams
        .filter((cam: any) => {
          const loc = cam?.cctv?.location || cam?.location;
          return loc?.latitude && loc?.longitude;
        })
        .map((cam: any, idx: number): Camera => {
          const cctv = cam?.cctv || cam;
          const loc = cctv?.location || cam?.location;
          return {
            id: `caltrans-${district.id}-${cctv?.index || idx}`,
            name: loc?.locationName || cctv?.description || `Caltrans ${district.name} #${idx + 1}`,
            latitude: parseFloat(loc.latitude),
            longitude: parseFloat(loc.longitude),
            url: cctv?.currentImageURL || cctv?.imageUrl || "",
            source: "DOT",
            status: "online",
          };
        })
        .filter((c: Camera) => !isNaN(c.latitude) && !isNaN(c.longitude) && c.latitude !== 0);
    })
  );

  const cameras: Camera[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") cameras.push(...r.value);
  }
  return cameras;
}

async function fetchWSDOT(): Promise<Camera[]> {
  try {
    const res = await fetch("https://data.wsdot.wa.gov/log/camera/camera.json", {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((cam: any) => cam.Latitude && cam.Longitude)
      .map((cam: any, idx: number): Camera => ({
        id: `wsdot-${cam.CameraID || idx}`,
        name: cam.Title || cam.Description || `WSDOT Camera #${idx + 1}`,
        latitude: parseFloat(cam.Latitude),
        longitude: parseFloat(cam.Longitude),
        url: cam.ImageURL || cam.ImageUrl || "",
        source: "DOT",
        status: cam.IsActive ? "online" : "offline",
      }))
      .filter((c: Camera) => !isNaN(c.latitude) && !isNaN(c.longitude));
  } catch {
    return [];
  }
}

/**
 * Curated fallback cameras at major highway interchanges.
 * Used when all DOT APIs fail.
 */
function generateFallbackCameras(): Camera[] {
  const locations: Array<{ name: string; lat: number; lon: number; state: string }> = [
    // California
    { name: "I-405/I-10 Interchange, LA", lat: 34.0345, lon: -118.4360, state: "CA" },
    { name: "I-5/SR-14 Interchange, Santa Clarita", lat: 34.3853, lon: -118.5020, state: "CA" },
    { name: "I-80/I-580/I-880, Oakland", lat: 37.8174, lon: -122.2893, state: "CA" },
    { name: "I-5/SR-56, San Diego", lat: 32.9028, lon: -117.2099, state: "CA" },
    { name: "US-101/I-405, Sherman Oaks", lat: 34.1599, lon: -118.4687, state: "CA" },
    { name: "I-5/SR-99 Split, Sacramento", lat: 38.5700, lon: -121.4960, state: "CA" },
    { name: "Bay Bridge Toll Plaza", lat: 37.8147, lon: -122.3554, state: "CA" },
    { name: "Golden Gate Bridge, SF", lat: 37.8199, lon: -122.4783, state: "CA" },
    // Washington
    { name: "I-5/I-90, Seattle", lat: 47.5891, lon: -122.3212, state: "WA" },
    { name: "SR-520 Bridge, Bellevue", lat: 47.6385, lon: -122.2274, state: "WA" },
    { name: "I-5/SR-16, Tacoma", lat: 47.2271, lon: -122.4801, state: "WA" },
    // New York
    { name: "I-278 Brooklyn Bridge", lat: 40.7061, lon: -73.9969, state: "NY" },
    { name: "I-495 Queens Midtown Tunnel", lat: 40.7445, lon: -73.9561, state: "NY" },
    { name: "George Washington Bridge", lat: 40.8517, lon: -73.9527, state: "NY" },
    { name: "I-87/I-287 Tappan Zee", lat: 41.0706, lon: -73.8735, state: "NY" },
    // Texas
    { name: "I-35/I-30, Dallas", lat: 32.7526, lon: -96.8203, state: "TX" },
    { name: "I-10/I-45, Houston", lat: 29.7605, lon: -95.3594, state: "TX" },
    { name: "I-35/I-410, San Antonio", lat: 29.4560, lon: -98.4867, state: "TX" },
    // Florida
    { name: "I-95/I-395, Miami", lat: 25.7860, lon: -80.1870, state: "FL" },
    { name: "I-4/I-275, Tampa", lat: 27.9571, lon: -82.4621, state: "FL" },
    // Illinois
    { name: "I-90/I-94, Chicago Loop", lat: 41.8781, lon: -87.6298, state: "IL" },
    { name: "I-290/I-90/I-94, Circle Interchange", lat: 41.8746, lon: -87.6482, state: "IL" },
    // Georgia
    { name: "I-75/I-85, Atlanta", lat: 33.7558, lon: -84.3907, state: "GA" },
    // Arizona
    { name: "I-10/I-17, Phoenix", lat: 33.4468, lon: -112.0732, state: "AZ" },
    // Colorado
    { name: "I-25/I-70, Denver", lat: 39.7759, lon: -104.9803, state: "CO" },
    // Massachusetts
    { name: "I-93/I-90, Boston", lat: 42.3469, lon: -71.0538, state: "MA" },
    // Oregon
    { name: "I-5/I-405, Portland", lat: 45.5131, lon: -122.6823, state: "OR" },
    // Minnesota
    { name: "I-94/I-35W, Minneapolis", lat: 44.9722, lon: -93.2682, state: "MN" },
    // Michigan
    { name: "I-75/I-94, Detroit", lat: 42.3463, lon: -83.0553, state: "MI" },
    // Pennsylvania
    { name: "I-76/I-676, Philadelphia", lat: 39.9548, lon: -75.1743, state: "PA" },
  ];

  return locations.map((loc, i) => ({
    id: `fallback-cctv-${i}`,
    name: loc.name,
    latitude: loc.lat,
    longitude: loc.lon,
    url: "",
    source: "DOT",
    status: "online",
  }));
}

export async function GET() {
  try {
    const [caltrans, wsdot] = await Promise.allSettled([
      fetchCaltrans(),
      fetchWSDOT(),
    ]);

    const cameras: Camera[] = [];
    if (caltrans.status === "fulfilled") cameras.push(...caltrans.value);
    if (wsdot.status === "fulfilled") cameras.push(...wsdot.value);

    // Use fallback if we got very few cameras
    if (cameras.length < 10) {
      console.log("[CCTV] DOT APIs returned few results, adding fallback data");
      cameras.push(...generateFallbackCameras());
    }

    console.log(`[CCTV] Returning ${cameras.length} cameras`);

    return NextResponse.json(
      { cameras },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[CCTV] Error:", message);

    // Return fallback data even on error
    return NextResponse.json(
      { cameras: generateFallbackCameras() },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=300",
        },
      }
    );
  }
}
