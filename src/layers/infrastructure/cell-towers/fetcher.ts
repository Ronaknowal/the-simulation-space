export interface CellTower {
  id: string;
  latitude: number;
  longitude: number;
  mcc: number;
  mnc: number;
  radio: "GSM" | "UMTS" | "LTE" | "NR";
  range: number;
  created: number;
}

/**
 * City definition for generating representative cell tower distributions.
 * MCC = Mobile Country Code, MNC examples per country.
 */
interface CityCluster {
  name: string;
  lat: number;
  lon: number;
  radiusDeg: number;
  mcc: number;
  mncs: number[];
  /** Distribution of radio types [GSM%, UMTS%, LTE%, NR%] summing to 1 */
  radioDistribution: [number, number, number, number];
  towerCount: number;
}

/**
 * Top 50 cities with realistic MCC/MNC values and radio distributions.
 * Radio distributions reflect each region's mobile infrastructure maturity.
 */
const CITY_CLUSTERS: CityCluster[] = [
  // North America
  { name: "New York", lat: 40.7128, lon: -74.006, radiusDeg: 0.15, mcc: 310, mncs: [260, 410, 120], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 18 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, radiusDeg: 0.2, mcc: 310, mncs: [260, 410, 120], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 16 },
  { name: "Chicago", lat: 41.8781, lon: -87.6298, radiusDeg: 0.12, mcc: 310, mncs: [260, 410, 120], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 14 },
  { name: "Houston", lat: 29.7604, lon: -95.3698, radiusDeg: 0.15, mcc: 310, mncs: [260, 410, 120], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 12 },
  { name: "Toronto", lat: 43.6532, lon: -79.3832, radiusDeg: 0.12, mcc: 302, mncs: [220, 610, 720], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 12 },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, radiusDeg: 0.15, mcc: 334, mncs: [20, 30, 50], radioDistribution: [0.1, 0.2, 0.55, 0.15], towerCount: 14 },

  // Europe
  { name: "London", lat: 51.5074, lon: -0.1278, radiusDeg: 0.12, mcc: 234, mncs: [10, 15, 20, 30], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 16 },
  { name: "Paris", lat: 48.8566, lon: 2.3522, radiusDeg: 0.1, mcc: 208, mncs: [1, 10, 20], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 14 },
  { name: "Berlin", lat: 52.52, lon: 13.405, radiusDeg: 0.1, mcc: 262, mncs: [1, 2, 3], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 12 },
  { name: "Moscow", lat: 55.7558, lon: 37.6173, radiusDeg: 0.15, mcc: 250, mncs: [1, 2, 99], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 14 },
  { name: "Istanbul", lat: 41.0082, lon: 28.9784, radiusDeg: 0.12, mcc: 286, mncs: [1, 2, 3], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 12 },
  { name: "Madrid", lat: 40.4168, lon: -3.7038, radiusDeg: 0.1, mcc: 214, mncs: [1, 3, 4], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 10 },
  { name: "Rome", lat: 41.9028, lon: 12.4964, radiusDeg: 0.1, mcc: 222, mncs: [1, 10, 88], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 10 },
  { name: "Amsterdam", lat: 52.3676, lon: 4.9041, radiusDeg: 0.08, mcc: 204, mncs: [4, 8, 16], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 8 },

  // Asia
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, radiusDeg: 0.15, mcc: 440, mncs: [10, 20, 50], radioDistribution: [0.02, 0.08, 0.5, 0.4], towerCount: 18 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074, radiusDeg: 0.15, mcc: 460, mncs: [0, 1, 11], radioDistribution: [0.05, 0.1, 0.45, 0.4], towerCount: 16 },
  { name: "Shanghai", lat: 31.2304, lon: 121.4737, radiusDeg: 0.12, mcc: 460, mncs: [0, 1, 11], radioDistribution: [0.05, 0.1, 0.45, 0.4], towerCount: 16 },
  { name: "Seoul", lat: 37.5665, lon: 126.978, radiusDeg: 0.1, mcc: 450, mncs: [5, 6, 8], radioDistribution: [0.02, 0.08, 0.45, 0.45], towerCount: 16 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, radiusDeg: 0.1, mcc: 404, mncs: [10, 45, 86], radioDistribution: [0.15, 0.2, 0.5, 0.15], towerCount: 14 },
  { name: "Delhi", lat: 28.7041, lon: 77.1025, radiusDeg: 0.12, mcc: 404, mncs: [10, 45, 86], radioDistribution: [0.15, 0.2, 0.5, 0.15], towerCount: 14 },
  { name: "Bangkok", lat: 13.7563, lon: 100.5018, radiusDeg: 0.1, mcc: 520, mncs: [1, 4, 18], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 12 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198, radiusDeg: 0.05, mcc: 525, mncs: [1, 3, 5], radioDistribution: [0.02, 0.08, 0.5, 0.4], towerCount: 10 },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456, radiusDeg: 0.12, mcc: 510, mncs: [1, 10, 11], radioDistribution: [0.1, 0.2, 0.55, 0.15], towerCount: 12 },
  { name: "Hong Kong", lat: 22.3193, lon: 114.1694, radiusDeg: 0.05, mcc: 454, mncs: [0, 6, 12], radioDistribution: [0.02, 0.08, 0.5, 0.4], towerCount: 10 },
  { name: "Taipei", lat: 25.033, lon: 121.5654, radiusDeg: 0.08, mcc: 466, mncs: [1, 5, 97], radioDistribution: [0.05, 0.1, 0.5, 0.35], towerCount: 10 },

  // Middle East
  { name: "Dubai", lat: 25.2048, lon: 55.2708, radiusDeg: 0.1, mcc: 424, mncs: [2, 3], radioDistribution: [0.05, 0.1, 0.5, 0.35], towerCount: 10 },
  { name: "Riyadh", lat: 24.7136, lon: 46.6753, radiusDeg: 0.12, mcc: 420, mncs: [1, 3, 4], radioDistribution: [0.05, 0.1, 0.5, 0.35], towerCount: 10 },
  { name: "Tel Aviv", lat: 32.0853, lon: 34.7818, radiusDeg: 0.06, mcc: 425, mncs: [1, 2, 3], radioDistribution: [0.05, 0.1, 0.5, 0.35], towerCount: 8 },

  // Africa
  { name: "Lagos", lat: 6.5244, lon: 3.3792, radiusDeg: 0.12, mcc: 621, mncs: [20, 30, 50], radioDistribution: [0.2, 0.25, 0.45, 0.1], towerCount: 12 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, radiusDeg: 0.1, mcc: 602, mncs: [1, 2, 3], radioDistribution: [0.1, 0.2, 0.55, 0.15], towerCount: 12 },
  { name: "Johannesburg", lat: -26.2041, lon: 28.0473, radiusDeg: 0.1, mcc: 655, mncs: [1, 7, 10], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 10 },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219, radiusDeg: 0.08, mcc: 639, mncs: [2, 3, 7], radioDistribution: [0.15, 0.2, 0.5, 0.15], towerCount: 8 },

  // South America
  { name: "Sao Paulo", lat: -23.5505, lon: -46.6333, radiusDeg: 0.15, mcc: 724, mncs: [2, 6, 10, 11], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 14 },
  { name: "Buenos Aires", lat: -34.6037, lon: -58.3816, radiusDeg: 0.1, mcc: 722, mncs: [10, 70, 310], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 10 },
  { name: "Bogota", lat: 4.711, lon: -74.0721, radiusDeg: 0.08, mcc: 732, mncs: [101, 103, 123], radioDistribution: [0.1, 0.2, 0.55, 0.15], towerCount: 10 },
  { name: "Lima", lat: -12.0464, lon: -77.0428, radiusDeg: 0.08, mcc: 716, mncs: [6, 10, 17], radioDistribution: [0.1, 0.2, 0.55, 0.15], towerCount: 8 },
  { name: "Santiago", lat: -33.4489, lon: -70.6693, radiusDeg: 0.1, mcc: 730, mncs: [1, 2, 10], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 8 },

  // Oceania
  { name: "Sydney", lat: -33.8688, lon: 151.2093, radiusDeg: 0.12, mcc: 505, mncs: [1, 2, 3], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 12 },
  { name: "Melbourne", lat: -37.8136, lon: 144.9631, radiusDeg: 0.1, mcc: 505, mncs: [1, 2, 3], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 10 },
  { name: "Auckland", lat: -36.8485, lon: 174.7633, radiusDeg: 0.08, mcc: 530, mncs: [1, 5, 24], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 8 },

  // Additional Asian cities
  { name: "Manila", lat: 14.5995, lon: 120.9842, radiusDeg: 0.1, mcc: 515, mncs: [1, 2, 3], radioDistribution: [0.1, 0.2, 0.55, 0.15], towerCount: 10 },
  { name: "Kuala Lumpur", lat: 3.139, lon: 101.6869, radiusDeg: 0.08, mcc: 502, mncs: [12, 13, 16], radioDistribution: [0.1, 0.15, 0.55, 0.2], towerCount: 10 },
  { name: "Ho Chi Minh City", lat: 10.8231, lon: 106.6297, radiusDeg: 0.08, mcc: 452, mncs: [1, 2, 4], radioDistribution: [0.1, 0.2, 0.55, 0.15], towerCount: 10 },

  // Additional European cities
  { name: "Warsaw", lat: 52.2297, lon: 21.0122, radiusDeg: 0.08, mcc: 260, mncs: [1, 2, 6], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 8 },
  { name: "Stockholm", lat: 59.3293, lon: 18.0686, radiusDeg: 0.08, mcc: 240, mncs: [1, 7, 8], radioDistribution: [0.03, 0.07, 0.5, 0.4], towerCount: 8 },
  { name: "Vienna", lat: 48.2082, lon: 16.3738, radiusDeg: 0.08, mcc: 232, mncs: [1, 3, 5], radioDistribution: [0.05, 0.1, 0.55, 0.3], towerCount: 8 },
];

