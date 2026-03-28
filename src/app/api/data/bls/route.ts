import { NextResponse } from "next/server";

// BLS v1 is free but has very low daily limits without a registration key.
// BLS v2 allows higher limits when BLS_API_KEY env var is set.
const V1_BASE = "https://api.bls.gov/publicAPI/v1/timeseries/data/";
const V2_BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

// BLS data updates monthly — cache for 1 hour to avoid hitting daily limits.
const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: any; ts: number } | null = null;

const SERIES: Record<string, string> = {
  "CUUR0000SA0":    "CPI-U All Items",
  "CUUR0000SA0L1E": "CPI-U Core (ex Food & Energy)",
  "LNS14000000":    "Unemployment Rate",
  "CES0000000001":  "Nonfarm Payrolls (thousands)",
  "WPUFD49104":     "PPI Final Demand",
};

function latestFromSeries(seriesData: any) {
  if (!seriesData?.data?.length) return null;
  const valid = seriesData.data.filter((d: any) => d.value !== "-" && d.value !== ".");
  if (!valid.length) return null;
  return [...valid].sort((a: any, b: any) => {
    const ya = parseInt(a.year), yb = parseInt(b.year);
    if (ya !== yb) return yb - ya;
    return b.period.localeCompare(a.period);
  })[0];
}

function momChange(seriesData: any) {
  if (!seriesData?.data?.length) return null;
  const sorted = [...seriesData.data]
    .filter((d: any) => d.period.startsWith("M") && d.period !== "M13" && d.value !== "-" && d.value !== ".")
    .sort((a: any, b: any) => {
      const ya = parseInt(a.year), yb = parseInt(b.year);
      if (ya !== yb) return yb - ya;
      return b.period.localeCompare(a.period);
    });
  if (sorted.length < 2) return null;
  const curr = parseFloat(sorted[0].value), prev = parseFloat(sorted[1].value);
  if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
  return { change: +(curr - prev).toFixed(4), changePct: +(((curr - prev) / prev) * 100).toFixed(4) };
}

export async function GET() {
  // Return cached data if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const apiKey = process.env.BLS_API_KEY;
    const base = apiKey ? V2_BASE : V1_BASE;
    const now = new Date();

    const payload: Record<string, any> = {
      seriesid: Object.keys(SERIES),
      startyear: String(now.getFullYear() - 1),
      endyear: String(now.getFullYear()),
    };
    if (apiKey) payload.registrationkey = apiKey;

    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const resp = await res.json();

    if (resp.status !== "REQUEST_SUCCEEDED" || !resp.Results?.series?.length) {
      const msg = resp.message?.[0] || "BLS API returned no data";
      // On rate-limit, return stale cached data rather than an error
      if (cache) return NextResponse.json(cache.data);
      return NextResponse.json({
        source: "BLS",
        timestamp: new Date().toISOString(),
        indicators: [],
        signals: [],
        error: msg,
      });
    }

    const indicators = [];
    const signals: string[] = [];

    for (const s of resp.Results.series) {
      const id = s.seriesID;
      const label = SERIES[id] || id;
      const latest = latestFromSeries(s);
      const mom = momChange(s);
      if (!latest) {
        indicators.push({ id, label, value: null, date: null, period: null, momChange: null, momChangePct: null });
        continue;
      }
      const value = parseFloat(latest.value);
      const period = `${latest.year}-${latest.period}`;
      indicators.push({
        id,
        label,
        value,
        period,
        date: latest.year + "-" + latest.period.replace("M", "").padStart(2, "0"),
        momChange: mom?.change ?? null,
        momChangePct: mom?.changePct ?? null,
      });

      if (id === "LNS14000000" && value > 5.0) signals.push(`Unemployment elevated at ${value}%`);
      if (id === "CUUR0000SA0" && mom && mom.changePct > 0.4) signals.push(`CPI-U MoM jump: ${mom.changePct}% (${period})`);
      if (id === "CES0000000001" && mom && mom.change < -50) signals.push(`Nonfarm payrolls dropped by ${Math.abs(mom.change)}K`);
    }

    const result = { source: "BLS", timestamp: new Date().toISOString(), indicators, signals };
    cache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (e: any) {
    // On network error, return stale cache rather than failing entirely
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json(
      { source: "BLS", timestamp: new Date().toISOString(), indicators: [], signals: [], error: e.message },
      { status: 502 }
    );
  }
}
