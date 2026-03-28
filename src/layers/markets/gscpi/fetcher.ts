// GSCPI — NY Fed Global Supply Chain Pressure Index
// No auth required. Fetched via proxy (CORS blocked).

import { proxyFetch } from "@/lib/proxy-fetch";

const GSCPI_CSV_URL =
  "https://www.newyorkfed.org/medialibrary/research/interactives/data/gscpi/gscpi_interactive_data.csv";

export interface GscpiEntry {
  date: string; // "YYYY-MM"
  value: number;
}

export interface GscpiData {
  source: "NY Fed GSCPI";
  timestamp: string;
  latest: { value: number; date: string; interpretation: string } | null;
  trend: "rising" | "falling" | "stable" | "insufficient data";
  history: GscpiEntry[];
  signals: string[];
  error?: string;
}

function parseNYFedDate(str: string): string | null {
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const mon = months[parts[1]];
  const year = parts[2];
  return mon && year ? `${year}-${mon}` : null;
}

function parseCSV(text: string, months: number): GscpiEntry[] {
  const lines = text.trim().split("\n").filter((l) => l.trim() && !l.startsWith(","));
  if (lines.length < 2) return [];
  const results: GscpiEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const dateStr = cols[0]?.trim();
    if (!dateStr) continue;
    let value: number | null = null;
    for (let j = cols.length - 1; j >= 1; j--) {
      const v = cols[j]?.trim();
      if (v && v !== "#N/A" && v !== "") {
        const num = parseFloat(v);
        if (!isNaN(num)) { value = num; break; }
      }
    }
    if (value === null) continue;
    const date = parseNYFedDate(dateStr);
    if (date) results.push({ date, value });
  }
  results.sort((a, b) => b.date.localeCompare(a.date));
  return results.slice(0, months);
}

function detectTrend(history: GscpiEntry[]): GscpiData["trend"] {
  if (history.length < 3) return "insufficient data";
  const recent = history.slice(0, 3);
  let rising = 0, falling = 0;
  for (let i = 0; i < recent.length - 1; i++) {
    if (recent[i].value > recent[i + 1].value) rising++;
    else if (recent[i].value < recent[i + 1].value) falling++;
  }
  if (rising > falling) return "rising";
  if (falling > rising) return "falling";
  return "stable";
}

export async function fetchGscpiData(): Promise<GscpiData> {
  try {
    const res = await proxyFetch(GSCPI_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const history = parseCSV(text, 12);
    const trend = detectTrend(history);
    const latest = history.length > 0 ? history[0] : null;
    const signals: string[] = [];

    if (latest) {
      if (latest.value > 2.0) signals.push(`GSCPI extremely elevated at ${latest.value.toFixed(2)} — severe supply chain stress`);
      else if (latest.value > 1.0) signals.push(`GSCPI elevated at ${latest.value.toFixed(2)} — above-normal supply chain pressure`);
      else if (latest.value < -1.0) signals.push(`GSCPI at ${latest.value.toFixed(2)} — unusually loose supply chains`);
      if (trend === "rising" && latest.value > 0) signals.push("Supply chain pressure trending higher");
    }

    if (history.length >= 2) {
      const mom = history[0].value - history[1].value;
      if (Math.abs(mom) > 0.5) signals.push(`GSCPI ${mom > 0 ? "surged" : "dropped"} ${Math.abs(mom).toFixed(2)} points MoM`);
    }

    return {
      source: "NY Fed GSCPI",
      timestamp: new Date().toISOString(),
      latest: latest ? {
        value: latest.value,
        date: latest.date,
        interpretation: latest.value > 1.0 ? "elevated" : latest.value > 0 ? "above average" : latest.value > -1.0 ? "below average" : "unusually loose",
      } : null,
      trend,
      history,
      signals,
    };
  } catch (e: any) {
    return { source: "NY Fed GSCPI", timestamp: new Date().toISOString(), latest: null, trend: "insufficient data", history: [], signals: [], error: e.message };
  }
}