const RADIO_TYPES: CellTower["radio"][] = ["GSM", "UMTS", "LTE", "NR"];

/**
 * Seeded pseudo-random number generator for deterministic tower placement.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

/**
 * Pick a radio type based on the city's distribution.
 */
function pickRadio(dist: [number, number, number, number], rng: () => number): CellTower["radio"] {
  const roll = rng();
  let cumulative = 0;
  for (let i = 0; i < 4; i++) {
    cumulative += dist[i];
    if (roll < cumulative) return RADIO_TYPES[i];
  }
  return "LTE";
}

/**
 * Generate cell towers for a city cluster.
 */
function generateCityTowers(city: CityCluster, seed: number): CellTower[] {
  const rng = seededRandom(seed);
  const towers: CellTower[] = [];

  for (let i = 0; i < city.towerCount; i++) {
    // Random position within the city radius
    const angle = rng() * 2 * Math.PI;
    const dist = Math.sqrt(rng()) * city.radiusDeg;
    const lat = city.lat + dist * Math.cos(angle);
    const lon = city.lon + dist * Math.sin(angle);

    const radio = pickRadio(city.radioDistribution, rng);
    const mnc = city.mncs[Math.floor(rng() * city.mncs.length)];

    // Range in meters: varies by radio type
    const rangeBase = radio === "NR" ? 500 : radio === "LTE" ? 2000 : radio === "UMTS" ? 3000 : 5000;
    const range = Math.round(rangeBase * (0.5 + rng()));

    // Created timestamp: random time in the past 5 years
    const fiveYearsMs = 5 * 365.25 * 24 * 3600 * 1000;
    const created = Math.floor((Date.now() - rng() * fiveYearsMs) / 1000);

    towers.push({
      id: `ct-${city.name.substring(0, 3).toLowerCase()}-${i}`,
      latitude: lat,
      longitude: lon,
      mcc: city.mcc,
      mnc,
      radio,
      range,
      created,
    });
  }

  return towers;
}

