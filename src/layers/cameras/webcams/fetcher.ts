export interface Webcam {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  status: "active" | "inactive";
  thumbnail: string;
  player: string;
  country: string;
}

const WINDY_WEBCAMS_API =
  "https://api.windy.com/webcams/api/v3/webcams?lang=en&limit=200&offset=0";

/**
 * Fetches webcam data from the Windy Webcam API.
 *
 * The Windy API requires an API key sent via `x-windy-api-key` header.
 * This fetcher attempts to use a proxy route at /api/cameras/webcams
 * to avoid exposing the key client-side.
 *
 * Falls back to empty array if the API is unavailable.
 */
export async function fetchWebcams(): Promise<Webcam[]> {
  try {
    const res = await fetch("/api/cameras/webcams");
    if (!res.ok) return [];

    const data = await res.json();
    const webcams = data.webcams || data;
    if (!Array.isArray(webcams)) return [];

    return webcams.map((w: any) => ({
      id: String(w.id || w.webcamId),
      title: w.title || "Untitled Webcam",
      latitude: w.location?.latitude ?? w.latitude ?? 0,
      longitude: w.location?.longitude ?? w.longitude ?? 0,
      status: w.status === "active" ? "active" : "inactive",
      thumbnail: w.images?.current?.preview || w.image?.current?.preview || w.thumbnail || "",
      player: w.player?.live || w.player?.day || "",
      country: w.location?.country || w.country || "Unknown",
    }));
  } catch {
    // API unavailable — return empty
    return [];
  }
}
