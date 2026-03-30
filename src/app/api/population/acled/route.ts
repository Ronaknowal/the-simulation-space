import { NextResponse } from "next/server";

/**
 * ACLED (Armed Conflict Location & Event Data) proxy.
 *
 * Proxies requests to the ACLED API v3, adding authentication credentials
 * server-side so they are never exposed to the browser.
 *
 * Requires ACLED_API_KEY and ACLED_EMAIL environment variables.
 *
 * GET /api/population/acled
 * Response: { success: true, data: ConflictEvent[] }
 */

const ACLED_API_BASE = "https://api.acleddata.com/acled/read";

// Fields to request from the ACLED API
const ACLED_FIELDS = [
  "event_id_cnty",
  "event_date",
  "event_type",
  "sub_event_type",
  "actor1",
  "country",
  "latitude",
  "longitude",
  "fatalities",
  "notes",
].join("|");

// Revalidate every hour
export const revalidate = 3600;

export async function GET() {
  const apiKey = process.env.ACLED_API_KEY;
  const email = process.env.ACLED_EMAIL;

  if (!apiKey || !email) {
    return NextResponse.json(
      { error: "ACLED_API_KEY and ACLED_EMAIL must be configured" },
      { status: 503 }
    );
  }

  // Build date range: last ~2 years up to today
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dateRange = `2024-01-01|${today}`;

  const params = new URLSearchParams({
    key: apiKey,
    email: email,
    limit: "2000",
    event_date: dateRange,
    event_date_where: "BETWEEN",
    fields: ACLED_FIELDS,
  });

  const url = `${ACLED_API_BASE}?${params.toString()}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "TheSimulationSpace/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000), // ACLED can be slow
      next: { revalidate: 3600 }, // Next.js fetch-level cache: 1 hour
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      console.error(
        `[ACLED Proxy] API returned ${upstream.status}: ${body.slice(0, 200)}`
      );
      return NextResponse.json(
        { error: `ACLED API error: ${upstream.status}` },
        { status: upstream.status >= 500 ? 502 : upstream.status }
      );
    }

    const json = await upstream.json();

    // ACLED returns { success: true, data: [...] }
    // Validate shape before forwarding
    if (!json.data || !Array.isArray(json.data)) {
      console.error("[ACLED Proxy] Unexpected response shape:", Object.keys(json));
      return NextResponse.json(
        { error: "Unexpected ACLED response format" },
        { status: 502 }
      );
    }

    // Pass through the full response — fetcher expects { data: [...] }
    return NextResponse.json(
      { success: true, data: json.data },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ACLED Proxy] Error:", message);
    return NextResponse.json(
      { error: `ACLED fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
