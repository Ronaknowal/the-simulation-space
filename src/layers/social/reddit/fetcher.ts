// Reddit — Social sentiment (via public JSON endpoints, no auth required)

export interface RedditPost {
  title: string;
  score: number;
  comments: number;
  url: string;
  created: string | null;
  subreddit: string;
}

export interface RedditData {
  source: "Reddit";
  timestamp: string;
  status: "ok" | "error";
  subreddits: Record<string, RedditPost[]>;
  message?: string;
  error?: string;
}

export async function fetchRedditData(): Promise<RedditData> {
  const res = await fetch("/api/data/reddit");
  if (!res.ok) throw new Error(`Reddit API route error: ${res.status}`);
  return res.json();
}
