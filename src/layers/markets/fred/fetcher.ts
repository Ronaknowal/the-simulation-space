// FRED — Federal Reserve Economic Data
// 840,000+ time series. Free API key required.
// Server-side fetch via /api/data/fred (avoids exposing API key client-side)

export interface FredIndicator {
  id: string;
  label: string;
  value: number | null;
  date: string | null;
  recent: number[];
}

export interface FredData {
  source: "FRED";
  timestamp: string;
  indicators: FredIndicator[];
  signals: string[];
  error?: string;
}

export async function fetchFredData(): Promise<FredData> {
  const res = await fetch("/api/data/fred");
  if (!res.ok) throw new Error(`FRED API error: ${res.status}`);
  return res.json();
}
