import { NextRequest } from 'next/server';
import type { SupplyChainResearch, SCRNode, SCREdge, SCRChokepoint, SCRFacility } from '@/components/terminal/types';

// Allow up to 10 minutes for AI research
export const maxDuration = 600;

// ── In-memory caches ─────────────────────────────────────────────────────────
const cache = new Map<string, { data: SupplyChainResearch; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const geocodeCache = new Map<string, { lat: number; lng: number }>();
let lastGeocode = 0; // rate-limit Nominatim to 1 req/sec

// ── Well-known company coordinates ──────────────────────────────────────────
const KNOWN_COORDS: Record<string, { country: string; city: string; lat: number; lng: number }> = {
  AAPL:      { country: 'USA',         city: 'Cupertino, CA',    lat: 37.3346,  lng: -122.0090 },
  MSFT:      { country: 'USA',         city: 'Redmond, WA',      lat: 47.6740,  lng: -122.1215 },
  GOOGL:     { country: 'USA',         city: 'Mountain View, CA',lat: 37.4220,  lng: -122.0841 },
  GOOG:      { country: 'USA',         city: 'Mountain View, CA',lat: 37.4220,  lng: -122.0841 },
  META:      { country: 'USA',         city: 'Menlo Park, CA',   lat: 37.4848,  lng: -122.1487 },
  AMZN:      { country: 'USA',         city: 'Seattle, WA',      lat: 47.6062,  lng: -122.3321 },
  NVDA:      { country: 'USA',         city: 'Santa Clara, CA',  lat: 37.3688,  lng: -122.0363 },
  AMD:       { country: 'USA',         city: 'Santa Clara, CA',  lat: 37.3382,  lng: -121.8863 },
  INTC:      { country: 'USA',         city: 'Santa Clara, CA',  lat: 37.3875,  lng: -121.9638 },
  TSLA:      { country: 'USA',         city: 'Austin, TX',       lat: 30.2672,  lng: -97.7431  },
  TSM:       { country: 'Taiwan',      city: 'Hsinchu',          lat: 24.7831,  lng: 120.9675  },
  QCOM:      { country: 'USA',         city: 'San Diego, CA',    lat: 32.8901,  lng: -117.2198 },
  AVGO:      { country: 'USA',         city: 'San Jose, CA',     lat: 37.3382,  lng: -121.8863 },
  TXN:       { country: 'USA',         city: 'Dallas, TX',       lat: 32.7767,  lng: -96.7970  },
  MU:        { country: 'USA',         city: 'Boise, ID',        lat: 43.6150,  lng: -116.2023 },
  GLW:       { country: 'USA',         city: 'Corning, NY',      lat: 42.1448,  lng: -77.0547  },
  AMAT:      { country: 'USA',         city: 'Santa Clara, CA',  lat: 37.3875,  lng: -121.9638 },
  LRCX:      { country: 'USA',         city: 'Fremont, CA',      lat: 37.5485,  lng: -121.9886 },
  KLAC:      { country: 'USA',         city: 'Milpitas, CA',     lat: 37.4280,  lng: -121.8978 },
  ASML:      { country: 'Netherlands', city: 'Veldhoven',        lat: 51.3998,  lng: 5.4588    },
  SONY:      { country: 'Japan',       city: 'Tokyo',            lat: 35.6627,  lng: 139.7320  },
  TM:        { country: 'Japan',       city: 'Toyota City',      lat: 35.0828,  lng: 137.1565  },
  GM:        { country: 'USA',         city: 'Detroit, MI',      lat: 42.3314,  lng: -83.0458  },
  F:         { country: 'USA',         city: 'Dearborn, MI',     lat: 42.3223,  lng: -83.1763  },
  NFLX:      { country: 'USA',         city: 'Los Gatos, CA',    lat: 37.2272,  lng: -121.9824 },
  JPM:       { country: 'USA',         city: 'New York, NY',     lat: 40.7549,  lng: -73.9840  },
  WMT:       { country: 'USA',         city: 'Bentonville, AR',  lat: 36.3729,  lng: -94.2088  },
  T:         { country: 'USA',         city: 'Dallas, TX',       lat: 32.7767,  lng: -96.7970  },
  VZ:        { country: 'USA',         city: 'New York, NY',     lat: 40.7549,  lng: -73.9840  },
  ORCL:      { country: 'USA',         city: 'Austin, TX',       lat: 30.2672,  lng: -97.7431  },
  SAP:       { country: 'Germany',     city: 'Walldorf',         lat: 49.2938,  lng: 8.6423    },
  CRM:       { country: 'USA',         city: 'San Francisco, CA',lat: 37.7749,  lng: -122.4194 },
  FOXCONN:   { country: 'Taiwan',      city: 'New Taipei',       lat: 25.0094,  lng: 121.4418  },
  '2317.TW': { country: 'Taiwan',      city: 'New Taipei',       lat: 25.0094,  lng: 121.4418  },
  '005930.KS':{ country: 'South Korea',city: 'Suwon',            lat: 37.2636,  lng: 127.0286  },
  '000660.KS':{ country: 'South Korea',city: 'Icheon',           lat: 37.2742,  lng: 127.4343  },
};

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://finance.yahoo.com',
  Referer: 'https://finance.yahoo.com/',
};

