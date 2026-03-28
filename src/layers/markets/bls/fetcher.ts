// BLS — Bureau of Labor Statistics (via server-side route)
// CPI, unemployment, nonfarm payrolls, PPI. POST-based API.

export interface BlsIndicator {
  id: string;
  label: string;
  value: number | null;
  date: string | null;
  period: string | null;
  momChange: number | null;
  momChangePct: number | null;
}

export interface BlsData {
  source: "BLS";
  timestamp: string;
  indicators: BlsIndicator[];
  signals: string[];
  error?: string;
}

export async function fetchBlsData(): Promise<BlsData> {
  const res = await fetch("/api/data/bls");
  if (!res.ok) throw new Error(`BLS API route error: ${res.status}`);
  return res.json();
}
