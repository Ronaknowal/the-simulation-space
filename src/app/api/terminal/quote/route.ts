import { NextRequest, NextResponse } from 'next/server';
import { OHLCVBar, StockMeta } from '@/components/terminal/types';

const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://finance.yahoo.com',
  Referer: 'https://finance.yahoo.com/',
};

// Cached crumb/cookie for Yahoo Finance auth
let crumbCache: { crumb: string; cookie: string; expiry: number } | null = null;

async function getYFCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && Date.now() < crumbCache.expiry) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }
  try {
    const r1 = await fetch('https://fc.yahoo.com', {
      headers: YF_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    const rawCookie = r1.headers.get('set-cookie') || '';
    const cookie = rawCookie.split(';')[0];

    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...YF_HEADERS, Cookie: cookie },
      signal: AbortSignal.timeout(5000),
    });
    if (!r2.ok) return null;
    const crumb = await r2.text();
    if (!crumb || crumb.includes('<html')) return null;

    crumbCache = { crumb, cookie, expiry: Date.now() + 3_600_000 };
    return { crumb, cookie };
  } catch {
    return null;
  }
}

async function fetchYF(url: string): Promise<Response> {
  // Try without crumb first
  let res = await fetch(url, {
    headers: YF_HEADERS,
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 60 },
  });

  // If unauthorized, try with crumb
  if (res.status === 401 || res.status === 403) {
    const auth = await getYFCrumb();
    if (auth) {
      const urlWithCrumb = url.includes('?')
        ? `${url}&crumb=${encodeURIComponent(auth.crumb)}`
        : `${url}?crumb=${encodeURIComponent(auth.crumb)}`;
      res = await fetch(urlWithCrumb, {
        headers: { ...YF_HEADERS, Cookie: auth.cookie },
        signal: AbortSignal.timeout(10000),
      });
    }
  }
  return res;
}

function extractBars(data: any): OHLCVBar[] {
  const result = data?.chart?.result?.[0];
  if (!result) return [];
  const ts: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const bars: OHLCVBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.close?.[i] == null) continue;
    bars.push({
      t: ts[i] * 1000,
      o: q.open?.[i] ?? q.close[i],
      h: q.high?.[i] ?? q.close[i],
      l: q.low?.[i] ?? q.close[i],
      c: q.close[i],
      v: q.volume?.[i] ?? 0,
    });
  }
  return bars;
}

function extractMeta(data: any): StockMeta | null {
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const m = result.meta;
  return {
    symbol: m.symbol,
    shortName: m.shortName || m.symbol,
    longName: m.longName || m.shortName || m.symbol,
    currency: m.currency || 'USD',
    exchange: m.exchangeName || m.exchange || '',
    quoteType: m.instrumentType || 'EQUITY',
    regularMarketPrice: m.regularMarketPrice ?? 0,
    regularMarketChange: m.regularMarketPrice - m.chartPreviousClose,
    regularMarketChangePercent:
      ((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 100,
    regularMarketVolume: m.regularMarketVolume ?? 0,
    regularMarketOpen: m.regularMarketOpen ?? m.regularMarketPrice,
    regularMarketDayHigh: m.regularMarketDayHigh ?? m.regularMarketPrice,
    regularMarketDayLow: m.regularMarketDayLow ?? m.regularMarketPrice,
    regularMarketPreviousClose: m.chartPreviousClose ?? m.regularMarketPrice,
    fiftyTwoWeekHigh: m.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: m.fiftyTwoWeekLow ?? 0,
    marketCap: m.marketCap ?? 0,
    trailingPE: m.trailingPE ?? 0,
    forwardPE: m.forwardPE ?? 0,
    dividendYield: m.dividendYield ?? 0,
    beta: m.beta ?? 0,
    averageVolume: m.averageVolume ?? m.regularMarketVolume ?? 0,
    marketState: m.marketState || 'CLOSED',
    epsTrailingTwelveMonths: m.epsTrailingTwelveMonths,
    fiftyDayAverage: m.fiftyDayAverage,
    twoHundredDayAverage: m.twoHundredDayAverage,
    sharesOutstanding: m.sharesOutstanding,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = (sp.get('symbol') || 'AAPL').toUpperCase().trim();
  const range = sp.get('range') || '1y';
  const interval = sp.get('interval') || '1d';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false&events=div,split`;
    const res = await fetchYF(url);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance error: ${res.status}` },
        { status: res.status }
      );
    }

    const raw = await res.json();
    const bars = extractBars(raw);
    const meta = extractMeta(raw);

    if (!meta) {
      return NextResponse.json(
        { error: `Symbol not found: ${symbol}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ bars, meta }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Fetch failed' }, { status: 500 });
  }
}
