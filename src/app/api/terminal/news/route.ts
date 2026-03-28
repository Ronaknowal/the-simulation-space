import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment } from '@/components/terminal/utils';

const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://finance.yahoo.com',
  Referer: 'https://finance.yahoo.com/',
};

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get('symbol') || 'AAPL').toUpperCase().trim();

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&lang=en-US&region=US&quotesCount=0&newsCount=20&enableFuzzyQuery=false&enableNavLinks=false`;
    const res = await fetch(url, {
      headers: YF_HEADERS,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      return NextResponse.json({ news: [] });
    }

    const data = await res.json();
    const rawNews = data?.news || [];

    const news = rawNews.map((item: any) => ({
      uuid: item.uuid || Math.random().toString(),
      title: item.title || '',
      publisher: item.publisher || '',
      link: item.link || '#',
      providerPublishTime: item.providerPublishTime || 0,
      sentiment: analyzeSentiment(item.title || ''),
      thumbnailUrl: item.thumbnail?.resolutions?.[0]?.url,
    }));

    return NextResponse.json({ news }, { headers: { 'Cache-Control': 'public, max-age=120' } });
  } catch (err: any) {
    return NextResponse.json({ news: [], error: err.message }, { status: 200 });
  }
}