// ── Tool implementations ────────────────────────────────────────────────────

async function toolWebSearch(query: string): Promise<string> {
  const braveKey = process.env.BRAVE_SEARCH_KEY;
  if (braveKey) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
        { headers: { 'X-Subscription-Token': braveKey, Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) }
      );
      if (res.ok) {
        const data = await res.json();
        const results: any[] = data.web?.results ?? [];
        return results.map((r) => `${r.title}\n${r.description}`).join('\n\n') || 'No results';
      }
    } catch { /* fall through */ }
  }
  // Fallback: GDELT news search
  try {
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query + ' supply chain')}&mode=artlist&maxrecords=6&format=json`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (res.ok) {
      const data = await res.json();
      const articles: any[] = data.articles ?? [];
      return articles.slice(0, 5).map((a: any) => `${a.title} (${a.seendate})`).join('\n') || 'No articles found';
    }
  } catch { /* ignore */ }
  return 'Search unavailable — rely on model knowledge';
}

async function toolGetCompanyInfo(ticker: string): Promise<object> {
  try {
    const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${ticker}?modules=summaryProfile,price`;
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { error: 'HTTP ' + res.status };
    const data = await res.json();
    const result = data.quoteSummary?.result?.[0];
    if (!result) return { error: 'No data' };
    return {
      name:      result.price?.longName ?? result.price?.shortName,
      sector:    result.summaryProfile?.sector,
      industry:  result.summaryProfile?.industry,
      country:   result.summaryProfile?.country,
      city:      result.summaryProfile?.city,
      employees: result.summaryProfile?.fullTimeEmployees,
      summary:   (result.summaryProfile?.longBusinessSummary ?? '').slice(0, 600),
      website:   result.summaryProfile?.website,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

async function toolSearchSecFilings(company: string, terms: string): Promise<string> {
  try {
    const q = `"${company}" ${terms}`;
    const url =
      `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}` +
      `&forms=10-K&dateRange=custom&startdt=2023-01-01&enddt=2025-03-01`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TheSimulationSpace/1.0 research@example.com' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return `SEC EDGAR error: ${res.status}`;
    const data = await res.json();
    const hits: any[] = data.hits?.hits ?? [];
    if (!hits.length) return 'No 10-K filings found for this query';
    return hits.slice(0, 4).map((h) => {
      const s = h._source;
      return `${s.entity_name} 10-K (${s.period_of_report ?? 'n/a'}) filed ${s.file_date ?? 'n/a'}`;
    }).join('\n');
  } catch (e: any) {
    return `SEC search failed: ${e.message}`;
  }
}

async function toolGeocodeLocation(query: string): Promise<string> {
  // Check cache
  const cached = geocodeCache.get(query.toLowerCase());
  if (cached) return JSON.stringify(cached);

  // Rate limit: 1 req/sec for Nominatim
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastGeocode));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: { 'User-Agent': 'TheSimulationSpace/1.0 (supply-chain-research)' },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) return 'Geocoding failed: HTTP ' + res.status;
    const data = await res.json();
    if (!data.length) return `Location not found for: ${query}`;
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
    geocodeCache.set(query.toLowerCase(), { lat: result.lat, lng: result.lng });
    return JSON.stringify(result);
  } catch (e: any) {
    return `Geocoding error: ${e.message}`;
  }
}

// ── Gemini API call ─────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  messages: object[],
  tools: object[]
): Promise<any> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 16384,
      }),
      signal: AbortSignal.timeout(120_000),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API error ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

// ── JSON extraction & validation ────────────────────────────────────────────

function extractJSON(content: string): any | null {
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  const jsonStr = cleaned.slice(start, end + 1);
  try { return JSON.parse(jsonStr); } catch {
    const fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    try { return JSON.parse(fixed); } catch { return null; }
  }
}

