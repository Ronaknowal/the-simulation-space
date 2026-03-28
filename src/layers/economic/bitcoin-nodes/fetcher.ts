export interface BitcoinNode {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  nodeCount: number;
  isp: string;
}

/**
 * Fetches Bitcoin node data from our server-side API route.
 *
 * The server handles fetching from Bitnodes (10-30MB response),
 * grouping by location, and returning a lightweight JSON payload.
 * This avoids CORS issues and large client-side JSON parsing.
 */
export async function fetchBitcoinNodes(): Promise<BitcoinNode[]> {
  try {
    const res = await fetch("/api/economic/bitcoin-nodes", {
      signal: AbortSignal.timeout(35_000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn(`[Bitcoin Nodes] API error ${res.status}:`, body.error || "unknown");
      return [];
    }

    const json = await res.json();
    const nodes = json.nodes;

    if (!Array.isArray(nodes) || nodes.length === 0) {
      console.warn("[Bitcoin Nodes] API returned no nodes:", json);
      return [];
    }

    console.info(
      `[Bitcoin Nodes] received ${nodes.length} grouped points (totalRaw=${json.totalRaw}, source=${json.source})`
    );

    return nodes;
  } catch (err) {
    console.warn("[Bitcoin Nodes] fetch failed:", err);
    return [];
  }
}
