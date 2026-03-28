export interface PowerPlant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  primaryFuel: string;
  country: string;
  owner: string;
  commissioning_year: number | null;
}

const WRI_POWER_PLANTS_CSV =
  "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv";

/**
 * Fetches power plants from the WRI Global Power Plant Database (free CSV).
 * Contains ~30,000 power plants across 164 countries.
 *
 * Note: The WRI repository may be archived. If the primary URL fails,
 * consider using a mirror or cached copy.
 */
export async function fetchPowerPlants(): Promise<PowerPlant[]> {
  const res = await fetch(WRI_POWER_PLANTS_CSV);
  if (!res.ok) throw new Error(`WRI Power Plant DB fetch failed: ${res.status}`);

  const text = await res.text();
  const lines = text.split("\n");

  if (lines.length < 2) return [];

  // Parse CSV header
  const header = parseCSVLine(lines[0]);
  const col = (name: string) => header.indexOf(name);

  const idIdx = col("gppd_idnr");
  const nameIdx = col("name");
  const latIdx = col("latitude");
  const lonIdx = col("longitude");
  const capIdx = col("capacity_mw");
  const fuelIdx = col("primary_fuel");
  const countryIdx = col("country_long");
  const ownerIdx = col("owner");
  const yearIdx = col("commissioning_year");

  const plants: PowerPlant[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);

    const lat = parseFloat(fields[latIdx]);
    const lon = parseFloat(fields[lonIdx]);
    if (isNaN(lat) || isNaN(lon)) continue;

    const yearRaw = fields[yearIdx];
    const year = yearRaw ? parseFloat(yearRaw) : null;

    plants.push({
      id: fields[idIdx] || `plant-${i}`,
      name: fields[nameIdx] || "Unknown",
      latitude: lat,
      longitude: lon,
      capacity: parseFloat(fields[capIdx]) || 0,
      primaryFuel: fields[fuelIdx] || "Other",
      country: fields[countryIdx] || "",
      owner: fields[ownerIdx] || "",
      commissioning_year: year && !isNaN(year) ? year : null,
    });
  }

  return plants;
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
