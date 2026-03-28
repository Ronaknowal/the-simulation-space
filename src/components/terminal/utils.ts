export function fmtNumber(n: number | undefined | null, decimals = 2): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(decimals) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(decimals) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(decimals) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
}

export function fmtPrice(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  return (n * 100).toFixed(2) + '%';
}

export function fmtPctRaw(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return 'N/A';
  return n.toFixed(2) + '%';
}

export function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

export function bollingerBands(
  data: number[],
  period = 20,
  multiplier = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(data, period);
  const upper = data.map((_, i) => {
    if (middle[i] === null) return null;
    const slice = data.slice(Math.max(0, i - period + 1), i + 1);
    const mean = middle[i]!;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
    return mean + multiplier * Math.sqrt(variance);
  });
  const lower = data.map((_, i) => {
    if (middle[i] === null) return null;
    const slice = data.slice(Math.max(0, i - period + 1), i + 1);
    const mean = middle[i]!;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
    return mean - multiplier * Math.sqrt(variance);
  });
  return { upper, middle, lower };
}

/** Map a value from [inMin, inMax] to [outMin, outMax] */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

const POSITIVE_WORDS = [
  'surge', 'beat', 'rally', 'gain', 'bull', 'strong', 'record', 'growth',
  'rise', 'soar', 'climb', 'profit', 'upgrade', 'outperform', 'buy', 'upside',
  'positive', 'boost', 'lead', 'above', 'exceed', 'win', 'success',
];

const NEGATIVE_WORDS = [
  'crash', 'miss', 'sell', 'bear', 'weak', 'decline', 'loss', 'fall',
  'drop', 'plunge', 'slide', 'downgrade', 'underperform', 'below', 'cut',
  'layoff', 'lawsuit', 'fine', 'penalty', 'warn', 'risk', 'concern', 'probe',
];

export function analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) pos++;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) neg++;
  if (pos > neg) return 'bullish';
  if (neg > pos) return 'bearish';
  return 'neutral';
}

export const RANGE_TO_INTERVAL: Record<string, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1wk' },
  'MAX': { range: 'max', interval: '1mo' },
};
