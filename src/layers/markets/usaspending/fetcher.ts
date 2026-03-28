// USAspending — Federal contracts/spending (via server-side route)
// POST-based API, no auth required.

export interface UsaspendingContract {
  awardId: string;
  recipient: string;
  amount: number;
  description: string;
  agency: string;
  date: string;
  type: string;
}

export interface UsaspendingData {
  source: "USAspending";
  timestamp: string;
  recentDefenseContracts: UsaspendingContract[];
  topAgencies: Array<{ name: string; budget: number; obligations: number; outlays: number }>;
  error?: string;
}

export async function fetchUsaspendingData(): Promise<UsaspendingData> {
  const res = await fetch("/api/data/usaspending");
  if (!res.ok) throw new Error(`USAspending API route error: ${res.status}`);
  return res.json();
}
