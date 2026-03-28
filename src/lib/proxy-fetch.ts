/**
 * Fetch wrapper that routes requests through /api/proxy for CORS-blocked APIs.
 * Automatically detects if the target host needs proxying.
 */

const PROXY_HOSTS = new Set([
  // Existing
  "opendata.adsb.fi",
  "map.blitzortung.org",
  "api.gdeltproject.org",
  "volcano.si.edu",
  "bitnodes.io",
  "bwt.cbp.gov",
  // Markets & Economic
  "query1.finance.yahoo.com",
  "www.newyorkfed.org",
  // Health
  "www.who.int",
  "ghoapi.azureedge.net",
  // Social
  "t.me",
  // Signals
  "www.receiverbook.de",
  "search.patentsview.org",
  // News
  "feeds.bbci.co.uk",
  "www.aljazeera.com",
  "rsshub.app",
  "rss.dw.com",
]);

export function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    const parsed = new URL(url);
    if (PROXY_HOSTS.has(parsed.hostname)) {
      return fetch(`/api/proxy?url=${encodeURIComponent(url)}`, init);
    }
  } catch {
    // invalid URL — let it fall through to direct fetch
  }
  return fetch(url, init);
}
