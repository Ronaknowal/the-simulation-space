import { NextResponse } from "next/server";

const BASE = "https://api.eia.gov/v2";

async function fetchSeries(apiKey: string, path: string, facets: Record<string, string[]>, frequency = "daily") {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", frequency);
  url.searchParams.set("data[0]", "value");
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("length", "10");
  for (const [key, values] of Object.entries(facets)) {
    values.forEach((v) => url.searchParams.append(`facets[${key}][]`, v));
  }
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  return res.json();
}

function extractLatest(resp: any) {
  const data = resp?.response?.data;
  if (!data?.length) return null;
  return { value: parseFloat(data[0].value), period: data[0].period };
}

function extractRecent(resp: any, count = 5) {
  const data = resp?.response?.data;
  if (!data?.length) return [];
  return data.slice(0, count).map((d: any) => ({ value: parseFloat(d.value), period: d.period }));
}

export async function GET() {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      source: "EIA",
      timestamp: new Date().toISOString(),
      oilPrices: { wti: null, brent: null, spread: null },
      gasPrice: null,
      inventories: { crudeStocks: null },
      signals: [],
      error: "No EIA_API_KEY configured. Get a free key at https://www.eia.gov/opendata/register.php",
    });
  }

  try {
    const [wtiResp, brentResp, gasResp, invResp] = await Promise.all([
      fetchSeries(apiKey, "/petroleum/pri/spt/data/", { series: ["RWTC"] }),
      fetchSeries(apiKey, "/petroleum/pri/spt/data/", { series: ["RBRTE"] }),
      fetchSeries(apiKey, "/natural-gas/pri/fut/data/", { series: ["RNGWHHD"] }),
      fetchSeries(apiKey, "/petroleum/stoc/wstk/data/", { series: ["WCESTUS1"] }, "weekly"),
    ]);

    const wti = extractLatest(wtiResp);
    const brent = extractLatest(brentResp);
    const gas = extractLatest(gasResp);
    const inv = extractLatest(invResp);
    const wtiRecent = extractRecent(wtiResp);
    const invRecent = extractRecent(invResp);
    const signals: string[] = [];

    if (wti && wti.value > 100) signals.push(`WTI crude above $100 at $${wti.value.toFixed(2)}/bbl`);
    if (wti && wti.value < 50) signals.push(`WTI crude below $50 at $${wti.value.toFixed(2)}/bbl`);
    if (gas && gas.value > 6) signals.push(`Natural gas elevated at $${gas.value.toFixed(2)}/MMBtu`);
    if (invRecent.length >= 2) {
      const wkChg = invRecent[0].value - invRecent[1].value;
      if (Math.abs(wkChg) > 5000) signals.push(`Large crude inventory ${wkChg > 0 ? "build" : "draw"}: ${wkChg > 0 ? "+" : ""}${(wkChg / 1000).toFixed(1)}M barrels`);
    }

    return NextResponse.json({
      source: "EIA",
      timestamp: new Date().toISOString(),
      oilPrices: {
        wti: wti ? { ...wti, label: "WTI Crude Oil ($/bbl)", recent: wtiRecent } : null,
        brent: brent ? { ...brent, label: "Brent Crude Oil ($/bbl)" } : null,
        spread: wti && brent ? parseFloat((brent.value - wti.value).toFixed(2)) : null,
      },
      gasPrice: gas ? { ...gas, label: "Henry Hub Natural Gas ($/MMBtu)" } : null,
      inventories: { crudeStocks: inv ? { ...inv, label: "US Crude Inventories (thousand bbl)", recent: invRecent } : null },
      signals,
    });
  } catch (e: any) {
    return NextResponse.json({ source: "EIA", timestamp: new Date().toISOString(), oilPrices: { wti: null, brent: null, spread: null }, gasPrice: null, inventories: { crudeStocks: null }, signals: [], error: e.message }, { status: 502 });
  }
}
