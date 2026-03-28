export interface OHLCVBar {
  t: number;   // timestamp ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface StockMeta {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  exchange: string;
  quoteType: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  trailingPE: number;
  forwardPE: number;
  dividendYield: number;
  beta: number;
  averageVolume: number;
  marketState: string;
  epsTrailingTwelveMonths?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  sharesOutstanding?: number;
}

export interface Officer {
  name: string;
  title: string;
  age?: number;
  yearBorn?: number;
  totalPay?: number;
}

export interface CompanyProfile {
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  website?: string;
  industry?: string;
  sector?: string;
  longBusinessSummary?: string;
  fullTimeEmployees?: number;
  companyOfficers?: Officer[];
}

export interface IncomeStatement {
  date: string;
  totalRevenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  ebitda?: number;
  basicEPS?: number;
  dilutedEPS?: number;
}

export interface BalanceSheet {
  date: string;
  totalAssets?: number;
  totalCurrentAssets?: number;
  totalLiab?: number;
  totalCurrentLiabilities?: number;
  totalStockholderEquity?: number;
  cash?: number;
  shortLongTermDebt?: number;
  longTermDebt?: number;
}

export interface CashFlowStatement {
  date: string;
  operatingCashflow?: number;
  capitalExpenditures?: number;
  freeCashFlow?: number;
  dividendsPaid?: number;
}

export interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  thumbnailUrl?: string;
}

export interface SupplyChainNode {
  id: string;
  name: string;
  type: 'supplier' | 'company' | 'customer';
  ticker?: string;
  exposure?: number;
  sector?: string;
  description?: string;
}

export interface SupplyChainEdge {
  source: string;
  target: string;
  label?: string;
  value?: number;
}

export interface SupplyChainData {
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
  isEstimated?: boolean;
  estimatedBasis?: string; // e.g. "Technology / Semiconductors sector"
}

export interface InstitutionalHolder {
  organization: string;
  pctHeld: number;
  position: number;
  value: number;
}

export interface InsiderTransaction {
  shares: number;
  filerName: string;
  filerRelation: string;
  transactionText: string;
  startDate: number;
  value?: number;
}

export interface AnalystRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

// ── Supply Chain Research (AI-powered deep analysis) ─────────────────────────

export interface SCRFacility {
  name: string;
  type: 'hq' | 'factory' | 'warehouse' | 'data-center' | 'mine' | 'port' | 'refinery' | 'assembly' | 'logistics-hub';
  lat: number;
  lng: number;
  details?: string; // e.g. "5nm fab, 100K wafers/month"
}

export interface SCRNode {
  id: string;
  name: string;
  ticker?: string;
  type: 'supplier' | 'customer' | 'competitor' | 'company';
  tier: number; // 0=target company, 1=direct, 2=sub-supplier, etc.
  category: string; // 'semiconductor', 'display', 'assembly', 'logistics', etc.
  location: { country: string; city?: string; lat: number; lng: number };
  revenueExposure?: number; // percentage
  isCritical: boolean; // sole source or >30% dependency
  risk: 'low' | 'medium' | 'high';
  stage?: 'extraction' | 'component' | 'manufacturing' | 'assembly' | 'company' | 'logistics' | 'distribution' | 'retail';
  facilities?: SCRFacility[]; // individual sites: factories, data centers, mines, etc.
}

export interface SCREdge {
  id: string;
  from: string;
  to: string;
  relationship: string;
  goods?: string;
  transportMode?: 'sea' | 'rail' | 'truck' | 'air';
  route?: Array<{ lat: number; lng: number; name?: string }>;
  volume?: string;    // e.g. "~2M units/quarter"
  leadTime?: string;  // e.g. "6-8 weeks"
}

export interface SCRChokepoint {
  name: string;
  lat: number;
  lng: number;
  type: string;
  affectedEdges: string[];
  risk: string;
}

export interface SupplyChainResearch {
  company: { ticker: string; name: string; sector: string };
  nodes: SCRNode[];
  edges: SCREdge[];
  chokepoints: SCRChokepoint[];
  researchSummary: string;
  riskSummary?: {
    geopolitical: string[];
    concentration: string[];
    logistics: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface TerminalData {
  symbol: string;
  isLoading: boolean;
  error: string | null;
  // Quote
  bars: OHLCVBar[];
  meta: StockMeta | null;
  // Profile
  profile: CompanyProfile | null;
  // Financials
  quarterlyIncome: IncomeStatement[];
  annualIncome: IncomeStatement[];
  quarterlyBalance: BalanceSheet[];
  annualBalance: BalanceSheet[];
  quarterlyCashflow: CashFlowStatement[];
  annualCashflow: CashFlowStatement[];
  // News
  news: NewsItem[];
  // Supply chain
  supplyChain: SupplyChainData | null;
  // Ownership
  holders: InstitutionalHolder[];
  insiders: InsiderTransaction[];
  // Analyst
  recommendations: AnalystRecommendation[];
}
