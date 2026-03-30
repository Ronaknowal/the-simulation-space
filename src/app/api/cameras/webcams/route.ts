import { NextResponse } from "next/server";

/**
 * Windy Webcam API v3 proxy.
 *
 * Proxies requests to the Windy Webcams API, adding the API key server-side
 * so it is never exposed to the browser.
 *
 * The Windy v3 API has a response size limit — requesting 200 webcams with
 * all include fields returns 400. We paginate in batches of 50 and merge.
 *
 * Requires WINDY_WEBCAM_API_KEY environment variable.
 *
 * GET /api/cameras/webcams
 * Response: { webcams: Webcam[] }
 */

const WINDY_API_BASE = "https://api.windy.com/webcams/api/v3/webcams";
const PAGE_SIZE = 50;
const PAGES = 4; // 4 × 50 = 200 webcams total

// Revalidate every 10 minutes
export const revalidate = 600;

export async function GET() {
  const apiKey = process.env.WINDY_WEBCAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "WINDY_WEBCAM_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const allWebcams: any[] = [];

    // Fetch pages in parallel
    const pagePromises = Array.from({ length: PAGES }, (_, i) => {
      const params = new URLSearchParams({
        lang: "en",
        limit: String(PAGE_SIZE),
        offset: String(i * PAGE_SIZE),
        include: "location,images,player",
      });
      const url = `${WINDY_API_BASE}?${params.toString()}`;

      return fetch(url, {
        headers: {
          "x-windy-api-key": apiKey,
          "User-Agent": "TheSimulationSpace/1.0",
        },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      })
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return data.webcams || [];
        })
        .catch(() => []);
    });

    const pages = await Promise.all(pagePromises);
    for (const page of pages) {
      allWebcams.push(...page);
    }

    console.log(`[Webcam Proxy] Fetched ${allWebcams.length} webcams from Windy API`);

    return NextResponse.json(
      { webcams: allWebcams },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webcam Proxy] Error:", message);
    return NextResponse.json(
      { error: `Webcam fetch failed: ${message}` },
      { status: 502 }
    );
  }
}
