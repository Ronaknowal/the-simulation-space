// Telegram — Public channel intelligence via proxy (web preview scraping)
// No auth required for public channel preview at t.me/s/{channel}

import { proxyFetch } from "@/lib/proxy-fetch";

export interface TelegramPost {
  postId: string;
  text: string;
  date: string | null;
  views: number;
  hasMedia: boolean;
  channel: string;
  urgentFlags: string[] | null;
  score: number;
}

export interface TelegramChannelSummary {
  channel: string;
  title: string;
  topic: string;
  postCount: number;
  reachable: boolean;
}

export interface TelegramData {
  source: "Telegram";
  timestamp: string;
  status: string;
  channelsMonitored: number;
  channelsReachable: number;
  totalPosts: number;
  urgentPosts: TelegramPost[];
  topPosts: TelegramPost[];
  byTopic: Record<string, { totalPosts: number; urgentCount: number; topPosts: TelegramPost[] }>;
  channels: TelegramChannelSummary[];
  error?: string;
}

const CHANNELS = [
  { id: "CIG_telegram", label: "Conflict Intel Team", topic: "osint" },
  { id: "DeepStateUA", label: "DeepState Ukraine", topic: "conflict" },
  { id: "middleeastosint", label: "Middle East OSINT", topic: "osint" },
  { id: "unusual_whales", label: "Unusual Whales", topic: "finance" },
  { id: "WallStreetSilver", label: "Wall St Silver", topic: "finance" },
];

const URGENT_KEYWORDS = [
  "breaking", "urgent", "alert", "confirmed", "flash",
  "missile", "strike", "explosion", "airstrike", "drone",
  "nuclear", "ceasefire", "escalation", "invasion",
  "coup", "assassination", "sanctions",
  "casualties", "killed",
  "default", "bank run", "flash crash",
];

function parseWebPreview(html: string, channelId: string): TelegramPost[] {
  if (!html) return [];
  const messages: TelegramPost[] = [];
  const postRegex = /data-post="([^"]+)"([\s\S]*?)(?=data-post="|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = postRegex.exec(html)) !== null && messages.length < 20) {
    const postId = match[1];
    const block = match[2];

    const textMatch = block.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let text = "";
    if (textMatch) {
      text = textMatch[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
        .trim().slice(0, 300);
    }

    const viewsMatch = block.match(/class="tgme_widget_message_views"[^>]*>([\s\S]*?)<\/span>/i);
    let views = 0;
    if (viewsMatch) {
      const raw = viewsMatch[1].trim();
      if (raw.endsWith("K")) views = parseFloat(raw) * 1000;
      else if (raw.endsWith("M")) views = parseFloat(raw) * 1_000_000;
      else views = parseInt(raw, 10) || 0;
    }

    const timeMatch = block.match(/datetime="([^"]+)"/i);
    const date = timeMatch ? timeMatch[1] : null;
    const hasMedia = /tgme_widget_message_photo|tgme_widget_message_video/i.test(block);

    if (text || hasMedia) {
      const lower = text.toLowerCase();
      const urgentFlags = URGENT_KEYWORDS.filter((k) => lower.includes(k));
      const score = Math.min(views / 1000, 50) + (urgentFlags.length > 0 ? urgentFlags.length * 10 : 0) + (text.length > 100 ? 5 : 0) + (hasMedia ? 3 : 0);
      messages.push({ postId, text, date, views, hasMedia, channel: channelId, urgentFlags: urgentFlags.length > 0 ? urgentFlags : null, score });
    }
  }
  return messages;
}

export async function fetchTelegramData(): Promise<TelegramData> {
  const results: Array<{ channel: string; title: string; topic: string; posts: TelegramPost[] }> = [];

  for (let i = 0; i < CHANNELS.length; i += 2) {
    const batch = CHANNELS.slice(i, i + 2);
    const batchResults = await Promise.all(
      batch.map(async (ch) => {
        try {
          const res = await proxyFetch(`https://t.me/s/${ch.id}`);
          if (!res.ok) return { channel: ch.id, title: ch.label, topic: ch.topic, posts: [] };
          const html = await res.text();
          const titleMatch = html.match(/class="tgme_channel_info_header_title[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
            || html.match(/<title>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : ch.label;
          return { channel: ch.id, title, topic: ch.topic, posts: parseWebPreview(html, ch.id) };
        } catch {
          return { channel: ch.id, title: ch.label, topic: ch.topic, posts: [] };
        }
      })
    );
    results.push(...batchResults);
  }

  const allPosts = results.flatMap((r) => r.posts).sort((a, b) => b.score - a.score);
  const urgentPosts = allPosts.filter((p) => p.urgentFlags).slice(0, 10);
  const byTopic: TelegramData["byTopic"] = {};
  for (const r of results) {
    if (!byTopic[r.topic]) byTopic[r.topic] = { totalPosts: 0, urgentCount: 0, topPosts: [] };
    byTopic[r.topic].totalPosts += r.posts.length;
    byTopic[r.topic].urgentCount += r.posts.filter((p) => p.urgentFlags).length;
    byTopic[r.topic].topPosts.push(...r.posts.sort((a, b) => b.score - a.score).slice(0, 5));
  }

  return {
    source: "Telegram",
    timestamp: new Date().toISOString(),
    status: "web_scrape",
    channelsMonitored: CHANNELS.length,
    channelsReachable: results.filter((r) => r.posts.length >= 0).length,
    totalPosts: allPosts.length,
    urgentPosts,
    topPosts: allPosts.slice(0, 15),
    byTopic,
    channels: results.map((r) => ({
      channel: r.channel,
      title: r.title,
      topic: r.topic,
      postCount: r.posts.length,
      reachable: r.posts.length >= 0,
    })),
  };
}
