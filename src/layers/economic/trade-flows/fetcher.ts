export interface TradeFlow {
  reporterCountry: string;
  partnerCountry: string;
  reporterLat: number;
  reporterLon: number;
  partnerLat: number;
  partnerLon: number;
  tradeValue: number; // USD
  year: number;
  commodity: string;
}

/**
 * Centroid coordinates [lat, lon] for ~50 major trading nations (ISO3).
 * Used to position arc endpoints on the globe.
 */
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  USA: [39.8283, -98.5795],
  CHN: [35.8617, 104.1954],
  DEU: [51.1657, 10.4515],
  JPN: [36.2048, 138.2529],
  GBR: [55.3781, -3.436],
  FRA: [46.6034, 1.8883],
  IND: [20.5937, 78.9629],
  ITA: [41.8719, 12.5674],
  BRA: [-14.235, -51.9253],
  CAN: [56.1304, -106.3468],
  KOR: [35.9078, 127.7669],
  RUS: [61.524, 105.3188],
  AUS: [-25.2744, 133.7751],
  ESP: [40.4637, -3.7492],
  MEX: [23.6345, -102.5528],
  IDN: [-0.7893, 113.9213],
  NLD: [52.1326, 5.2913],
  SAU: [23.8859, 45.0792],
  TUR: [38.9637, 35.2433],
  CHE: [46.8182, 8.2275],
  POL: [51.9194, 19.1451],
  THA: [15.87, 100.9925],
  SWE: [60.1282, 18.6435],
  BEL: [50.5039, 4.4699],
  NGA: [9.082, 8.6753],
  AUT: [47.5162, 14.5501],
  NOR: [60.472, 8.4689],
  ARE: [23.4241, 53.8478],
  ISR: [31.0461, 34.8516],
  IRL: [53.1424, -7.6921],
  SGP: [1.3521, 103.8198],
  MYS: [4.2105, 101.9758],
  PHL: [12.8797, 121.774],
  DNK: [56.2639, 9.5018],
  ZAF: [-30.5595, 22.9375],
  COL: [4.5709, -74.2973],
  EGY: [26.8206, 30.8025],
  CHL: [-35.6751, -71.543],
  FIN: [61.9241, 25.7482],
  BGD: [23.685, 90.3563],
  VNM: [14.0583, 108.2772],
  CZE: [49.8175, 15.473],
  PRT: [39.3999, -8.2245],
  NZL: [-40.9006, 174.886],
  ARG: [-38.4161, -63.6167],
  QAT: [25.3548, 51.1839],
  KWT: [29.3117, 47.4818],
  PER: [-9.19, -75.0152],
  KAZ: [48.0196, 66.9237],
  PAK: [30.3753, 69.3451],
};

/**
 * Top bilateral trade relationships with approximate 2023 trade values.
 * Data sourced from World Bank WITS, ITC Trade Map, and UN Comtrade
 * annual summaries (publicly available aggregate data).
 *
 * Values are total bilateral merchandise trade (exports + imports) in USD.
 */
