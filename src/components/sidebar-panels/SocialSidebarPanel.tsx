"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/store";

type SocialTab = "reddit" | "bluesky" | "telegram";

export default function SocialSidebarPanel() {
  const [activeTab, setActiveTab] = useState<SocialTab>("reddit");
  const redditData = useStore((s) => s.layers["social.reddit"]?.data);
  const blueskyData = useStore((s) => s.layers["social.bluesky"]?.data);
  const telegramData = useStore((s) => s.layers["social.telegram"]?.data);

  const tabs: { id: SocialTab; label: string }[] = [
    { id: "reddit", label: "Reddit" },
    { id: "bluesky", label: "Bluesky" },
    { id: "telegram", label: "Telegram" },
  ];

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-[8px] uppercase tracking-widest py-1.5 transition-colors ${
              activeTab === tab.id
                ? "text-accent border-b border-accent"
                : "text-text-disabled hover:text-text-tertiary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "reddit" && <RedditContent data={redditData} />}
        {activeTab === "bluesky" && <BlueskyContent data={blueskyData} />}
        {activeTab === "telegram" && <TelegramContent data={telegramData} />}
      </div>
    </div>
  );
}

function RedditContent({ data }: { data: any }) {
  const posts = useMemo(() => {
    if (!data) return [];
    const subs = data.subreddits || data;
    const all: any[] = [];
    if (typeof subs === "object") {
      for (const [sub, items] of Object.entries(subs)) {
        if (Array.isArray(items)) {
          for (const p of items) {
            all.push({ ...p, subreddit: sub });
          }
        }
      }
    }
    return all.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);
  }, [data]);

  if (posts.length === 0) {
    return <EmptyState text="Awaiting Reddit data..." />;
  }

  return (
    <>
      {posts.map((post: any, i: number) => (
        <div key={post.url || i} className="px-3 py-1.5 border-b border-border-subtle">
          <p className="text-[9px] text-text-primary leading-snug">{post.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[7px] text-accent">r/{post.subreddit}</span>
            <span className="text-[7px] text-text-disabled">↑{post.score || 0}</span>
            <span className="text-[7px] text-text-disabled">{post.num_comments || post.comments || 0} comments</span>
          </div>
        </div>
      ))}
    </>
  );
}

function BlueskyContent({ data }: { data: any }) {
  const posts = useMemo(() => {
    if (!data?.topics) return [];
    const all: any[] = [];
    for (const [topic, items] of Object.entries(data.topics)) {
      if (Array.isArray(items)) {
        for (const p of items) {
          all.push({ ...p, topic });
        }
      }
    }
    return all.slice(0, 20);
  }, [data]);

  if (posts.length === 0) {
    return <EmptyState text="Awaiting Bluesky data..." />;
  }

  return (
    <>
      {posts.map((post: any, i: number) => (
        <div key={post.uri || i} className="px-3 py-1.5 border-b border-border-subtle">
          <p className="text-[9px] text-text-primary leading-snug line-clamp-3">{post.text}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[7px] text-accent">{post.topic}</span>
            {post.author && <span className="text-[7px] text-text-disabled">@{post.author}</span>}
            {post.likeCount != null && <span className="text-[7px] text-text-disabled">♥ {post.likeCount}</span>}
          </div>
        </div>
      ))}
    </>
  );
}

function TelegramContent({ data }: { data: any }) {
  const posts = useMemo(() => {
    if (!data) return [];
    const all = [
      ...(data.urgentPosts || []),
      ...(data.topPosts || []),
    ];
    // De-duplicate by postId
    const seen = new Set<string>();
    return all.filter((p: any) => {
      const key = p.postId || p.text?.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 20);
  }, [data]);

  if (posts.length === 0) {
    return <EmptyState text="Awaiting Telegram data..." />;
  }

  return (
    <>
      {posts.map((post: any, i: number) => (
        <div key={post.postId || i} className="px-3 py-1.5 border-b border-border-subtle">
          <p className="text-[9px] text-text-primary leading-snug line-clamp-3">{post.text}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {post.channel && <span className="text-[7px] text-accent">{post.channel}</span>}
            {post.views != null && <span className="text-[7px] text-text-disabled">{post.views} views</span>}
            {post.urgent && <span className="text-[7px] text-negative font-bold">URGENT</span>}
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-text-disabled text-[9px] uppercase tracking-widest animate-pulse">
      {text}
    </div>
  );
}
