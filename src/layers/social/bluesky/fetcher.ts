// Bluesky — AT Protocol social intelligence (CORS OK, no auth required)

const BASE = "https://public.api.bsky.app/xrpc";

export interface BlueskyPost {
  text: string;
  author: string;
  date: string | null;
  likes: number;
}

export interface BlueskyData {
  source: "Bluesky";
  timestamp: string;
  topics: {
    conflict: BlueskyPost[];
    markets: BlueskyPost[];
    health: BlueskyPost[];
  };
  error?: string;
}

async function searchPosts(query: string, limit = 25): Promise<BlueskyPost[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit), sort: "latest" });
  const res = await fetch(`${BASE}/app.bsky.feed.searchPosts?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.posts || []).map((post: any) => ({
    text: (post?.record?.text || "").slice(0, 200),
    author: post?.author?.handle || post?.author?.displayName || "unknown",
    date: post?.record?.createdAt || null,
    likes: post?.likeCount ?? 0,
  }));
}

export async function fetchBlueskyData(): Promise<BlueskyData> {
  try {
    const [conflict, markets, health] = await Promise.all([
      searchPosts("Iran war OR missile strike OR sanctions"),
      searchPosts("market crash OR oil prices OR gold OR recession"),
      searchPosts("pandemic OR outbreak OR epidemic"),
    ]);
    return { source: "Bluesky", timestamp: new Date().toISOString(), topics: { conflict, markets, health } };
  } catch (e: any) {
    return { source: "Bluesky", timestamp: new Date().toISOString(), topics: { conflict: [], markets: [], health: [] }, error: e.message };
  }
}
