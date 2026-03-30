import { NextResponse } from "next/server";

/**
 * Server-side Bitcoin nodes API.
 *
 * The Bitnodes snapshot API no longer includes geographic data (lat/lon).
 * As of 2026, each node is just [protocol, user_agent, connected_since, services, height].
 *
 * Strategy:
 * 1. Fetch snapshot to get total node count
 * 2. Extract a sample of non-Tor IPv4 addresses
 * 3. Batch geolocate via ip-api.com (free, 100 IPs per batch)
 * 4. Group by location and scale counts
 * 5. Fall back to curated distribution if geolocation fails
 */

const BITNODES_URL = "https://bitnodes.io/api/v1/snapshots/latest/";
const IP_API_BATCH_URL = "http://ip-api.com/batch";
const SAMPLE_SIZE = 200; // IPs to geolocate per request
const MAX_BATCHES = 2;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch snapshot to get real node count and sample IPs
    const upstream = await fetch(BITNODES_URL, {
      headers: { "User-Agent": "TheSimulationSpace/1.0" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });

    let totalNodes = 0;
    let sampleIPs: string[] = [];

    if (upstream.ok) {
      const data = await upstream.json();
      const nodes = data?.nodes;
      if (nodes && typeof nodes === "object") {
        const entries = Object.entries(nodes);
        totalNodes = entries.length;

        // Extract non-Tor IPv4 addresses
        const ipv4 = entries
          .map(([key]) => key)
          .filter((k) => !k.includes(".onion") && !k.startsWith("["))
          .map((k) => k.split(":")[0]);

        // Random sample
        for (let i = ipv4.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ipv4[i], ipv4[j]] = [ipv4[j], ipv4[i]];
        }
        sampleIPs = ipv4.slice(0, SAMPLE_SIZE * MAX_BATCHES);
      }
    }

    // Try to geolocate sample IPs via ip-api.com batch endpoint
    const geolocated = await geolocateIPs(sampleIPs);

    if (geolocated.length > 0) {
      // Group by location and scale counts
      const grouped = groupAndScale(geolocated, totalNodes, sampleIPs.length);
      return NextResponse.json({
        nodes: grouped,
        totalRaw: totalNodes,
        geolocated: geolocated.length,
        grouped: grouped.length,
        source: "bitnodes+geoip",
      });
    }

    // Fallback: curated distribution based on known statistics
    const fallback = generateCuratedBitcoinNodes(totalNodes || 18000);
    return NextResponse.json({
      nodes: fallback,
      totalRaw: totalNodes || 18000,
      grouped: fallback.length,
      source: "curated-fallback",
    });
  } catch (err: any) {
    console.error("[Bitcoin Nodes API]", err.message);
    // Even on total failure, return curated data
    const fallback = generateCuratedBitcoinNodes(18000);
    return NextResponse.json({
      nodes: fallback,
      totalRaw: 18000,
      grouped: fallback.length,
      source: "error-fallback",
    });
  }
}

/**
 * Batch geolocate IPs using ip-api.com free batch endpoint.
 * Returns [{ ip, lat, lon, city, country, isp }]
 */
async function geolocateIPs(ips: string[]): Promise<Array<{
  lat: number; lon: number; city: string; country: string; isp: string;
}>> {
  const results: Array<{ lat: number; lon: number; city: string; country: string; isp: string }> = [];

  for (let b = 0; b < MAX_BATCHES && b * SAMPLE_SIZE < ips.length; b++) {
    const batch = ips.slice(b * SAMPLE_SIZE, (b + 1) * SAMPLE_SIZE);
    try {
      const res = await fetch(IP_API_BATCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch.map((ip) => ({ query: ip, fields: "lat,lon,city,country,isp,status" }))),
        signal: AbortSignal.timeout(8_000),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const d of data) {
            if (d.status === "success" && typeof d.lat === "number" && typeof d.lon === "number") {
              results.push({
                lat: d.lat,
                lon: d.lon,
                city: d.city || "Unknown",
                country: d.country || "Unknown",
                isp: d.isp || "Unknown",
              });
            }
          }
        }
      }
    } catch {
      // Batch failed — continue with what we have
    }

    // Rate limit: ip-api free tier allows 45 req/min
    if (b < MAX_BATCHES - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return results;
}

