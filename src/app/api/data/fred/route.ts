import { NextResponse } from "next/server";

const BASE = "https://api.stlouisfed.org/fred";

const KEY_SERIES: Record<string, string> = {
  DFF: "Fed Funds Rate",
  DGS2: "2-Year Treasury Yield",
  DGS10: "10-Year Treasury Yield",
  T10Y2Y: "10Y-2Y Spread (Yield Curve)",
  T10Y3M: "10Y-3M Spread",
  CPIAUCSL: "CPI All Items",
  CPILFESL: "Core CPI",
  UNRATE: "Unemployment Rate",
  PAYEMS: "Nonfarm Payrolls",
  VIXCLS: "VIX",
  BAMLH0A0HYM2: "High Yield Spread",
  DCOILWTICO: "WTI Crude Oil",
  GOLDAMGBD228NLBM: "Gold Price",
  DTWEXBGS: "USD Trade Weighted Index",
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0];
}

async function getSeriesLatest(seriesId: string, apiKey: string) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "5",
    observation_start: daysAgo(90),
  });
  const res = await fetch(`${BASE}/series/observations?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      source: "FRED",
      timestamp: new Date().toISOString(),
      indicators: [],
      signals: [],
      error: "No FRED_API_KEY configured. Set it in your .env.local file. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html",
    });
  }

  try {
    const entries = Object.entries(KEY_SERIES);
    const results = await Promise.all(
      entries.map(async ([id, label]) => {
        const data = await getSeriesLatest(id, apiKey);
        const obs = data?.observations;
        if (!obs?.length) return { id, label, value: null, date: null, recent: [] };
        const latest = obs.find((o: any) => o.value !== ".");
        const validObs = obs.filter((o: any) => o.value !== ".");
        return {
          id,
          label,
          value: latest ? parseFloat(latest.value) : null,
          date: latest?.date || null,
          recent: validObs.slice(0, 5).map((o: any) => parseFloat(o.value)),
        };
      })
    );

    const get = (id: string) => results.find((r) => r.id === id)?.value ?? null;
    const yc10y2y = get("T10Y2Y");
    const yc10y3m = get("T10Y3M");
    const vix = get("VIXCLS");
    const hySpread = get("BAMLH0A0HYM2");
    const signals: string[] = [];

    if (yc10y2y !== null && yc10y2y < 0) signals.push(`YIELD CURVE INVERTED (10Y-2Y at ${yc10y2y.toFixed(2)}) — recession signal`);
    if (yc10y3m !== null && yc10y3m < 0) signals.push(`YIELD CURVE INVERTED (10Y-3M at ${yc10y3m.toFixed(2)}) — stronger recession signal`);
    if (vix !== null && vix > 40) signals.push(`VIX EXTREME at ${vix} — crisis-level fear`);
    else if (vix !== null && vix > 30) signals.push(`VIX ELEVATED at ${vix} — high fear/volatility`);
    if (hySpread !== null && hySpread > 5) signals.push(`HIGH YIELD SPREAD WIDE at ${hySpread.toFixed(2)}% — credit stress`);

    return NextResponse.json({
      source: "FRED",
      timestamp: new Date().toISOString(),
      indicators: results.filter((r) => r.value !== null),
      signals,
    });
  } catch (e: any) {
    return NextResponse.json({ source: "FRED", timestamp: new Date().toISOString(), indicators: [], signals: [], error: e.message }, { status: 502 });
  }
}
