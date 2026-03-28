// EIA — US Energy Information Administration (via server-side route)
// Oil prices, natural gas, crude inventories. Free API key required.

export interface EiaPriceEntry {
  value: number;
  period: string;
  label: string;
  recent?: Array<{ value: number; period: string }>;
  spread?: number | null;
}

export interface EiaData {
  source: "EIA";
  timestamp: string;
  oilPrices: {
    wti: EiaPriceEntry | null;
    brent: EiaPriceEntry | null;
    spread: number | null;
  };
  gasPrice: EiaPriceEntry | null;
  inventories: {
    crudeStocks: (EiaPriceEntry & { recent: any[] }) | null;
  };
  signals: string[];
  error?: string;
}

export async function fetchEiaData(): Promise<EiaData> {
  const res = await fetch("/api/data/eia");
  if (!res.ok) throw new Error(`EIA API route error: ${res.status}`);
  return res.json();
}
