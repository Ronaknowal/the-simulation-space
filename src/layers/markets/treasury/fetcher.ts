// US Treasury Fiscal Data — Government debt, yields
// No auth required. Direct fetch (CORS OK).

const BASE = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service";

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toISOString().split("T")[0];
}

export interface TreasuryDebtEntry {
  date: string;
  totalDebt: string;
  publicDebt: string;
  intragovDebt: string;
}

export interface TreasuryRateEntry {
  date: string;
  security: string;
  rate: string;
}

export interface TreasuryData {
  source: "US Treasury";
  timestamp: string;
  debt: TreasuryDebtEntry[];
  interestRates: TreasuryRateEntry[];
  signals: string[];
  error?: string;
}

export async function fetchTreasuryData(): Promise<TreasuryData> {
  try {
    const debtParams = new URLSearchParams({
      fields: "record_date,tot_pub_debt_out_amt,intragov_hold_amt,debt_held_public_amt",
      sort: "-record_date",
      "page[size]": "5",
      filter: `record_date:gte:${daysAgo(30)}`,
    });
    const rateParams = new URLSearchParams({
      fields: "record_date,security_desc,avg_interest_rate_amt",
      sort: "-record_date",
      "page[size]": "20",
      filter: `record_date:gte:${daysAgo(30)}`,
    });

    const [debtRes, ratesRes] = await Promise.all([
      fetch(`${BASE}/v2/accounting/od/debt_to_penny?${debtParams}`),
      fetch(`${BASE}/v2/accounting/od/avg_interest_rates?${rateParams}`),
    ]);

    const debtData = debtRes.ok ? await debtRes.json() : { data: [] };
    const ratesData = ratesRes.ok ? await ratesRes.json() : { data: [] };

    const signals: string[] = [];
    const latestDebt = debtData.data?.[0];
    if (latestDebt) {
      const totalDebt = parseFloat(latestDebt.tot_pub_debt_out_amt);
      if (totalDebt > 36_000_000_000_000) {
        signals.push(`National debt at $${(totalDebt / 1e12).toFixed(2)}T`);
      }
    }

    return {
      source: "US Treasury",
      timestamp: new Date().toISOString(),
      debt: (debtData.data || []).map((d: any) => ({
        date: d.record_date,
        totalDebt: d.tot_pub_debt_out_amt,
        publicDebt: d.debt_held_public_amt,
        intragovDebt: d.intragov_hold_amt,
      })),
      interestRates: (ratesData.data || []).slice(0, 20).map((r: any) => ({
        date: r.record_date,
        security: r.security_desc,
        rate: r.avg_interest_rate_amt,
      })),
      signals,
    };
  } catch (e: any) {
    return { source: "US Treasury", timestamp: new Date().toISOString(), debt: [], interestRates: [], signals: [], error: e.message };
  }
}
