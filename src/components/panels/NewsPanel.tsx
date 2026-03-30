"use client";

import { useMemo } from "react";
import PanelContainer from "@/components/panels/PanelContainer";
import { useStore } from "@/store";

interface NewsItem {
  id: string;
  source: string;
  headline: string;
  sentiment: "negative" | "neutral" | "positive" | "warning";
  timestamp?: number;
}

const sentimentLabel: Record<NewsItem["sentiment"], string> = {
  negative: "NEG",
  neutral: "NEU",
  positive: "POS",
  warning: "MIX",
};

const sentimentClass: Record<NewsItem["sentiment"], string> = {
  negative: "text-negative",
  neutral: "text-text-disabled",
  positive: "text-positive",
  warning: "text-warning",
};

function guessSentiment(text: string): NewsItem["sentiment"] {
  const lower = text.toLowerCase();
  const negWords = ["war", "crash", "tension", "attack", "crisis", "decline", "sanctions", "missile", "conflict", "killed"];
  const posWords = ["growth", "surge", "rally", "peace", "agreement", "breakthrough", "recover", "gain"];
  const negCount = negWords.filter((w) => lower.includes(w)).length;
  const posCount = posWords.filter((w) => lower.includes(w)).length;
  if (negCount > posCount) return "negative";
  if (posCount > negCount) return "positive";
  if (negCount > 0 && posCount > 0) return "warning";
  return "neutral";
}

export function NewsPanel() {
  const rssData = useStore((s) => s.layers["news.rss-feeds"]?.data);
  const redditData = useStore((s) => s.layers["social.reddit"]?.data);
  const blueskyData = useStore((s) => s.layers["social.bluesky"]?.data);

  const newsItems = useMemo<NewsItem[]>(() => {
    const items: NewsItem[] = [];

    // RSS feeds
    if (rssData?.items && Array.isArray(rssData.items)) {
      for (const item of rssData.items.slice(0, 10)) {
        items.push({
          id: `rss-${item.link || item.title}`,
          source: item.source || "RSS",
          headline: item.title || "",
          sentiment: guessSentiment(item.title || ""),
          timestamp: item.pubDate ? new Date(item.pubDate).getTime() : undefined,
        });
      }
    }

    // Reddit
    if (redditData) {
      const subs = redditData.subreddits || redditData;
      if (typeof subs === "object") {
        for (const [sub, posts] of Object.entries(subs)) {
          if (Array.isArray(posts)) {
            for (const post of posts.slice(0, 3)) {
              items.push({
                id: `reddit-${post.url || post.title}`,
                source: `r/${sub}`,
                headline: post.title || "",
                sentiment: guessSentiment(post.title || ""),
                timestamp: post.created ? post.created * 1000 : undefined,
              });
            }
          }
        }
      }
    }

    // Bluesky
    if (blueskyData?.topics) {
      for (const [topic, posts] of Object.entries(blueskyData.topics)) {
        if (Array.isArray(posts)) {
          for (const post of posts.slice(0, 2)) {
            items.push({
              id: `bsky-${post.uri || post.text?.slice(0, 30)}`,
              source: "Bluesky",
              headline: (post.text || "").slice(0, 120),
              sentiment: guessSentiment(post.text || ""),
              timestamp: post.indexedAt ? new Date(post.indexedAt).getTime() : undefined,
            });
          }
        }
      }
    }

    // Sort by timestamp (newest first), items without timestamp go to end
    items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return items.slice(0, 8);
  }, [rssData, redditData, blueskyData]);

  const hasData = newsItems.length > 0;

  return (
    <PanelContainer id="news" title="Intel / News / Social">
      <div className="overflow-y-auto h-full">
        {hasData ? (
          newsItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 px-2 py-1 border-b border-border-subtle"
            >
              <span className="text-text-disabled text-[8px] uppercase tracking-widest shrink-0 w-10 truncate">
                {item.source}
              </span>
              <span className="text-text-secondary text-[9px] flex-1 leading-snug line-clamp-2">
                {item.headline}
              </span>
              <span className={`text-[8px] uppercase tracking-widest shrink-0 ${sentimentClass[item.sentiment]}`}>
                {sentimentLabel[item.sentiment]}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-4 text-text-disabled text-[8px] uppercase tracking-widest animate-pulse">
            Awaiting intel feeds...
          </div>
        )}
      </div>
    </PanelContainer>
  );
}

export default NewsPanel;