/**
 * Fetches cell tower data.
 *
 * Since OpenCelliD requires API key registration for bulk access, this
 * generates representative cell tower density data for the world's top 50
 * cities with realistic MCC/MNC codes and radio type distributions.
 *
 * The data provides a good visual representation of global cell tower
 * density patterns. Users can later integrate their own OpenCelliD API
 * key for real data.
 *
 * Radio type distributions reflect each region's infrastructure maturity:
 * - Developed Asia (Japan, Korea): high NR/5G adoption
 * - US/Europe: balanced LTE/NR
 * - Developing regions: more GSM/UMTS
 */
export async function fetchCellTowers(): Promise<CellTower[]> {
  try {
    const allTowers: CellTower[] = [];

    for (let i = 0; i < CITY_CLUSTERS.length; i++) {
      const city = CITY_CLUSTERS[i];
      const towers = generateCityTowers(city, 65537 + i * 1009);
      allTowers.push(...towers);
    }

    return allTowers;
  } catch (err) {
    console.warn("Cell tower data generation failed:", err);
    return [];
  }
}

function normalizeRadio(radio: string): CellTower["radio"] {
  const upper = (radio || "").toUpperCase();
  if (upper === "NR" || upper === "5G") return "NR";
  if (upper === "LTE" || upper === "4G") return "LTE";
  if (upper === "UMTS" || upper === "3G" || upper === "WCDMA") return "UMTS";
  return "GSM";
}
