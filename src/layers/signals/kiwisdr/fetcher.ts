// KiwiSDR Network — Global SDR receiver network via proxy
// No auth required. ~900+ public HF receivers worldwide.

import { proxyFetch } from "@/lib/proxy-fetch";

const RECEIVERBOOK_URL = "https://www.receiverbook.de/map?type=kiwisdr";

export interface KiwisdrReceiver {
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  country: string;
  users: number;
  usersMax: number;
  antenna: string;
  offline: boolean;
  tdoa: boolean;
}

export interface KiwisdrData {
  source: "KiwiSDR";
  timestamp: string;
  status: "active" | "error";
  network: {
    totalReceivers: number;
    online: number;
    offline: number;
    totalUsers: number;
    totalCapacity: number;
    utilizationPct: number;
    tdoaCapable: number;
  };
  geographic: {
    byContinent: Record<string, number>;
    topCountries: Array<{ country: string; count: number }>;
  };
  conflictZones: Record<string, { region: string; count: number; receivers: KiwisdrReceiver[] }>;
  topActive: KiwisdrReceiver[];
  onlineReceivers: KiwisdrReceiver[];
  signals: string[];
  message?: string;
}

const REGIONS_OF_INTEREST: Record<string, { lamin: number; lomin: number; lamax: number; lomax: number; label: string }> = {
  middleEast: { lamin: 12, lomin: 30, lamax: 42, lomax: 65, label: "Middle East" },
  ukraine: { lamin: 44, lomin: 22, lamax: 53, lomax: 41, label: "Ukraine / Eastern Europe" },
  taiwan: { lamin: 20, lomin: 115, lamax: 28, lomax: 125, label: "Taiwan Strait" },
  southChinaSea: { lamin: 5, lomin: 105, lamax: 23, lomax: 122, label: "South China Sea" },
  koreanPeninsula: { lamin: 33, lomin: 124, lamax: 43, lomax: 132, label: "Korean Peninsula" },
};

function getContinent(lat: number, lon: number): string {
  if (isNaN(lat) || isNaN(lon)) return "Unknown";
  if (lat >= 15 && lat <= 72 && lon >= -170 && lon <= -50) return "North America";
  if (lat >= -60 && lat < 15 && lon >= -90 && lon <= -30) return "South America";
  if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 45) return "Europe";
  if (lat >= -35 && lat <= 37 && lon >= -25 && lon <= 55) return "Africa";
  if (lat >= 0 && lat <= 72 && lon >= 45 && lon <= 180) return "Asia";
  if (lat >= -50 && lat <= 0 && lon >= 95 && lon <= 180) return "Oceania";
  return "Other";
}

export async function fetchKiwisdrData(): Promise<KiwisdrData> {
  try {
    const res = await proxyFetch(RECEIVERBOOK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const match = html.match(/var\s+receivers\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) throw new Error("Could not parse receiver data from page");

    const sites = JSON.parse(match[1]) as any[];
    const allRx: KiwisdrReceiver[] = [];

    for (const site of sites) {
      const [lon, lat] = (site.location?.coordinates || [NaN, NaN]) as [number, number];
      const country = (site.label?.split(",").pop()?.trim() || "") as string;
      for (const rx of (site.receivers || [site])) {
        allRx.push({
          name: (rx.label || site.label || "").slice(0, 100),
          location: (site.label || "").slice(0, 80),
          latitude: parseFloat(lat as any) || NaN,
          longitude: parseFloat(lon as any) || NaN,
          country,
          users: parseInt(rx.users ?? 0, 10),
          usersMax: parseInt(rx.usersMax ?? 0, 10),
          antenna: (rx.antenna || "").slice(0, 80),
          offline: rx.offline === true,
          tdoa: !!(rx.tdoa && rx.tdoa > 0),
        });
      }
    }

    const onlineRx = allRx.filter((r) => !r.offline && !isNaN(r.latitude) && !isNaN(r.longitude));

    const byContinent: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    for (const rx of onlineRx) {
      const c = getContinent(rx.latitude, rx.longitude);
      byContinent[c] = (byContinent[c] || 0) + 1;
      byCountry[rx.country || "Unknown"] = (byCountry[rx.country || "Unknown"] || 0) + 1;
    }
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([country, count]) => ({ country, count }));

    const conflictZones: KiwisdrData["conflictZones"] = {};
    for (const [key, box] of Object.entries(REGIONS_OF_INTEREST)) {
      const rxInRegion = onlineRx.filter((rx) => rx.latitude >= box.lamin && rx.latitude <= box.lamax && rx.longitude >= box.lomin && rx.longitude <= box.lomax);
      conflictZones[key] = { region: box.label, count: rxInRegion.length, receivers: rxInRegion.slice(0, 10) };
    }

    const totalUsers = onlineRx.reduce((s, r) => s + r.users, 0);
    const totalCapacity = onlineRx.reduce((s, r) => s + r.usersMax, 0);
    const utilPct = totalCapacity > 0 ? (totalUsers / totalCapacity) * 100 : 0;
    const signals: string[] = [];
    if (totalUsers > onlineRx.length * 0.5) signals.push(`HIGH LISTENER ACTIVITY: ${totalUsers} users across ${onlineRx.length} receivers (${utilPct.toFixed(1)}%)`);

    return {
      source: "KiwiSDR",
      timestamp: new Date().toISOString(),
      status: "active",
      network: { totalReceivers: allRx.length, online: onlineRx.length, offline: allRx.length - onlineRx.length, totalUsers, totalCapacity, utilizationPct: parseFloat(utilPct.toFixed(1)), tdoaCapable: onlineRx.filter((r) => r.tdoa).length },
      geographic: { byContinent, topCountries },
      conflictZones,
      topActive: onlineRx.filter((r) => r.users > 0).sort((a, b) => b.users - a.users).slice(0, 15),
      onlineReceivers: onlineRx,
      signals,
    };
  } catch (e: any) {
    return { source: "KiwiSDR", timestamp: new Date().toISOString(), status: "error", network: { totalReceivers: 0, online: 0, offline: 0, totalUsers: 0, totalCapacity: 0, utilizationPct: 0, tdoaCapable: 0 }, geographic: { byContinent: {}, topCountries: [] }, conflictZones: {}, topActive: [], onlineReceivers: [], signals: [], message: e.message };
  }
}
