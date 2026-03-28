export interface CountryIndicator {
  countryCode: string; // ISO2
  countryName: string;
  latitude: number;
  longitude: number;
  gdp: number | null;
  population: number | null;
  gdpPerCapita: number | null;
  year: number;
}

/**
 * Country centroids mapping ISO2 codes to [lat, lon].
 * Used to position data points on the globe.
 */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [39.8283, -98.5795],
  CN: [35.8617, 104.1954],
  DE: [51.1657, 10.4515],
  JP: [36.2048, 138.2529],
  GB: [55.3781, -3.436],
  FR: [46.6034, 1.8883],
  IN: [20.5937, 78.9629],
  IT: [41.8719, 12.5674],
  BR: [-14.235, -51.9253],
  CA: [56.1304, -106.3468],
  KR: [35.9078, 127.7669],
  RU: [61.524, 105.3188],
  AU: [-25.2744, 133.7751],
  ES: [40.4637, -3.7492],
  MX: [23.6345, -102.5528],
  ID: [-0.7893, 113.9213],
  NL: [52.1326, 5.2913],
  SA: [23.8859, 45.0792],
  TR: [38.9637, 35.2433],
  CH: [46.8182, 8.2275],
  PL: [51.9194, 19.1451],
  TH: [15.87, 100.9925],
  SE: [60.1282, 18.6435],
  BE: [50.5039, 4.4699],
  NG: [9.082, 8.6753],
  AT: [47.5162, 14.5501],
  NO: [60.472, 8.4689],
  AE: [23.4241, 53.8478],
  IL: [31.0461, 34.8516],
  IE: [53.1424, -7.6921],
  SG: [1.3521, 103.8198],
  MY: [4.2105, 101.9758],
  PH: [12.8797, 121.774],
  DK: [56.2639, 9.5018],
  ZA: [-30.5595, 22.9375],
  CO: [4.5709, -74.2973],
  EG: [26.8206, 30.8025],
  CL: [-35.6751, -71.543],
  FI: [61.9241, 25.7482],
  BD: [23.685, 90.3563],
  VN: [14.0583, 108.2772],
  CZ: [49.8175, 15.473],
  PT: [39.3999, -8.2245],
  NZ: [-40.9006, 174.886],
  AR: [-38.4161, -63.6167],
  QA: [25.3548, 51.1839],
  KW: [29.3117, 47.4818],
  PE: [-9.19, -75.0152],
  KZ: [48.0196, 66.9237],
  PK: [30.3753, 69.3451],
  GH: [7.9465, -1.0232],
  KE: [-0.0236, 37.9062],
  ET: [9.145, 40.4897],
  TZ: [-6.369, 34.8888],
  UA: [48.3794, 31.1656],
  RO: [45.9432, 24.9668],
  HU: [47.1625, 19.5033],
  GR: [39.0742, 21.8243],
  HR: [45.1, 15.2],
  BG: [42.7339, 25.4858],
  RS: [44.0165, 21.0059],
  LK: [7.8731, 80.7718],
  MM: [21.9162, 95.956],
  NP: [28.3949, 84.124],
  UZ: [41.3775, 64.5853],
  EC: [-1.8312, -78.1834],
  MA: [31.7917, -7.0926],
  DZ: [28.0339, 1.6596],
  AO: [-11.2027, 17.8739],
  IQ: [33.2232, 43.6793],
  IR: [32.4279, 53.688],
};

const WORLD_BANK_GDP_URL =
  "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&date=2022&per_page=300";
const WORLD_BANK_POP_URL =
  "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2022&per_page=300";

/**
 * Fetches World Bank GDP and Population data, merges them, and computes
 * GDP per capita. Uses the free World Bank API (no key required).
 */
export async function fetchWorldBankIndicators(): Promise<CountryIndicator[]> {
  // Fetch GDP and Population in parallel
  const [gdpRes, popRes] = await Promise.all([
    fetch(WORLD_BANK_GDP_URL),
    fetch(WORLD_BANK_POP_URL),
  ]);

  if (!gdpRes.ok) throw new Error(`World Bank GDP API error: ${gdpRes.status}`);
  if (!popRes.ok) throw new Error(`World Bank Pop API error: ${popRes.status}`);

  const [gdpJson, popJson] = await Promise.all([
    gdpRes.json(),
    popRes.json(),
  ]);

  // World Bank API returns [metadata, data[]]
  const gdpRecords = gdpJson[1];
  const popRecords = popJson[1];

  if (!gdpRecords || !Array.isArray(gdpRecords)) return [];

  // Build population lookup by ISO2 country code
  const popMap = new Map<string, number>();
  if (popRecords && Array.isArray(popRecords)) {
    for (const record of popRecords) {
      const code = record.country?.id;
      const pop = record.value;
      if (code && pop !== null && pop !== undefined) {
        popMap.set(code, pop);
      }
    }
  }

  const results: CountryIndicator[] = [];

  for (const record of gdpRecords) {
    const countryCode = record.country?.id;
    const coords = COUNTRY_CENTROIDS[countryCode];
    if (!coords) continue; // Skip aggregates and unknown countries

    const gdp = record.value;
    if (gdp === null || gdp === undefined) continue;

    const population = popMap.get(countryCode) ?? null;
    const gdpPerCapita =
      population && population > 0 ? gdp / population : null;

    results.push({
      countryCode,
      countryName: record.country?.value || countryCode,
      latitude: coords[0],
      longitude: coords[1],
      gdp,
      population,
      gdpPerCapita,
      year: Number(record.date) || 2022,
    });
  }

  return results;
}
