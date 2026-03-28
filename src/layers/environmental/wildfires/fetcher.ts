export interface WildfireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  scan: number;
  track: number;
  satellite: "MODIS" | "VIIRS";
  confidence: number;
  frp: number;
  acqDate: string;
  acqTime: string;
}

const FIRMS_VIIRS_URL =
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv";

const FIRMS_MODIS_URL =
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv";

/**
 * Parse a CSV string into an array of row objects keyed by header names.
 */
function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Normalise a confidence value to 0-100.
 * VIIRS uses "nominal" / "low" / "high"; MODIS uses 0-100 numbers.
 */
function normaliseConfidence(raw: string): number {
  const lower = raw.toLowerCase();
  if (lower === "high" || lower === "h") return 90;
  if (lower === "nominal" || lower === "n") return 60;
  if (lower === "low" || lower === "l") return 30;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 50;
}

/**
 * Fetch worldwide active fire hotspots from NASA FIRMS.
 * Tries VIIRS first, falls back to MODIS.
 */
export async function fetchWildfires(): Promise<WildfireHotspot[]> {
  let csv: string;
  let isVIIRS = true;

  try {
    const res = await fetch(FIRMS_VIIRS_URL);
    if (!res.ok) throw new Error(`VIIRS endpoint: ${res.status}`);
    csv = await res.text();
  } catch {
    try {
      const res = await fetch(FIRMS_MODIS_URL);
      if (!res.ok) throw new Error(`MODIS endpoint: ${res.status}`);
      csv = await res.text();
      isVIIRS = false;
    } catch {
      return [];
    }
  }

  const rows = parseCsv(csv);

  return rows
    .filter(
      (r) =>
        r.latitude !== undefined &&
        r.longitude !== undefined &&
        !Number.isNaN(Number(r.latitude)) &&
        !Number.isNaN(Number(r.longitude))
    )
    .map((r) => ({
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      brightness: Number(r.bright_ti4 ?? r.brightness ?? 0),
      scan: Number(r.scan ?? 0),
      track: Number(r.track ?? 0),
      satellite: (isVIIRS ? "VIIRS" : "MODIS") as "MODIS" | "VIIRS",
      confidence: normaliseConfidence(r.confidence ?? "50"),
      frp: Number(r.frp ?? 0),
      acqDate: r.acq_date ?? "",
      acqTime: r.acq_time ?? "",
    }));
}
