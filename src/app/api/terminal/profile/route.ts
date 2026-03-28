import { NextRequest, NextResponse } from 'next/server';

const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://finance.yahoo.com',
  Referer: 'https://finance.yahoo.com/',
};

let crumbCache: { crumb: string; cookie: string; expiry: number } | null = null;

async function getYFCrumb() {
  if (crumbCache && Date.now() < crumbCache.expiry) return crumbCache;
  try {
    const r1 = await fetch('https://fc.yahoo.com', {
      headers: YF_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(5000),
    });
    const cookie = (r1.headers.get('set-cookie') || '').split(';')[0];
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...YF_HEADERS, Cookie: cookie }, signal: AbortSignal.timeout(5000),
    });
    if (!r2.ok) return null;
    const crumb = await r2.text();
    if (!crumb || crumb.includes('<html')) return null;
    crumbCache = { crumb, cookie, expiry: Date.now() + 3_600_000 };
    return crumbCache;
  } catch { return null; }
}

async function fetchYF(url: string) {
  let res = await fetch(url, {
    headers: YF_HEADERS, signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401 || res.status === 403) {
    const auth = await getYFCrumb();
    if (auth) {
      const u = url.includes('?') ? `${url}&crumb=${encodeURIComponent(auth.crumb)}` : `${url}?crumb=${encodeURIComponent(auth.crumb)}`;
      res = await fetch(u, { headers: { ...YF_HEADERS, Cookie: auth.cookie }, signal: AbortSignal.timeout(12000) });
    }
  }
  return res;
}

function raw(obj: any): number | undefined {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj === 'object') {
    if ('raw' in obj && typeof obj.raw === 'number') return obj.raw;
    return undefined; // {} or {raw: null} etc.
  }
  if (typeof obj === 'number') return obj;
  return undefined;
}

function fmtDate(obj: any): string {
  const r = raw(obj);
  if (!r) return '';
  return new Date(r * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function parseIncomeStatements(stmts: any[]) {
  return (stmts || []).map((s: any) => ({
    date: fmtDate(s.endDate),
    totalRevenue: raw(s.totalRevenue),
    grossProfit: raw(s.grossProfit),
    operatingIncome: raw(s.operatingIncome),
    netIncome: raw(s.netIncome),
    ebitda: raw(s.ebitda),
    basicEPS: raw(s.basicEps),
    dilutedEPS: raw(s.dilutedEps),
  }));
}

function parseBalanceSheets(stmts: any[]) {
  return (stmts || []).map((s: any) => ({
    date: fmtDate(s.endDate),
    totalAssets: raw(s.totalAssets),
    totalCurrentAssets: raw(s.totalCurrentAssets),
    totalLiab: raw(s.totalLiab),
    totalCurrentLiabilities: raw(s.totalCurrentLiabilities),
    totalStockholderEquity: raw(s.totalStockholderEquity),
    cash: raw(s.cash),
    shortLongTermDebt: raw(s.shortLongTermDebt),
    longTermDebt: raw(s.longTermDebt),
  }));
}

function parseCashFlows(stmts: any[]) {
  return (stmts || []).map((s: any) => ({
    date: fmtDate(s.endDate),
    operatingCashflow: raw(s.totalCashFromOperatingActivities),
    capitalExpenditures: raw(s.capitalExpenditures),
    freeCashFlow: raw(s.freeCashFlow),
    dividendsPaid: raw(s.dividendsPaid),
  }));
}

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get('symbol') || 'AAPL').toUpperCase().trim();

  const MODULES = [
    'assetProfile',
    'financialData',
    'defaultKeyStatistics',
    'incomeStatementHistory',
    'balanceSheetHistory',
    'cashflowStatementHistory',
    'incomeStatementHistoryQuarterly',
    'balanceSheetHistoryQuarterly',
    'cashflowStatementHistoryQuarterly',
    'recommendationTrend',
    'insiderTransactions',
    'institutionOwnership',
    'majorHoldersBreakdown',
  ].join(',');

  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${MODULES}`;
    const res = await fetchYF(url);

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo Finance ${res.status}` }, { status: res.status });
    }

    const raw_data = await res.json();
    const r = raw_data?.quoteSummary?.result?.[0];
    if (!r) {
      return NextResponse.json({ error: 'No data returned' }, { status: 404 });
    }

    const ap = r.assetProfile || {};
    const profile = {
      address1: ap.address1,
      city: ap.city,
      state: ap.state,
      zip: ap.zip,
      country: ap.country,
      phone: ap.phone,
      website: ap.website,
      industry: ap.industry,
      sector: ap.sector,
      longBusinessSummary: ap.longBusinessSummary,
      fullTimeEmployees: ap.fullTimeEmployees,
      companyOfficers: (ap.companyOfficers || []).slice(0, 6).map((o: any) => ({
        name: o.name,
        title: o.title,
        age: o.age,
        yearBorn: o.yearBorn,
        totalPay: raw(o.totalPay),
      })),
    };

    // incomeStatementHistory = annual (4 years); incomeStatementHistoryQuarterly = quarterly
    const annualIncome = parseIncomeStatements(r.incomeStatementHistory?.incomeStatementHistory || []);
    const quarterlyIncome = parseIncomeStatements(r.incomeStatementHistoryQuarterly?.incomeStatementHistory || []);
    const annualBalance = parseBalanceSheets(r.balanceSheetHistory?.balanceSheetStatements || []);
    const quarterlyBalance = parseBalanceSheets(r.balanceSheetHistoryQuarterly?.balanceSheetStatements || []);
    const annualCashflow = parseCashFlows(r.cashflowStatementHistory?.cashflowStatements || []);
    const quarterlyCashflow = parseCashFlows(r.cashflowStatementHistoryQuarterly?.cashflowStatements || []);

    const holders = (r.institutionOwnership?.ownershipList || []).slice(0, 12).map((h: any) => ({
      organization: h.organization,
      pctHeld: raw(h.pctHeld) ?? 0,
      position: raw(h.position) ?? 0,
      value: raw(h.value) ?? 0,
    }));

    const insiders = (r.insiderTransactions?.transactions || []).slice(0, 15).map((t: any) => ({
      shares: raw(t.shares) ?? 0,
      filerName: t.filerName || '',
      filerRelation: t.filerRelation || '',
      transactionText: t.transactionText || '',
      startDate: raw(t.startDate) ?? 0,
      value: raw(t.value),
    }));

    const recommendations = (r.recommendationTrend?.trend || []).slice(0, 4).map((t: any) => ({
      period: t.period,
      strongBuy: t.strongBuy ?? 0,
      buy: t.buy ?? 0,
      hold: t.hold ?? 0,
      sell: t.sell ?? 0,
      strongSell: t.strongSell ?? 0,
    }));

    return NextResponse.json({
      profile,
      quarterlyIncome,
      annualIncome,
      quarterlyBalance,
      annualBalance,
      quarterlyCashflow,
      annualCashflow,
      holders,
      insiders,
      recommendations,
    }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