const TOP_TRADE_RELATIONSHIPS: {
  reporter: string;
  partner: string;
  value: number; // billions USD
  commodity: string;
}[] = [
  { reporter: "USA", partner: "CHN", value: 575, commodity: "Electronics, machinery, agriculture" },
  { reporter: "USA", partner: "CAN", value: 780, commodity: "Energy, vehicles, machinery" },
  { reporter: "USA", partner: "MEX", value: 800, commodity: "Vehicles, electronics, agriculture" },
  { reporter: "USA", partner: "JPN", value: 225, commodity: "Vehicles, machinery, pharmaceuticals" },
  { reporter: "USA", partner: "DEU", value: 260, commodity: "Vehicles, machinery, pharmaceuticals" },
  { reporter: "USA", partner: "KOR", value: 190, commodity: "Electronics, vehicles, machinery" },
  { reporter: "USA", partner: "GBR", value: 150, commodity: "Machinery, pharmaceuticals, finance" },
  { reporter: "USA", partner: "IND", value: 130, commodity: "Pharmaceuticals, IT services, gems" },
  { reporter: "CHN", partner: "JPN", value: 320, commodity: "Electronics, machinery, chemicals" },
  { reporter: "CHN", partner: "KOR", value: 310, commodity: "Semiconductors, electronics, chemicals" },
  { reporter: "CHN", partner: "DEU", value: 250, commodity: "Vehicles, machinery, chemicals" },
  { reporter: "CHN", partner: "AUS", value: 230, commodity: "Iron ore, coal, LNG" },
  { reporter: "CHN", partner: "BRA", value: 180, commodity: "Soybeans, iron ore, oil" },
  { reporter: "CHN", partner: "VNM", value: 175, commodity: "Electronics, textiles, machinery" },
  { reporter: "CHN", partner: "RUS", value: 200, commodity: "Energy, machinery, chemicals" },
  { reporter: "CHN", partner: "MYS", value: 160, commodity: "Electronics, palm oil, semiconductors" },
  { reporter: "CHN", partner: "SGP", value: 140, commodity: "Electronics, petrochemicals, machinery" },
  { reporter: "CHN", partner: "THA", value: 130, commodity: "Electronics, rubber, machinery" },
  { reporter: "CHN", partner: "IND", value: 120, commodity: "Electronics, chemicals, machinery" },
  { reporter: "DEU", partner: "FRA", value: 200, commodity: "Vehicles, machinery, chemicals" },
  { reporter: "DEU", partner: "NLD", value: 220, commodity: "Machinery, chemicals, vehicles" },
  { reporter: "DEU", partner: "ITA", value: 170, commodity: "Vehicles, machinery, pharmaceuticals" },
  { reporter: "DEU", partner: "POL", value: 160, commodity: "Vehicles, machinery, electronics" },
  { reporter: "DEU", partner: "CHE", value: 130, commodity: "Pharmaceuticals, machinery, chemicals" },
  { reporter: "DEU", partner: "AUT", value: 120, commodity: "Vehicles, machinery, electronics" },
  { reporter: "GBR", partner: "NLD", value: 110, commodity: "Energy, chemicals, machinery" },
  { reporter: "GBR", partner: "FRA", value: 105, commodity: "Machinery, pharmaceuticals, aerospace" },
  { reporter: "JPN", partner: "KOR", value: 85, commodity: "Semiconductors, chemicals, steel" },
  { reporter: "JPN", partner: "AUS", value: 80, commodity: "LNG, coal, iron ore" },
  { reporter: "SAU", partner: "CHN", value: 90, commodity: "Crude oil, petrochemicals" },
  { reporter: "SAU", partner: "IND", value: 55, commodity: "Crude oil, petrochemicals" },
  { reporter: "SAU", partner: "JPN", value: 45, commodity: "Crude oil, LNG" },
  { reporter: "SAU", partner: "KOR", value: 40, commodity: "Crude oil, petrochemicals" },
  { reporter: "ARE", partner: "IND", value: 85, commodity: "Oil, gold, diamonds" },
  { reporter: "RUS", partner: "TUR", value: 60, commodity: "Energy, agriculture, metals" },
  { reporter: "BRA", partner: "ARG", value: 35, commodity: "Vehicles, machinery, agriculture" },
  { reporter: "IDN", partner: "CHN", value: 110, commodity: "Palm oil, coal, metals" },
  { reporter: "IND", partner: "SAU", value: 55, commodity: "Oil, gems, textiles" },
  { reporter: "NGA", partner: "IND", value: 15, commodity: "Crude oil, LNG" },
  { reporter: "ZAF", partner: "CHN", value: 35, commodity: "Minerals, metals, agriculture" },
];

/**
 * Fetches bilateral trade flow data.
 *
 * Attempts to fetch from UN Comtrade public preview API first.
 * Falls back to a curated dataset of the top 40 bilateral trade
 * relationships with realistic 2023 values from World Bank/ITC data.
 *
 * The curated fallback covers the most significant global trade corridors
 * and provides meaningful visualization for the trade flow arc layer.
 */
export async function fetchTradeFlows(): Promise<TradeFlow[]> {
  // Try UN Comtrade public preview API first
  try {
    const url =
      "https://comtradeapi.un.org/public/v1/preview/C/A/HS/ALL/ALL?period=2023";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
        const flows: TradeFlow[] = [];
        for (const d of json.data) {
          const reporterCoords = COUNTRY_COORDS[d.reporterISO3];
          const partnerCoords = COUNTRY_COORDS[d.partnerISO3];
          if (!reporterCoords || !partnerCoords) continue;
          if (d.partnerISO3 === "WLD") continue; // Skip world aggregates

          flows.push({
            reporterCountry: d.reporterISO3,
            partnerCountry: d.partnerISO3,
            reporterLat: reporterCoords[0],
            reporterLon: reporterCoords[1],
            partnerLat: partnerCoords[0],
            partnerLon: partnerCoords[1],
            tradeValue: d.primaryValue || 0,
            year: d.period || 2023,
            commodity: d.cmdDesc || "Total",
          });
        }
        if (flows.length > 0) return flows;
      }
    }
  } catch {
    // Comtrade API unavailable — fall through to curated data
  }

  // Fallback: curated top bilateral trade relationships
  return generateCuratedTradeFlows();
}

/**
 * Generate curated trade flow data from known bilateral relationships.
 */
function generateCuratedTradeFlows(): TradeFlow[] {
  const flows: TradeFlow[] = [];

  for (const rel of TOP_TRADE_RELATIONSHIPS) {
    const reporterCoords = COUNTRY_COORDS[rel.reporter];
    const partnerCoords = COUNTRY_COORDS[rel.partner];
    if (!reporterCoords || !partnerCoords) continue;

    flows.push({
      reporterCountry: rel.reporter,
      partnerCountry: rel.partner,
      reporterLat: reporterCoords[0],
      reporterLon: reporterCoords[1],
      partnerLat: partnerCoords[0],
      partnerLon: partnerCoords[1],
      tradeValue: rel.value * 1_000_000_000, // Convert billions to USD
      year: 2023,
      commodity: rel.commodity,
    });
  }

  return flows;
}
