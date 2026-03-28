// WHO — Disease Outbreak News
// Primary: RSS feed (https://www.who.int/feeds/entity/don/en/rss.xml)
// Fallback: OData API (may return 400 with certain param encodings)
// No auth required.

import { proxyFetch } from "@/lib/proxy-fetch";

const DON_RSS = "https://www.who.int/feeds/entity/don/en/rss.xml";
const DON_API = "https://www.who.int/api/news/diseaseoutbreaknews?$top=50&$orderby=InitialPublicationDate%20desc";

export interface WhoOutbreak {
  title: string;
  date: string;
  donId: string | null;
  url: string | null;
  summary: string | null;
}

export interface WhoAlertsData {
  source: "WHO";
  timestamp: string;
  diseaseOutbreakNews: WhoOutbreak[];
  outbreakError: string | null;
}

async function fetchFromRss(): Promise<WhoOutbreak[]> {
  const res = await proxyFetch(DON_RSS);
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();

  const items: WhoOutbreak[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
    const block = match[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

    const title = titleMatch ? titleMatch[1].trim() : null;
    const link = linkMatch ? linkMatch[1].trim() : null;
    if (!title || !link) continue;

    items.push({
      title,
      date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
      donId: null,
      url: link,
      summary: descMatch ? descMatch[1].replace(/<[^>]*>/g, "").trim().slice(0, 300) : null,
    });
  }

  if (items.length === 0) throw new Error("RSS returned no items");
  return items;
}

async function fetchFromApi(): Promise<WhoOutbreak[]> {
  const res = await proxyFetch(DON_API);
  if (!res.ok) throw new Error(`OData HTTP ${res.status}`);
  const data = await res.json();
  const items = (data?.value || []) as any[];

  const getDate = (item: any) => item.PublicationDate || item.InitialPublicationDate;
  items.sort((a: any, b: any) => new Date(getDate(b) || 0).getTime() - new Date(getDate(a) || 0).getTime());
  const cutoff = new Date(Date.now() - 30 * 86_400_000);
  const recent = items.filter((item: any) => new Date(getDate(item) || 0) >= cutoff);

  return recent.slice(0, 15).map((item: any) => ({
    title: item.Title,
    date: getDate(item),
    donId: item.DonId || null,
    url: item.ItemDefaultUrl ? `https://www.who.int${item.ItemDefaultUrl}` : null,
    summary: (item.Summary || item.Overview || "").replace(/<[^>]*>/g, "").slice(0, 300) || null,
  }));
}

export async function fetchWhoAlerts(): Promise<WhoAlertsData> {
  // Try RSS first — simpler, no OData param encoding issues
  try {
    const outbreaks = await fetchFromRss();
    return { source: "WHO", timestamp: new Date().toISOString(), diseaseOutbreakNews: outbreaks, outbreakError: null };
  } catch {
    // RSS failed — fall back to OData API
    try {
      const outbreaks = await fetchFromApi();
      return { source: "WHO", timestamp: new Date().toISOString(), diseaseOutbreakNews: outbreaks, outbreakError: null };
    } catch (e: any) {
      return { source: "WHO", timestamp: new Date().toISOString(), diseaseOutbreakNews: [], outbreakError: e.message };
    }
  }
}