/**
 * Group geolocated IPs by rounded coordinates and scale counts
 * to approximate the total network distribution.
 */
function groupAndScale(
  geolocated: Array<{ lat: number; lon: number; city: string; country: string; isp: string }>,
  totalNodes: number,
  sampleSize: number
) {
  const scaleFactor = totalNodes > 0 && sampleSize > 0 ? totalNodes / sampleSize : 1;

  const groups = new Map<string, {
    lat: number; lon: number; city: string; country: string; isp: string; count: number;
  }>();

  for (const g of geolocated) {
    const key = `${Math.round(g.lat * 10) / 10},${Math.round(g.lon * 10) / 10}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { ...g, count: 1 });
    }
  }

  return Array.from(groups.values()).map((g) => ({
    latitude: g.lat,
    longitude: g.lon,
    city: g.city,
    country: g.country,
    nodeCount: Math.round(g.count * scaleFactor),
    isp: g.isp,
  }));
}

/**
 * Curated Bitcoin node locations based on known global distribution.
 * Source: Bitnodes.io statistics, Luke Dashjr census data.
 */
function generateCuratedBitcoinNodes(totalNodes: number) {
  const distribution: Array<{
    city: string; country: string; lat: number; lon: number;
    pct: number; // percentage of total nodes
    spread: number; // geographic spread in degrees
  }> = [
    // USA (~25%)
    { city: "Ashburn, VA", country: "US", lat: 39.04, lon: -77.49, pct: 8, spread: 0.5 },
    { city: "New York, NY", country: "US", lat: 40.71, lon: -74.01, pct: 3, spread: 0.5 },
    { city: "San Francisco, CA", country: "US", lat: 37.77, lon: -122.42, pct: 2, spread: 0.5 },
    { city: "Los Angeles, CA", country: "US", lat: 34.05, lon: -118.24, pct: 1.5, spread: 0.5 },
    { city: "Chicago, IL", country: "US", lat: 41.88, lon: -87.63, pct: 1.5, spread: 0.3 },
    { city: "Dallas, TX", country: "US", lat: 32.78, lon: -96.80, pct: 2, spread: 0.5 },
    { city: "Seattle, WA", country: "US", lat: 47.61, lon: -122.33, pct: 1, spread: 0.3 },
    { city: "Miami, FL", country: "US", lat: 25.76, lon: -80.19, pct: 1, spread: 0.3 },
    { city: "Atlanta, GA", country: "US", lat: 33.75, lon: -84.39, pct: 1, spread: 0.3 },
    { city: "Denver, CO", country: "US", lat: 39.74, lon: -104.99, pct: 0.8, spread: 0.3 },
    { city: "Phoenix, AZ", country: "US", lat: 33.45, lon: -112.07, pct: 0.7, spread: 0.3 },
    { city: "Portland, OR", country: "US", lat: 45.52, lon: -122.68, pct: 0.5, spread: 0.2 },

    // Germany (~15%)
    { city: "Frankfurt", country: "DE", lat: 50.11, lon: 8.68, pct: 6, spread: 0.5 },
    { city: "Berlin", country: "DE", lat: 52.52, lon: 13.41, pct: 3, spread: 0.4 },
    { city: "Munich", country: "DE", lat: 48.14, lon: 11.58, pct: 2, spread: 0.3 },
    { city: "Hamburg", country: "DE", lat: 53.55, lon: 10.0, pct: 1, spread: 0.2 },
    { city: "Nuremberg", country: "DE", lat: 49.45, lon: 11.08, pct: 1.5, spread: 0.3 },
    { city: "Düsseldorf", country: "DE", lat: 51.23, lon: 6.78, pct: 1, spread: 0.2 },

    // France (~8%)
    { city: "Paris", country: "FR", lat: 48.86, lon: 2.35, pct: 4, spread: 0.4 },
    { city: "Strasbourg", country: "FR", lat: 48.57, lon: 7.75, pct: 1.5, spread: 0.2 },
    { city: "Marseille", country: "FR", lat: 43.30, lon: 5.37, pct: 1, spread: 0.2 },
    { city: "Gravelines", country: "FR", lat: 50.99, lon: 2.13, pct: 1, spread: 0.2 },

    // Netherlands (~6%)
    { city: "Amsterdam", country: "NL", lat: 52.37, lon: 4.90, pct: 4, spread: 0.3 },
    { city: "Rotterdam", country: "NL", lat: 51.92, lon: 4.48, pct: 1.5, spread: 0.2 },

    // UK (~5%)
    { city: "London", country: "GB", lat: 51.51, lon: -0.13, pct: 3, spread: 0.4 },
    { city: "Manchester", country: "GB", lat: 53.48, lon: -2.24, pct: 1, spread: 0.2 },

    // Canada (~4%)
    { city: "Toronto", country: "CA", lat: 43.65, lon: -79.38, pct: 1.5, spread: 0.3 },
    { city: "Montreal", country: "CA", lat: 45.50, lon: -73.57, pct: 1, spread: 0.2 },
    { city: "Vancouver", country: "CA", lat: 49.28, lon: -123.12, pct: 1, spread: 0.2 },

    // Singapore (~3%)
    { city: "Singapore", country: "SG", lat: 1.35, lon: 103.82, pct: 3, spread: 0.2 },

    // Japan (~2%)
    { city: "Tokyo", country: "JP", lat: 35.68, lon: 139.69, pct: 1.5, spread: 0.3 },
    { city: "Osaka", country: "JP", lat: 34.69, lon: 135.50, pct: 0.5, spread: 0.2 },

    // Australia (~2%)
    { city: "Sydney", country: "AU", lat: -33.87, lon: 151.21, pct: 1, spread: 0.3 },
    { city: "Melbourne", country: "AU", lat: -37.81, lon: 144.96, pct: 0.5, spread: 0.2 },

    // Finland (~2%)
    { city: "Helsinki", country: "FI", lat: 60.17, lon: 24.94, pct: 1.5, spread: 0.2 },

    // Switzerland (~1.5%)
    { city: "Zurich", country: "CH", lat: 47.37, lon: 8.54, pct: 1.5, spread: 0.2 },

    // Other notable
    { city: "Stockholm", country: "SE", lat: 59.33, lon: 18.07, pct: 1, spread: 0.2 },
    { city: "Vienna", country: "AT", lat: 48.21, lon: 16.37, pct: 0.8, spread: 0.2 },
    { city: "Prague", country: "CZ", lat: 50.08, lon: 14.44, pct: 0.7, spread: 0.2 },
    { city: "Warsaw", country: "PL", lat: 52.23, lon: 21.01, pct: 0.5, spread: 0.2 },
    { city: "São Paulo", country: "BR", lat: -23.55, lon: -46.63, pct: 0.5, spread: 0.3 },
    { city: "Mumbai", country: "IN", lat: 19.08, lon: 72.88, pct: 0.3, spread: 0.2 },
    { city: "Seoul", country: "KR", lat: 37.57, lon: 126.98, pct: 0.5, spread: 0.2 },
    { city: "Hong Kong", country: "HK", lat: 22.32, lon: 114.17, pct: 0.5, spread: 0.2 },
    { city: "Moscow", country: "RU", lat: 55.76, lon: 37.62, pct: 0.5, spread: 0.3 },
    { city: "Dublin", country: "IE", lat: 53.35, lon: -6.26, pct: 0.5, spread: 0.2 },
    { city: "Oslo", country: "NO", lat: 59.91, lon: 10.75, pct: 0.4, spread: 0.2 },
    { city: "Bucharest", country: "RO", lat: 44.43, lon: 26.10, pct: 0.3, spread: 0.2 },
    { city: "Buenos Aires", country: "AR", lat: -34.60, lon: -58.38, pct: 0.2, spread: 0.2 },
    { city: "Reykjavik", country: "IS", lat: 64.15, lon: -21.95, pct: 0.3, spread: 0.1 },
  ];

  const results: any[] = [];
  for (const loc of distribution) {
    const count = Math.max(1, Math.round((loc.pct / 100) * totalNodes));
    // Create 2-5 sub-clusters per city for visual scatter
    const subClusters = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < subClusters; i++) {
      results.push({
        latitude: loc.lat + (Math.random() - 0.5) * loc.spread,
        longitude: loc.lon + (Math.random() - 0.5) * loc.spread,
        city: loc.city,
        country: loc.country,
        nodeCount: Math.max(1, Math.round(count / subClusters)),
        isp: "Various",
      });
    }
  }

  return results;
}
