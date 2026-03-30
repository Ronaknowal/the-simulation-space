import { NextResponse } from "next/server";

const SUBREDDITS = ["worldnews", "geopolitics", "economics", "wallstreetbets", "commodities"];

async function getHot(subreddit: string, limit = 10) {
  const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`, {
    headers: { "User-Agent": "TheSimulationSpace/1.0 intelligence-engine" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  try {
    const subredditResults: Record<string, any[]> = {};

    for (let i = 0; i < SUBREDDITS.length; i++) {
      // Unauthenticated requests are throttled more aggressively — space 2s apart
      if (i > 0) await new Promise((r) => setTimeout(r, 2_000));
      const sub = SUBREDDITS[i];
      const result = await getHot(sub, 10);
      const children = result?.data?.children || [];
      subredditResults[sub] = children
        .map((child: any) => ({
          title: child.data?.title,
          score: child.data?.score ?? 0,
          comments: child.data?.num_comments ?? 0,
          url: child.data?.url,
          created: child.data?.created_utc ? new Date(child.data.created_utc * 1000).toISOString() : null,
          subreddit: sub,
        }))
        .filter((p: any) => p.title);
    }

    return NextResponse.json({ source: "Reddit", timestamp: new Date().toISOString(), status: "ok", subreddits: subredditResults });
  } catch (e: any) {
    return NextResponse.json({ source: "Reddit", timestamp: new Date().toISOString(), status: "error", subreddits: {}, error: e.message }, { status: 502 });
  }
}