function patchCoords(node: SCRNode): SCRNode {
  const known = KNOWN_COORDS[node.ticker ?? ''] ?? KNOWN_COORDS[node.id ?? ''];
  if (known && (!node.location?.lat || !node.location?.lng)) {
    return { ...node, location: { ...node.location, ...known } };
  }
  return node;
}

function inferStage(n: any): SCRNode['stage'] {
  if (n.type === 'company') return 'company';
  const cat = (n.category ?? '').toLowerCase();
  if (cat.includes('material') || cat.includes('mine') || cat.includes('extraction') || cat.includes('chemical') || cat.includes('raw')) return 'extraction';
  if (cat.includes('semiconductor') || cat.includes('memory') || cat.includes('display') || cat.includes('component') || cat.includes('chip') || cat.includes('sensor')) return 'component';
  if (cat.includes('assembly') || cat.includes('contract') || cat.includes('odm') || cat.includes('oem')) return 'assembly';
  if (cat.includes('manufacturing') || cat.includes('foundry') || cat.includes('fab')) return 'manufacturing';
  if (cat.includes('logistics') || cat.includes('shipping') || cat.includes('freight') || cat.includes('port') || cat.includes('carrier')) return 'logistics';
  if (cat.includes('distribution') || cat.includes('warehouse') || cat.includes('fulfillment') || cat.includes('wholesale')) return 'distribution';
  if (cat.includes('retail') || cat.includes('dealer') || cat.includes('store') || cat.includes('e-commerce')) return 'retail';
  // Fall back to type/tier
  if (n.type === 'customer') return 'retail';
  if (n.type === 'supplier' && (n.tier ?? 1) >= 2) return 'extraction';
  if (n.type === 'supplier') return 'component';
  return undefined;
}

function validateResearch(raw: any, symbol: string): SupplyChainResearch {
  const nodes: SCRNode[] = (raw.nodes ?? []).map((n: any, i: number) => patchCoords({
    id: n.id ?? `node_${i}`,
    name: n.name ?? 'Unknown',
    ticker: n.ticker,
    type: n.type ?? 'supplier',
    tier: n.tier ?? 1,
    category: n.category ?? 'other',
    location: {
      country: n.location?.country ?? 'Unknown',
      city:    n.location?.city,
      lat:     n.location?.lat ?? 0,
      lng:     n.location?.lng ?? 0,
    },
    revenueExposure: n.revenueExposure,
    isCritical: !!n.isCritical,
    risk: n.risk ?? 'medium',
    stage: n.stage ?? inferStage(n),
    facilities: Array.isArray(n.facilities)
      ? n.facilities
          .map((f: any) => ({
            name: f.name ?? 'Facility',
            type: f.type ?? 'factory',
            lat: f.lat ?? 0,
            lng: f.lng ?? 0,
            details: f.details,
          }))
          .filter((f: SCRFacility) => f.lat !== 0 && f.lng !== 0)
      : undefined,
  }));

  const edges: SCREdge[] = (raw.edges ?? []).map((e: any, i: number) => ({
    id: e.id ?? `edge_${i}`,
    from: e.from ?? '',
    to: e.to ?? '',
    relationship: e.relationship ?? '',
    goods: e.goods,
    transportMode: e.transportMode,
    route: e.route,
    volume: e.volume,
    leadTime: e.leadTime,
  }));

  const chokepoints: SCRChokepoint[] = (raw.chokepoints ?? []).map((c: any) => ({
    name: c.name ?? 'Unknown',
    lat:  c.lat ?? 0,
    lng:  c.lng ?? 0,
    type: c.type ?? 'strait',
    affectedEdges: c.affectedEdges ?? [],
    risk: c.risk ?? '',
  }));

  return {
    company: {
      ticker: raw.company?.ticker ?? symbol.toUpperCase(),
      name:   raw.company?.name ?? symbol,
      sector: raw.company?.sector ?? 'Unknown',
    },
    nodes,
    edges,
    chokepoints,
    researchSummary: raw.researchSummary ?? 'AI research complete.',
    riskSummary: raw.riskSummary ? {
      geopolitical: Array.isArray(raw.riskSummary.geopolitical) ? raw.riskSummary.geopolitical : [],
      concentration: Array.isArray(raw.riskSummary.concentration) ? raw.riskSummary.concentration : [],
      logistics: Array.isArray(raw.riskSummary.logistics) ? raw.riskSummary.logistics : [],
    } : undefined,
  };
}

// ── Sector detection ────────────────────────────────────────────────────────

type SectorType = 'hardware_semiconductor' | 'software_saas' | 'ai_compute' | 'manufacturing_auto' | 'consumer_retail' | 'energy_materials' | 'pharma' | 'generic';

