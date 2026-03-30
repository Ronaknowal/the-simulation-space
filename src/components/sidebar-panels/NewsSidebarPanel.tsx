"use client";

import { useMemo } from "react";
import { useStore } from "@/store";
import { ExternalLink } from "lucide-react";

function timeAgo(date: string | number): string {
  const ts = typeof date === "string" ? new Date(date).getTime() : date;
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NewsSidebarPanel() {
  const rssData = useStore((s) => s.layers["news.rss-feeds"]?.data);
  const isLoading = useStore((s) => s.layers["news.rss-feeds"]?.loading);

  const items = useMemo(() => {
    if (!rssData?.items || !Array.isArray(rssData.items)) return [];
    return rssData.items.slice(0, 30);
  }, [rssData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-text-disabled text-[9px] uppercase tracking-widest animate-pulse">
        Fetching news feeds...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-text-disabled text-[9px] uppercase tracking-widest">
        No news items
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item: any, idx: number) => (
        <div
          key={item.link || idx}
          className="px-3 py-1.5 border-b border-border-subtle hover:bg-surface transition-colors"
        >
          <div className="flex items-start gap-2">
            <span className="text-[7px] text-accent uppercase tracking-widest shrink-0 w-8 mt-0.5">
              {item.source || "RSS"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-text-primary leading-snug">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.pubDate && (
                  <span className="text-[7px] text-text-disabled">
                    {timeAgo(item.pubDate)}
                  </span>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[7px] text-accent hover:text-accent/70 flex items-center gap-0.5"
                  >
                    <ExternalLink size={7} /> Open
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
