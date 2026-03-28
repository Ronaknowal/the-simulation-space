// RSS Feed Aggregation — Multiple international news sources via proxy

import { proxyFetch } from "@/lib/proxy-fetch";

export interface RssItem {
  title: string;
  link: string;
  pubDate: string | null;
  source: string;
  sourceKey: string;
}

export interface RssFeedsData {
  source: "RSS Feeds";
  timestamp: string;
  items: RssItem[];
  sourceSummary: Record<string, { ok: boolean; count: number }>;
  error?: string;
}

const RSS_SOURCES: Array<{ key: string; name: string; url: string }> = [
  { key: "bbc", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { key: "alj", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { key: "ap", name: "AP News", url: "https://feeds.apnews.com/rss/apf-topnews" },
  { key: "dw", name: "DW News", url: "https://rss.dw.com/rdf/rss-en-world" },
];

function parseRssXml(xml: string, sourceName: string, sourceKey: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) || block.match(/<link\s[^>]*href="([^"]+)"/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = titleMatch ? titleMatch[1].trim() : null;
    const link = linkMatch ? linkMatch[1].trim() : null;
    if (!title || !link) continue;

    items.push({ title, link, pubDate: dateMatch ? dateMatch[1].trim() : null, source: sourceName, sourceKey });
  }
  return items;
}

export async function fetchRssFeeds(): Promise<RssFeedsData> {
  const sourceSummary: Record<string, { ok: boolean; count: number }> = {};
  const allItems: RssItem[] = [];

  await Promise.allSettled(
    RSS_SOURCES.map(async ({ key, name, url }) => {
      try {
        const res = await proxyFetch(url);
        if (!res.ok) {
          sourceSummary[key] = { ok: false, count: 0 };
          return;
        }
        const xml = await res.text();
        const items = parseRssXml(xml, name, key);
        allItems.push(...items);
        sourceSummary[key] = { ok: true, count: items.length };
      } catch {
        sourceSummary[key] = { ok: false, count: 0 };
      }
    })
  );

  // Sort by pubDate descending
  allItems.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  return {
    source: "RSS Feeds",
    timestamp: new Date().toISOString(),
    items: allItems.slice(0, 50),
    sourceSummary,
  };
}