const AI_TICKERS = new Set(['NVDA', 'GOOGL', 'GOOG', 'META', 'MSFT', 'AMZN', 'AMD', 'INTC', 'TSM', 'AVGO', 'MU', 'MRVL', 'SMCI', 'ARM']);

function detectSectorType(sector?: string, industry?: string, ticker?: string): SectorType {
  const s = (sector ?? '').toLowerCase();
  const i = (industry ?? '').toLowerCase();
  const t = (ticker ?? '').toUpperCase();

  if (i.includes('semiconductor') || i.includes('chip')) {
    return AI_TICKERS.has(t) ? 'ai_compute' : 'hardware_semiconductor';
  }
  if (i.includes('consumer electronics') || i.includes('electronic equipment')) return 'hardware_semiconductor';
  if (i.includes('software') || i.includes('saas') || i.includes('cloud') || i.includes('internet')) return 'software_saas';
  if (i.includes('auto') || i.includes('motor') || i.includes('vehicle')) return 'manufacturing_auto';
  if (i.includes('drug') || i.includes('biotech') || i.includes('pharma')) return 'pharma';
  if (s === 'consumer defensive' || s === 'consumer cyclical' || i.includes('retail') || i.includes('e-commerce')) return 'consumer_retail';
  if (s === 'energy' || s === 'basic materials' || i.includes('oil') || i.includes('mining') || i.includes('chemical')) return 'energy_materials';
  if (s === 'technology' && AI_TICKERS.has(t)) return 'ai_compute';
  if (s === 'technology') return 'software_saas';
  return 'generic';
}

// ── Sector-specific research instructions ───────────────────────────────────

