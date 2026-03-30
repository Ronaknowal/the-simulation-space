import { NextRequest, NextResponse } from "next/server";

/**
 * CORS proxy for external APIs that don't support browser CORS.
 * Allowlisted domains only — prevents abuse as an open proxy.
 *
 * Usage: /api/proxy?url=<encoded-url>
 */

const ALLOWED_HOSTS = new Set([
  // Existing
  "opendata.adsb.fi",
  "map.blitzortung.org",
  "api.gdeltproject.org",
  "volcano.si.edu",
  "bitnodes.io",
  "bwt.cbp.gov",
  // Markets & Economic
  "query1.finance.yahoo.com",   // Yahoo Finance live quotes
  "www.newyorkfed.org",         // GSCPI supply chain pressure index
  // Health
  "www.who.int",                // WHO disease outbreak news
  "ghoapi.azureedge.net",       // WHO GHO indicators
  // Social
  "t.me",                       // Telegram public channel web preview
  // Signals
  "www.receiverbook.de",        // KiwiSDR receiver network
  "search.patentsview.org",     // USPTO PatentsView (new, requires API key)
  "api.patentsview.org",        // USPTO PatentsView legacy free API
  // Supply chain research (server-to-server, but allowlisted for future use)
  "efts.sec.gov",               // SEC EDGAR full-text search (10-K filings)
  // News
  "feeds.bbci.co.uk",           // BBC News RSS
  "www.aljazeera.com",          // Al Jazeera RSS
  "feeds.apnews.com",           // AP News official RSS
  "rss.dw.com",                 // DW News RSS
]);

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing ?url= parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json(
      { error: `Host not allowed: ${parsed.hostname}` },
      { status: 403 }
    );
  }

  try {
    // Bitnodes snapshot can be 10-30MB — allow longer timeout
    const timeout = parsed.hostname === "bitnodes.io" ? 30_000 : 15_000;
    const upstream = await fetch(rawUrl, {
      headers: { "User-Agent": "TheSimulationSpace/1.0" },
      signal: AbortSignal.timeout(timeout),
    });

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Upstream fetch failed: ${err.message}` },
      { status: 502 }
    );
  }
}
