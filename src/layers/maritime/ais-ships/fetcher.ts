export interface ShipPosition {
  mmsi: number;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;       // Knots
  course: number;      // Degrees
  heading: number;     // Degrees
  shipType: number;
  destination: string;
  timestamp: number;
}

const AIS_PROXY_URL = "/api/ais/positions";

/**
 * Fetches ship positions from our API proxy route.
 * The actual data comes from AISStream.io via SSE relay (to be built later).
 * Returns empty array if the proxy isn't available.
 */
export async function fetchShipPositions(): Promise<ShipPosition[]> {
  try {
    const res = await fetch(AIS_PROXY_URL);
    if (!res.ok) return [];

    const data = await res.json();

    return (data.positions || data || [])
      .filter((p: any) => p.latitude != null && p.longitude != null)
      .map((p: any) => ({
        mmsi: p.mmsi || 0,
        name: (p.name || "").trim(),
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed ?? 0,
        course: p.course ?? 0,
        heading: p.heading ?? 0,
        shipType: p.shipType ?? 0,
        destination: (p.destination || "").trim(),
        timestamp: p.timestamp || Date.now(),
      }));
  } catch {
    // Proxy not available yet — return empty array
    return [];
  }
}

/**
 * Maps AIS ship type codes to human-readable categories.
 * Based on ITU-R M.1371-5 Table 50.
 */
export function shipTypeToCategory(type: number): string {
  if (type >= 70 && type <= 79) return "Cargo";
  if (type >= 80 && type <= 89) return "Tanker";
  if (type >= 60 && type <= 69) return "Passenger";
  if (type === 30) return "Fishing";
  if (type >= 35 && type <= 36) return "Military";
  if (type === 36) return "Sailing";
  if (type === 37) return "Pleasure";
  if (type >= 31 && type <= 32) return "Tug";
  return "Other";
}

/**
 * Maps AIS ship type codes to distinct RGBA colors per category.
 */
export function shipTypeToColor(type: number): [number, number, number, number] {
  const category = shipTypeToCategory(type);
  switch (category) {
    case "Cargo":     return [59, 130, 246, 220];   // Blue
    case "Tanker":    return [239, 68, 68, 220];     // Red
    case "Passenger": return [168, 85, 247, 220];    // Purple
    case "Fishing":   return [34, 197, 94, 220];     // Green
    case "Military":  return [249, 115, 22, 220];    // Orange
    case "Sailing":   return [6, 182, 212, 220];     // Cyan
    case "Pleasure":  return [236, 72, 153, 220];    // Pink
    case "Tug":       return [250, 204, 21, 220];    // Yellow
    default:          return [148, 163, 184, 180];   // Slate/gray
  }
}