const SECTOR_INSTRUCTIONS: Record<SectorType, string> = {
  hardware_semiconductor: `
SECTOR-SPECIFIC: SEMICONDUCTORS & HARDWARE
Research the FULL lifecycle — from raw materials to end customers:
UPSTREAM (extraction → component):
- MATERIALS: silicon wafers (Shin-Etsu, SUMCO), photoresists, rare earths, specialty gases
- EQUIPMENT: lithography (ASML EUV), deposition (Applied Materials), etch (Lam Research), inspection (KLA)
- FOUNDRY: which fabs manufacture the chips (TSMC, Samsung, GlobalFoundries) — exact fab city
- MEMORY: HBM/DRAM/NAND suppliers (SK Hynix, Samsung, Micron)
- DISPLAYS: display suppliers (BOE, LG Display, Samsung Display) if applicable
- PACKAGING: advanced packaging houses (ASE, Amkor, JCET) — CoWoS, InFO
MIDSTREAM (manufacturing → assembly):
- ASSEMBLY: contract manufacturers (Foxconn, Pegatron, Wistron, Quanta) — exact plant cities
- The company's OWN manufacturing/assembly plants
DOWNSTREAM (logistics → distribution → retail):
- LOGISTICS: export ports, shipping lines, air freight hubs used
- DISTRIBUTION: the company's distribution centers, regional warehouses, fulfillment centers
- RETAIL: retail partners (Best Buy, Amazon, carrier stores), enterprise sales channels
- END MARKETS: major geographic market regions (Americas, EMEA, APAC) with revenue share
Include facilities for fabs, assembly plants, AND distribution centers.
Shipping routes: materials→fab→assembly→port→distribution→retail with real waypoints.`,

  software_saas: `
SECTOR-SPECIFIC: SOFTWARE & CLOUD/SAAS
Research the FULL digital value chain — infrastructure to end users:
UPSTREAM (extraction → component):
- HARDWARE: server chips (Intel, AMD, NVIDIA, ARM), storage, networking equipment
- CLOUD: primary cloud providers (AWS, Azure, GCP) — data center regions
- INFRASTRUCTURE: DNS, domain registrars, CDN (Cloudflare, Akamai)
MIDSTREAM (manufacturing → company):
- DATA LAYER: database (Snowflake, MongoDB Atlas), analytics, data warehousing
- SECURITY: security vendors (CrowdStrike, Palo Alto, Zscaler)
- IDENTITY: auth providers (Okta, Auth0), SSO integrations
- PAYMENTS: payment processors (Stripe, PayPal, Adyen)
DOWNSTREAM (logistics → distribution → retail):
- CHANNELS: system integrators (Accenture, Deloitte), resellers, app marketplaces
- ENTERPRISE: major enterprise customers with deployment regions and verticals
- END MARKETS: geographic user base distribution (NA, EMEA, APAC, LATAM)
Include data center facilities with locations. Label each node with its lifecycle stage.
Transport mode: "air" for data flows, but note physical hardware deliveries for infrastructure.`,

  ai_compute: `
SECTOR-SPECIFIC: AI & COMPUTE INFRASTRUCTURE
Research the FULL AI compute chain — from silicon to end customers:
UPSTREAM (extraction → component):
- MATERIALS: silicon wafers, rare earths, specialty chemicals for chip manufacturing
- FOUNDRY: TSMC 4nm/3nm for NVIDIA/AMD GPU dies — exact fab locations
- HBM MEMORY: HBM3/HBM3e (SK Hynix, Samsung, Micron) — fab locations
- PACKAGING: CoWoS/advanced packaging (TSMC, ASE) — critical bottleneck
- INTERCONNECTS: fiber optic (Corning), PCBs, high-speed connectors
MIDSTREAM (manufacturing → assembly):
- NETWORKING: InfiniBand/Ethernet (Mellanox, Broadcom, Arista) — NVLink, NVSwitch
- SERVERS: server OEMs (Dell, HPE, Supermicro) — rack assembly locations
- ENERGY: power supply contracts, cooling solutions for data centers
DOWNSTREAM (logistics → distribution → retail):
- DATA CENTERS: hyperscaler deployments (Microsoft, Meta, Google, Amazon) — DC locations
- CLOUD API: cloud AI services built on the hardware
- ENTERPRISE: enterprise AI customers, sovereign AI programs
- END MARKETS: geographic distribution of compute demand
Include facilities for fabs, packaging plants, assembly locations, AND data centers.
Critical chokepoints: TSMC Taiwan concentration, CoWoS bottleneck, HBM supply constraint.`,

  manufacturing_auto: `
SECTOR-SPECIFIC: MANUFACTURING & AUTOMOTIVE
Research the FULL vehicle lifecycle — raw materials to dealerships:
UPSTREAM (extraction → component):
- RAW MATERIALS: lithium mines (Albemarle, SQM), cobalt (Glencore), nickel, graphite, steel mills, aluminum smelters
- BATTERIES: cell manufacturers (CATL, BYD, Panasonic, LG Energy) — gigafactory locations
- SEMICONDUCTORS: automotive chips (Infineon, NXP, STMicro, ON Semi, TI)
- TIER-1 PARTS: powertrain, chassis, body, electronics, interior suppliers (Denso, Continental, Bosch)
MIDSTREAM (manufacturing → assembly):
- ASSEMBLY PLANTS: ALL major assembly/manufacturing plant locations with production volumes
- Company's OWN plants AND contract assembly partners
- Paint, stamping, welding, final assembly lines
DOWNSTREAM (logistics → distribution → retail):
- LOGISTICS: rail yards, vehicle carrier fleets, port vehicle terminals
- DISTRIBUTION: regional vehicle distribution centers, prep centers
- DEALERS: major dealership networks by region, direct sales channels
- END MARKETS: geographic market share (US, Europe, China, etc.)
Include facilities for EVERY assembly plant AND distribution center.
Routes: mine→parts→assembly→logistics→dealer with real waypoints.`,

  consumer_retail: `
SECTOR-SPECIFIC: CONSUMER & RETAIL
Research the FULL retail chain — raw materials to consumer doorstep:
UPSTREAM (extraction → component):
- RAW MATERIALS: cotton farms, plastics, food ingredients, minerals — origin countries & cities
- MANUFACTURING: factory locations (China, Vietnam, Bangladesh, Indonesia) with product categories
MIDSTREAM (manufacturing → assembly):
- CONTRACT MFG: private-label manufacturers, branded goods factories — exact locations
- QUALITY/PACKAGING: inspection, packaging, labeling facilities
DOWNSTREAM (logistics → distribution → retail):
- SHIPPING: ocean carriers (Maersk, MSC, CMA CGM), import ports, customs bonded warehouses
- DISTRIBUTION: ALL distribution center / fulfillment center locations with capacities
- LAST-MILE: delivery partners (UPS, FedEx, USPS, gig delivery)
- RETAIL: store locations by region, e-commerce platforms, marketplace channels
- END MARKETS: consumer demographics by geography
Include facilities for ALL distribution centers, warehouses, and major stores.
Label each node with its lifecycle stage. Include import origin routes with port waypoints.`,

  energy_materials: `
SECTOR-SPECIFIC: ENERGY & MATERIALS
Research the FULL extraction-to-end-user chain:
UPSTREAM (extraction):
- EXTRACTION: mine sites, oil/gas fields, well locations — production volumes
- EQUIPMENT: drilling (Schlumberger, Halliburton), mining (Caterpillar, Komatsu)
MIDSTREAM (manufacturing → processing):
- REFINING: refineries, smelters, processing plants — locations and capacity
- CHEMICALS: downstream chemical plants, speciality processors
- STORAGE: storage terminals, tank farms, strategic reserves
DOWNSTREAM (logistics → distribution → retail):
- TRANSPORT: pipeline networks, tanker routes, rail lines, truck fleets
- DISTRIBUTION: wholesale distributors, trading hubs, commodity exchanges
- RETAIL: gas stations, industrial customers, power plants, chemical end-users
- END MARKETS: geographic demand distribution
Include facilities for extraction sites, refineries, storage terminals, AND distribution hubs.
Routes: wellhead/mine→pipeline/tanker→refinery→storage→distribution with real waypoints.
Chokepoints: Strait of Hormuz, Suez Canal, pipeline bottlenecks, port congestion.`,

  pharma: `
SECTOR-SPECIFIC: PHARMACEUTICALS & BIOTECH
Research the FULL drug lifecycle — raw materials to patient:
UPSTREAM (extraction → component):
- RAW MATERIALS: starting materials, intermediates, excipients — origin countries
- API MANUFACTURING: active pharmaceutical ingredient sources (India, China dominant)
- CDMO: contract development/manufacturing (Lonza, Samsung Biologics, WuXi)
MIDSTREAM (manufacturing → assembly):
- FORMULATION: drug product manufacturing facilities — exact locations
- PACKAGING: primary (vials, syringes, blister packs) and secondary packaging
- QUALITY: FDA/EMA-approved facilities, GMP certification
DOWNSTREAM (logistics → distribution → retail):
- COLD CHAIN: temperature-controlled logistics providers (for biologics, vaccines)
- DISTRIBUTION: pharma wholesalers (McKesson, AmerisourceBergen, Cardinal Health)
- RETAIL: pharmacy chains (CVS, Walgreens, Rite Aid), hospital networks
- PATIENTS: end-market geography, disease prevalence regions
Include facilities for ALL manufacturing sites, wholesaler DCs, and pharmacy networks.
Critical: API concentration in India/China, cold-chain complexity, regulatory barriers.`,

  generic: `
SECTOR-SPECIFIC: GENERAL ANALYSIS
Research the FULL value chain — inputs through to end customers:
UPSTREAM: Identify ALL major suppliers, raw material sources, component makers (6+ nodes)
MIDSTREAM: Identify manufacturing/assembly facilities (company-owned + contract), processing plants (3+ nodes)
DOWNSTREAM: Identify distribution centers, logistics partners, retail channels, major customers, end markets (4+ nodes)
- For each node: what they supply/receive, from where, criticality, lifecycle stage
- For physical goods: map logistics routes with port/hub waypoints
- For services/digital: map infrastructure dependencies and customer deployments
- Include facilities where known (HQ, factories, warehouses, data centers)
- Label EVERY node with its supply chain stage
- Identify geographic concentration risks and single points of failure`,
};

