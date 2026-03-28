// ReliefWeb — UN OCHA humanitarian crisis tracking (via server-side route)
// POST-based API. Requires approved appname (set RELIEFWEB_APPNAME in env).

export interface ReliefwebReport {
  title: string;
  date: string;
  countries: string[];
  disasterType: string[];
  source: string[];
  url: string | null;
}

export interface ReliefwebDisaster {
  name: string;
  date: string;
  countries: string[];
  type: string[];
  status: string;
}

export interface ReliefwebData {
  source: string;
  timestamp: string;
  latestReports: ReliefwebReport[];
  activeDisasters: ReliefwebDisaster[];
  rwError?: string;
  rwNote?: string;
}

export async function fetchReliefwebData(): Promise<ReliefwebData> {
  const res = await fetch("/api/data/reliefweb");
  if (!res.ok) throw new Error(`ReliefWeb API route error: ${res.status}`);
  return res.json();
}
