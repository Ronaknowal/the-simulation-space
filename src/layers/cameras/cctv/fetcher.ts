export interface CCTVCamera {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  url: string;
  source: "DOT" | "City" | "Public";
  status: "online" | "offline";
}

/**
 * Fetches CCTV camera data from our server-side API route.
 *
 * The server handles fetching from multiple DOT APIs (Caltrans, WSDOT, NYSDOT)
 * to avoid CORS issues. Falls back to curated camera locations.
 */
export async function fetchCCTVCameras(): Promise<CCTVCamera[]> {
  try {
    const res = await fetch("/api/cameras/cctv", {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const cameras = data.cameras || data;
    if (!Array.isArray(cameras)) return [];

    console.log(`[CCTV] Received ${cameras.length} cameras`);

    return cameras
      .filter((c: any) => c.latitude && c.longitude)
      .map((c: any) => ({
        id: c.id || `cctv-${Math.random().toString(36).slice(2)}`,
        name: c.name || "Traffic Camera",
        latitude: c.latitude,
        longitude: c.longitude,
        url: c.url || "",
        source: (c.source || "DOT") as "DOT" | "City" | "Public",
        status: (c.status === "online" ? "online" : "offline") as "online" | "offline",
      }));
  } catch (err) {
    console.warn("[CCTV] Fetch failed:", err);
    return [];
  }
}

