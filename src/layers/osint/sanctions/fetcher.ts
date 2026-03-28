export interface SanctionedEntity {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  program: "OFAC" | "EU" | "UK" | "UN";
  entityType: "individual" | "entity" | "vessel";
  listingDate: string;
}

export interface SanctionedCountry {
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  sanctionCount: number;
  programs: string[];
}

/**
 * Heavily sanctioned countries with approximate aggregate counts.
 * Based on OFAC, EU, UK, and UN sanctions programs.
 *
 * NOTE: The OFAC SDN list is a large XML/CSV file (~30MB) that would
 * require server-side processing. This static reference provides an
 * overview of sanctions density by country for visualization.
 *
 * Full implementation would:
 * 1. Parse the OFAC SDN XML: https://www.treasury.gov/ofac/downloads/sdn.xml
 * 2. Cross-reference with EU consolidated list
 * 3. Aggregate by country and entity type
 * 4. Geocode entity addresses where available
 */
const SANCTIONED_COUNTRIES: SanctionedCountry[] = [
  {
    countryCode: "RU",
    countryName: "Russia",
    latitude: 61.524,
    longitude: 105.3188,
    sanctionCount: 4500,
    programs: ["OFAC", "EU", "UK", "UN"],
  },
  {
    countryCode: "IR",
    countryName: "Iran",
    latitude: 32.4279,
    longitude: 53.688,
    sanctionCount: 2800,
    programs: ["OFAC", "EU", "UK", "UN"],
  },
  {
    countryCode: "KP",
    countryName: "North Korea",
    latitude: 40.3399,
    longitude: 127.5101,
    sanctionCount: 900,
    programs: ["OFAC", "EU", "UK", "UN"],
  },
  {
    countryCode: "SY",
    countryName: "Syria",
    latitude: 34.8021,
    longitude: 38.9968,
    sanctionCount: 1200,
    programs: ["OFAC", "EU", "UK"],
  },
  {
    countryCode: "CU",
    countryName: "Cuba",
    latitude: 21.5218,
    longitude: -77.7812,
    sanctionCount: 350,
    programs: ["OFAC"],
  },
  {
    countryCode: "VE",
    countryName: "Venezuela",
    latitude: 6.4238,
    longitude: -66.5897,
    sanctionCount: 450,
    programs: ["OFAC", "EU", "UK"],
  },
  {
    countryCode: "MM",
    countryName: "Myanmar",
    latitude: 21.9162,
    longitude: 95.956,
    sanctionCount: 600,
    programs: ["OFAC", "EU", "UK"],
  },
  {
    countryCode: "BY",
    countryName: "Belarus",
    latitude: 53.7098,
    longitude: 27.9534,
    sanctionCount: 800,
    programs: ["OFAC", "EU", "UK"],
  },
  {
    countryCode: "CN",
    countryName: "China",
    latitude: 35.8617,
    longitude: 104.1954,
    sanctionCount: 700,
    programs: ["OFAC", "EU", "UK"],
  },
  {
    countryCode: "LB",
    countryName: "Lebanon",
    latitude: 33.8547,
    longitude: 35.8623,
    sanctionCount: 400,
    programs: ["OFAC", "EU"],
  },
  {
    countryCode: "IQ",
    countryName: "Iraq",
    latitude: 33.2232,
    longitude: 43.6793,
    sanctionCount: 350,
    programs: ["OFAC", "EU", "UN"],
  },
  {
    countryCode: "SO",
    countryName: "Somalia",
    latitude: 5.1521,
    longitude: 46.1996,
    sanctionCount: 250,
    programs: ["OFAC", "EU", "UN"],
  },
  {
    countryCode: "YE",
    countryName: "Yemen",
    latitude: 15.5527,
    longitude: 48.5164,
    sanctionCount: 300,
    programs: ["OFAC", "EU", "UN"],
  },
  {
    countryCode: "SD",
    countryName: "Sudan",
    latitude: 12.8628,
    longitude: 30.2176,
    sanctionCount: 280,
    programs: ["OFAC", "EU", "UN"],
  },
  {
    countryCode: "LY",
    countryName: "Libya",
    latitude: 26.3351,
    longitude: 17.2283,
    sanctionCount: 320,
    programs: ["OFAC", "EU", "UN"],
  },
];

/**
 * Returns static sanctions reference data.
 * This is a reference layer that does not require live API calls.
 */
export async function fetchSanctions(): Promise<SanctionedCountry[]> {
  return SANCTIONED_COUNTRIES;
}
