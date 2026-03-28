// USPTO PatentsView — Patent intelligence
// Uses the legacy free API at api.patentsview.org (no auth required).
// The newer search.patentsview.org/api/v1 now requires an API key.

import { proxyFetch } from "@/lib/proxy-fetch";

// Legacy endpoint — no registration required
const BASE = "https://api.patentsview.org/patents/query";

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toISOString().split("T")[0];
}

export interface Patent {
  id: string;
  title: string;
  date: string;
  assignee: string;
  type: string;
}

export interface PatentsData {
  source: "USPTO Patents";
  timestamp: string;
  searchWindow: string;
  totalFound: number;
  recentPatents: Record<string, Patent[]>;
  signals: string[];
  domains: Record<string, string>;
  error?: string;
}

const STRATEGIC_DOMAINS: Record<string, { label: string; terms: string[] }> = {
  ai: { label: "Artificial Intelligence", terms: ["artificial intelligence", "machine learning", "large language model"] },
  quantum: { label: "Quantum Computing", terms: ["quantum computing", "qubit", "quantum cryptography"] },
  hypersonic: { label: "Hypersonic & Propulsion", terms: ["hypersonic", "scramjet", "directed energy weapon"] },
  semiconductor: { label: "Semiconductor", terms: ["semiconductor", "integrated circuit", "lithography"] },
  biotech: { label: "Biotechnology", terms: ["synthetic biology", "gene editing", "CRISPR", "mRNA"] },
  space: { label: "Space Technology", terms: ["satellite", "space launch", "anti-satellite"] },
};

const WATCH_ORGS = ["Raytheon", "Lockheed", "Northrop", "BAE Systems", "Huawei", "SMIC", "DARPA", "Navy", "Air Force", "Army"];

async function searchDomain(label: string, terms: string[], since: string): Promise<Patent[]> {
  // Legacy API uses GET with JSON query params; sort order is an array (not object)
  const q = JSON.stringify({ _and: [{ _gte: { patent_date: since } }, { _text_any: { patent_abstract: terms } }] });
  const f = JSON.stringify(["patent_id", "patent_title", "patent_date", "patent_type", "assignees.assignee_organization"]);
  const o = JSON.stringify([{ patent_date: "desc" }]);
  const params = new URLSearchParams({ q, f, o, per_page: "10" });

  const res = await proxyFetch(`${BASE}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return ((data?.patents || []) as any[]).map((p: any) => ({
    id: p.patent_id,
    title: p.patent_title,
    date: p.patent_date,
    // Legacy API nests assignees as an array of objects
    assignee: p.assignees?.[0]?.assignee_organization || "Unknown",
    type: p.patent_type,
  }));
}

export async function fetchPatentsData(): Promise<PatentsData> {
  const since = daysAgo(90);
  try {
    const domainEntries = Object.entries(STRATEGIC_DOMAINS);
    const results = await Promise.all(
      domainEntries.map(([key, domain]) =>
        searchDomain(domain.label, domain.terms, since).then((patents) => ({ key, patents }))
      )
    );
    const recentPatents: Record<string, Patent[]> = {};
    const signals: string[] = [];
    let totalFound = 0;

    for (const { key, patents } of results) {
      recentPatents[key] = patents;
      totalFound += patents.length;
      const assigneeCounts: Record<string, number> = {};
      patents.forEach((p) => {
        if (p.assignee && p.assignee !== "Unknown")
          assigneeCounts[p.assignee] = (assigneeCounts[p.assignee] || 0) + 1;
      });
      Object.entries(assigneeCounts).forEach(([org, count]) => {
        if (count >= 3) signals.push(`HIGH ACTIVITY: ${org} filed ${count} ${STRATEGIC_DOMAINS[key].label} patents in 90 days`);
      });
      patents.forEach((p) => {
        if (WATCH_ORGS.some((org) => p.assignee?.toLowerCase().includes(org.toLowerCase())))
          signals.push(`WATCH: "${p.title.slice(0, 60)}" by ${p.assignee}`);
      });
    }

    return {
      source: "USPTO Patents",
      timestamp: new Date().toISOString(),
      searchWindow: `${since} to ${new Date().toISOString().split("T")[0]}`,
      totalFound,
      recentPatents,
      signals: signals.length > 0 ? signals : ["No unusual patent filing patterns detected"],
      domains: Object.fromEntries(domainEntries.map(([k, d]) => [k, d.label])),
    };
  } catch (e: any) {
    return {
      source: "USPTO Patents",
      timestamp: new Date().toISOString(),
      searchWindow: since,
      totalFound: 0,
      recentPatents: {},
      signals: [],
      domains: {},
      error: e.message,
    };
  }
}
