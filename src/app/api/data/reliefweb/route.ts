import { NextResponse } from "next/server";

const BASE = "https://api.reliefweb.int/v1";
const HDX_BASE = "https://data.humdata.org/api/3/action";

async function rwPost(endpoint: string, body: object, appname: string) {
  const res = await fetch(`${BASE}/${endpoint}?appname=${appname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Vyom/1.0" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function hdxFallback() {
  const res = await fetch(`${HDX_BASE}/package_search?q=crisis+OR+disaster+OR+emergency&rows=15&sort=metadata_modified+desc`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title,
    date: pkg.metadata_modified,
    source: pkg.dataset_source || pkg.organization?.title,
    countries: pkg.groups?.map((g: any) => g.display_name),
    url: `https://data.humdata.org/dataset/${pkg.name}`,
  }));
}

export async function GET() {
  const appname = process.env.RELIEFWEB_APPNAME || "vyom";

  try {
    const [reports, disasters] = await Promise.all([
      rwPost("reports", { limit: 15, fields: { include: ["title", "date.created", "country.name", "disaster_type.name", "url_alias", "source.name"] }, sort: ["date.created:desc"] }, appname),
      // ReliefWeb disaster status values are "alert", "current", and "past" — not "ongoing".
      rwPost("disasters", { limit: 15, fields: { include: ["name", "date.created", "country.name", "type.name", "status"] }, filter: { field: "status", value: "current" }, sort: ["date.created:desc"] }, appname),
    ]);

    return NextResponse.json({
      source: "ReliefWeb (UN OCHA)",
      timestamp: new Date().toISOString(),
      latestReports: (reports?.data || []).map((r: any) => ({
        title: r.fields?.title,
        date: r.fields?.date?.created,
        countries: r.fields?.country?.map((c: any) => c.name),
        disasterType: r.fields?.disaster_type?.map((d: any) => d.name),
        source: r.fields?.source?.map((s: any) => s.name),
        url: r.fields?.url_alias ? `https://reliefweb.int${r.fields.url_alias}` : null,
      })),
      activeDisasters: (disasters?.data || []).map((d: any) => ({
        name: d.fields?.name,
        date: d.fields?.date?.created,
        countries: d.fields?.country?.map((c: any) => c.name),
        type: d.fields?.type?.map((t: any) => t.name),
        status: d.fields?.status,
      })),
    });
  } catch {
    // Fallback to HDX
    try {
      const hdxDatasets = await hdxFallback();
      return NextResponse.json({
        source: "HDX (Humanitarian Data Exchange) — ReliefWeb fallback",
        timestamp: new Date().toISOString(),
        latestReports: [],
        activeDisasters: [],
        rwNote: "ReliefWeb API requires an approved appname. Set RELIEFWEB_APPNAME in .env.local after registering at https://apidoc.reliefweb.int/parameters#appname",
        hdxDatasets,
      });
    } catch (e: any) {
      return NextResponse.json({ source: "ReliefWeb", timestamp: new Date().toISOString(), latestReports: [], activeDisasters: [], error: e.message }, { status: 502 });
    }
  }
}
