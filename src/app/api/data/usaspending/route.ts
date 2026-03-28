import { NextResponse } from "next/server";

const BASE = "https://api.usaspending.gov/api/v2";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().split("T")[0];
}

export async function GET() {
  try {
    const [defenseRes, agenciesRes] = await Promise.all([
      fetch(`${BASE}/search/spending_by_award/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            keywords: ["defense", "military", "missile", "ammunition", "aircraft", "naval"],
            time_period: [{ start_date: daysAgo(14), end_date: daysAgo(0) }],
            award_type_codes: ["A", "B", "C", "D"],
          },
          fields: ["Award ID", "Recipient Name", "Award Amount", "Description", "Awarding Agency", "Start Date", "Award Type"],
          limit: 20,
          page: 1,
          sort: "Award Amount",
          order: "desc",
        }),
        signal: AbortSignal.timeout(15_000),
      }),
      fetch(`${BASE}/references/toptier_agencies/`, { signal: AbortSignal.timeout(10_000) }),
    ]);

    const defenseData = defenseRes.ok ? await defenseRes.json() : { results: [] };
    const agenciesData = agenciesRes.ok ? await agenciesRes.json() : { results: [] };

    return NextResponse.json({
      source: "USAspending",
      timestamp: new Date().toISOString(),
      recentDefenseContracts: (defenseData?.results || []).slice(0, 10).map((r: any) => ({
        awardId: r["Award ID"],
        recipient: r["Recipient Name"],
        amount: r["Award Amount"],
        description: r["Description"],
        agency: r["Awarding Agency"],
        date: r["Start Date"],
        type: r["Award Type"],
      })),
      topAgencies: (agenciesData?.results || []).slice(0, 10).map((a: any) => ({
        name: a.agency_name,
        budget: a.budget_authority_amount,
        obligations: a.obligated_amount,
        outlays: a.outlay_amount,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ source: "USAspending", timestamp: new Date().toISOString(), recentDefenseContracts: [], topAgencies: [], error: e.message }, { status: 502 });
  }
}