// ── System prompt builder ───────────────────────────────────────────────────

function buildSystemPrompt(sectorType: SectorType): string {
  const sectorBlock = SECTOR_INSTRUCTIONS[sectorType];

  return `You are an expert supply chain intelligence analyst. Research the COMPLETE supply chain lifecycle for the given company — from raw material extraction all the way through to end customers.

RESEARCH WORKFLOW:
1. web_search to find suppliers, manufacturers, logistics, distribution, AND retail/customer info
2. get_company_info for key suppliers/customers to get their HQ location and financials
3. search_sec_filings for 10-K mentions of suppliers, vendors, customers, and risk factors
4. geocode_location for EVERY company/facility — do NOT guess lat/lng coordinates
5. For critical suppliers, research their sub-suppliers (tier-2)
6. Research the DOWNSTREAM chain: where products go after manufacturing — distribution, retail, end markets
7. Identify all logistics chokepoints

SUPPLY CHAIN LIFECYCLE STAGES — label EVERY node with one:
- "extraction" = raw material sources: mines, farms, wells, chemical plants
- "component" = component/intermediate manufacturing: fabs, parts makers, sub-assemblies
- "manufacturing" = contract manufacturers, assembly plants (Foxconn, Pegatron, etc.)
- "company" = the target company's own facilities (HQ, internal manufacturing, R&D)
- "logistics" = ports, shipping lines, freight hubs, customs warehouses
- "distribution" = the company's warehouses, fulfillment centers, regional DCs
- "retail" = retail channels, enterprise customers, end-market geography

IMPORTANT: Use geocode_location for each location. Example: geocode_location("TSMC Hsinchu Taiwan").
${sectorBlock}

When research is complete, output ONLY a valid JSON object (no markdown, no explanation):
{
  "company": { "ticker": "...", "name": "...", "sector": "..." },
  "nodes": [
    {
      "id": "unique_id",
      "name": "Company Name",
      "ticker": "TICK",
      "type": "supplier|customer|competitor|company",
      "tier": 0,
      "stage": "extraction|component|manufacturing|assembly|company|logistics|distribution|retail",
      "category": "semiconductors|display|assembly|logistics|materials|software|telecom|retail|chemicals|automotive|energy|memory|packaging|networking|cloud|payments|distribution|fulfillment|other",
      "location": { "country": "Country", "city": "City Name", "lat": 0.000, "lng": 0.000 },
      "revenueExposure": 45,
      "isCritical": false,
      "risk": "low|medium|high",
      "facilities": [
        { "name": "Fab 18", "type": "factory", "lat": 23.02, "lng": 120.21, "details": "3nm node, 55K wafers/month" },
        { "name": "Memphis DC", "type": "warehouse", "lat": 35.12, "lng": -89.97, "details": "1.2M sq ft fulfillment" }
      ]
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "from": "source_node_id",
      "to": "target_node_id",
      "relationship": "supplies advanced chips",
      "goods": "A18 Pro chips",
      "transportMode": "sea|rail|truck|air",
      "volume": "~15M units/quarter",
      "leadTime": "12-16 weeks",
      "route": [{"lat": 24.78, "lng": 120.97, "name": "Hsinchu"}, {"lat": 22.28, "lng": 114.16, "name": "Hong Kong Port"}, {"lat": 33.74, "lng": -118.26, "name": "Port of Long Beach"}]
    }
  ],
  "chokepoints": [
    { "name": "Taiwan Strait", "lat": 24.5, "lng": 119.5, "type": "strait", "affectedEdges": ["edge_1"], "risk": "High geopolitical risk" }
  ],
  "riskSummary": {
    "geopolitical": ["Taiwan Strait tensions threaten 90% of advanced chip supply"],
    "concentration": ["Single-source dependency on TSMC for leading-edge nodes"],
    "logistics": ["Trans-Pacific shipping delays averaging 2-3 weeks"]
  },
  "researchSummary": "2-3 sentence summary of key supply chain risks."
}

RULES:
- Tier 0 = the researched company, Tier 1 = direct suppliers/customers, Tier 2 = sub-suppliers
- The "stage" field is REQUIRED on every node — it tells the visualization where in the lifecycle to place it
- Use geocode_location for ALL locations — do NOT guess coordinates
- Include BALANCED nodes across the full lifecycle: at least 3 extraction/materials, 3 component, 2 manufacturing/assembly, 2 logistics/distribution, 2 customer/retail, and 2 competitors
- Edges should flow THROUGH stages: extraction→component→manufacturing→company→logistics→distribution→retail
- Include DOWNSTREAM nodes: warehouses, fulfillment centers, distribution hubs, retail channels, major end markets
- Include facilities array for companies with multiple important sites
- facility.type: hq, factory, warehouse, data-center, mine, port, refinery, assembly, logistics-hub
- For physical goods, provide route waypoints with real port/hub names
- isCritical = true if sole-source supplier OR >30% revenue dependency
- Risk = high if sole-source + geopolitically sensitive, medium if >20% concentration, low otherwise
- Include volume and leadTime on major supply edges where estimable`;
}

