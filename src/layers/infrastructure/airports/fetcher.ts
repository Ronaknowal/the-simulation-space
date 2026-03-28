export interface Airport {
  id: string;
  ident: string;
  name: string;
  type: "large_airport" | "medium_airport" | "small_airport" | "heliport" | "seaplane_base" | "closed";
  latitude: number;
  longitude: number;
  elevation: number;
  country: string;
  iataCode: string | null;
  municipality: string;
}

const OURAIRPORTS_CSV =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";

const VALID_TYPES = new Set(["large_airport", "medium_airport", "small_airport"]);

/**
 * Fetches airports from OurAirports CSV (free, no API key).
 * Filters to large, medium, and small airports (skips closed, heliport, seaplane_base).
 */
export async function fetchAirports(): Promise<Airport[]> {
  const res = await fetch(OURAIRPORTS_CSV);
  if (!res.ok) throw new Error(`OurAirports fetch failed: ${res.status}`);

  const text = await res.text();
  const lines = text.split("\n");

  if (lines.length < 2) return [];

  // Parse CSV header to find column indices
  const header = parseCSVLine(lines[0]);
  const col = (name: string) => header.indexOf(name);

  const idIdx = col("id");
  const identIdx = col("ident");
  const typeIdx = col("type");
  const nameIdx = col("name");
  const latIdx = col("latitude_deg");
  const lonIdx = col("longitude_deg");
  const elevIdx = col("elevation_ft");
  const countryIdx = col("iso_country");
  const iataIdx = col("iata_code");
  const muniIdx = col("municipality");

  const airports: Airport[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const type = fields[typeIdx];

    if (!VALID_TYPES.has(type)) continue;

    const lat = parseFloat(fields[latIdx]);
    const lon = parseFloat(fields[lonIdx]);
    if (isNaN(lat) || isNaN(lon)) continue;

    airports.push({
      id: fields[idIdx] || `airport-${i}`,
      ident: fields[identIdx] || "",
      name: fields[nameIdx] || "Unknown",
      type: type as Airport["type"],
      latitude: lat,
      longitude: lon,
      elevation: parseFloat(fields[elevIdx]) || 0,
      country: fields[countryIdx] || "",
      iataCode: fields[iataIdx] || null,
      municipality: fields[muniIdx] || "",
    });
  }

  return airports;
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());

  return fields;
}