// ── Main research agent ─────────────────────────────────────────────────────

async function runResearchAgent(
  symbol: string,
  send: (event: object) => void
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    send({
      type: 'error',
      message: 'GEMINI_API_KEY is not configured. Add it to .env.local to enable AI research. Get a free key at https://aistudio.google.com/apikey',
    });
    return;
  }

  const sym = symbol.toUpperCase();

  // Check cache
  const cached = cache.get(sym);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    send({ type: 'status', message: 'Loaded from cache.' });
    send({ type: 'complete', data: cached.data });
    return;
  }

  send({ type: 'status', message: `Fetching ${sym} company profile from Yahoo Finance...` });
  let companyInfo: any = {};
  try {
    companyInfo = await toolGetCompanyInfo(sym);
    const name = (companyInfo as any).name ?? sym;
    send({ type: 'status', message: `Identified: ${name} · ${(companyInfo as any).sector ?? 'sector unknown'} · ${(companyInfo as any).industry ?? ''}` });
  } catch {
    send({ type: 'status', message: 'Profile fetch failed — continuing with model knowledge.' });
  }

  // Detect sector for tailored prompt
  const sectorType = detectSectorType(companyInfo.sector, companyInfo.industry, sym);
  send({ type: 'status', message: `Research strategy: ${sectorType.replace(/_/g, ' ').toUpperCase()}` });

  const systemPrompt = buildSystemPrompt(sectorType);

  const tools = [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for supply chain, supplier, logistics, or facility location information.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Search query' } },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_company_info',
        description: 'Get company profile, sector, HQ location, and financials from Yahoo Finance.',
        parameters: {
          type: 'object',
          properties: { ticker: { type: 'string', description: 'Stock ticker symbol' } },
          required: ['ticker'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_sec_filings',
        description: 'Search SEC EDGAR 10-K filings for mentions of suppliers, vendors, risk factors, and manufacturing details.',
        parameters: {
          type: 'object',
          properties: {
            company: { type: 'string', description: 'Company name to search filings for' },
            terms:   { type: 'string', description: 'Keywords to find (e.g. "suppliers manufacturers vendors facilities")' },
          },
          required: ['company'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'geocode_location',
        description: 'Convert a place name, city, or facility address to geographic coordinates (lat/lng). Use for EVERY supplier/facility location — do not guess coordinates.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Location to geocode, e.g. "Hsinchu, Taiwan" or "TSMC Fab 18, Tainan, Taiwan" or "Port of Long Beach, California"' } },
          required: ['query'],
        },
      },
    },
  ];

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Research the complete supply chain for ${sym}. Company data: ${JSON.stringify(companyInfo)}. Use all four tools thoroughly — especially geocode_location for every location. Then output the final JSON.`,
    },
  ];

  const MAX_ITERATIONS = 20; // more iterations for deeper research
  let iter = 0;

  while (iter++ < MAX_ITERATIONS) {
    send({ type: 'status', message: `Gemini reasoning — step ${iter}/${MAX_ITERATIONS}` });

    let response: any;
    try {
      response = await callGemini(apiKey, messages, tools);
    } catch (e: any) {
      send({ type: 'error', message: `Gemini error: ${e.message}` });
      return;
    }

    const choice = response.choices?.[0];
    if (!choice) { send({ type: 'error', message: 'No response from Gemini.' }); return; }

    const msg = choice.message;
    messages.push(msg);

    // ── Tool calls ──
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        const name = tc.function.name;
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* ignore */ }

        send({ type: 'tool_call', name, args });

        let result = '';
        try {
          if (name === 'web_search') {
            result = await toolWebSearch(args.query ?? '');
          } else if (name === 'get_company_info') {
            result = JSON.stringify(await toolGetCompanyInfo(args.ticker ?? ''));
          } else if (name === 'search_sec_filings') {
            result = await toolSearchSecFilings(args.company ?? '', args.terms ?? 'suppliers manufacturers vendors');
          } else if (name === 'geocode_location') {
            result = await toolGeocodeLocation(args.query ?? '');
          } else {
            result = 'Unknown tool';
          }
        } catch (e: any) {
          result = `Tool error: ${e.message}`;
        }

        send({ type: 'tool_result', name, summary: result.slice(0, 250) });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
      continue;
    }

    // ── Final text response — try JSON extraction ──
    const content: string = msg.content ?? '';
    const parsed = extractJSON(content);

    if (parsed && parsed.nodes && parsed.edges) {
      const research = validateResearch(parsed, sym);
      cache.set(sym, { data: research, ts: Date.now() });
      send({ type: 'complete', data: research });
      return;
    }

    // Model didn't output JSON yet — prompt it
    send({ type: 'status', message: 'Structuring research into JSON format...' });
    messages.push({
      role: 'user',
      content: 'Now output the complete research findings as the required JSON object. No markdown, no explanation — ONLY valid JSON.',
    });
  }

  send({ type: 'error', message: 'Research did not complete after maximum iterations. Try again.' });
}

// ── SSE Route ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get('symbol') ?? 'AAPL').trim().toUpperCase();

  const encoder = new TextEncoder();
  let ctrl: ReadableStreamDefaultController<Uint8Array>;

  function send(event: object) {
    try {
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch { /* stream already closed */ }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      ctrl = controller;
      try {
        await runResearchAgent(symbol, send);
      } catch (e: any) {
        send({ type: 'error', message: e.message });
      } finally {
        try { controller.close(); } catch { /* ignore */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
