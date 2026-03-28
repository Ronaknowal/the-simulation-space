import { NextRequest, NextResponse } from 'next/server';
import { SupplyChainData, SupplyChainNode, SupplyChainEdge } from '@/components/terminal/types';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://finance.yahoo.com',
  Referer: 'https://finance.yahoo.com/',
};

// ── Verified hardcoded chains ─────────────────────────────────────────────────

const SUPPLY_CHAINS: Record<string, SupplyChainData> = {
  AAPL: {
    nodes: [
      { id: 'TSM', name: 'TSMC', type: 'supplier', ticker: 'TSM', exposure: 90, sector: 'Semiconductors', description: 'Primary chip fabrication' },
      { id: 'HON2317', name: 'Foxconn', type: 'supplier', ticker: '2317.TW', exposure: 45, sector: 'Electronics', description: 'Final assembly' },
      { id: 'SMSN', name: 'Samsung', type: 'supplier', ticker: '005930.KS', exposure: 22, sector: 'Technology', description: 'OLED displays & memory' },
      { id: 'GLW', name: 'Corning', type: 'supplier', ticker: 'GLW', exposure: 18, sector: 'Materials', description: 'Ceramic Shield glass' },
      { id: 'MU', name: 'Micron', type: 'supplier', ticker: 'MU', exposure: 15, sector: 'Semiconductors', description: 'DRAM & NAND flash' },
      { id: 'AAPL', name: 'Apple Inc.', type: 'company', ticker: 'AAPL', sector: 'Technology', description: 'Consumer electronics & software' },
      { id: 'T', name: 'AT&T', type: 'customer', ticker: 'T', exposure: 12, sector: 'Telecom', description: 'iPhone carrier partner' },
      { id: 'VZ', name: 'Verizon', type: 'customer', ticker: 'VZ', exposure: 10, sector: 'Telecom', description: 'iPhone carrier partner' },
      { id: 'AMZN', name: 'Amazon', type: 'customer', ticker: 'AMZN', exposure: 8, sector: 'Retail', description: 'Device distribution' },
      { id: 'WMT', name: 'Walmart', type: 'customer', ticker: 'WMT', exposure: 5, sector: 'Retail', description: 'Retail distribution' },
    ],
    edges: [
      { source: 'TSM', target: 'AAPL', label: 'A-series chips' },
      { source: 'HON2317', target: 'AAPL', label: 'Final assembly' },
      { source: 'SMSN', target: 'AAPL', label: 'Displays & memory' },
      { source: 'GLW', target: 'AAPL', label: 'Glass' },
      { source: 'MU', target: 'AAPL', label: 'Flash storage' },
      { source: 'AAPL', target: 'T', label: 'iPhone distribution' },
      { source: 'AAPL', target: 'VZ', label: 'iPhone distribution' },
      { source: 'AAPL', target: 'AMZN', label: 'Retail' },
      { source: 'AAPL', target: 'WMT', label: 'Retail' },
    ],
  },
  MSFT: {
    nodes: [
      { id: 'TSM', name: 'TSMC', type: 'supplier', ticker: 'TSM', exposure: 40, sector: 'Semiconductors', description: 'Custom silicon fab' },
      { id: 'INTC', name: 'Intel', type: 'supplier', ticker: 'INTC', exposure: 30, sector: 'Semiconductors', description: 'Server CPUs' },
      { id: 'NVDA', name: 'NVIDIA', type: 'supplier', ticker: 'NVDA', exposure: 45, sector: 'Semiconductors', description: 'AI accelerators' },
      { id: 'MU', name: 'Micron', type: 'supplier', ticker: 'MU', exposure: 20, sector: 'Semiconductors', description: 'Server DRAM' },
      { id: 'MSFT', name: 'Microsoft', type: 'company', ticker: 'MSFT', sector: 'Technology' },
      { id: 'AMZN', name: 'Amazon', type: 'customer', ticker: 'AMZN', exposure: 15, sector: 'Technology', description: 'Azure/AWS hybrid' },
      { id: 'SAP', name: 'SAP', type: 'customer', ticker: 'SAP', exposure: 10, sector: 'Software', description: 'Enterprise integration' },
      { id: 'ORCL', name: 'Oracle', type: 'customer', ticker: 'ORCL', exposure: 8, sector: 'Software', description: 'Database partner' },
      { id: 'CRM', name: 'Salesforce', type: 'customer', ticker: 'CRM', exposure: 6, sector: 'Software', description: 'Teams integration' },
    ],
    edges: [
      { source: 'TSM', target: 'MSFT', label: 'Custom silicon' },
      { source: 'INTC', target: 'MSFT', label: 'Server CPUs' },
      { source: 'NVDA', target: 'MSFT', label: 'AI/HPC GPUs' },
      { source: 'MU', target: 'MSFT', label: 'Memory modules' },
      { source: 'MSFT', target: 'AMZN', label: 'Cloud services' },
      { source: 'MSFT', target: 'SAP', label: 'Enterprise software' },
      { source: 'MSFT', target: 'ORCL', label: 'DB integration' },
      { source: 'MSFT', target: 'CRM', label: 'CRM integration' },
    ],
  },
  NVDA: {
    nodes: [
      { id: 'TSM', name: 'TSMC', type: 'supplier', ticker: 'TSM', exposure: 92, sector: 'Semiconductors', description: 'Sole GPU fab partner' },
      { id: 'HKI', name: 'SK Hynix', type: 'supplier', ticker: '000660.KS', exposure: 40, sector: 'Memory', description: 'HBM memory' },
      { id: 'MU', name: 'Micron', type: 'supplier', ticker: 'MU', exposure: 30, sector: 'Semiconductors', description: 'GDDR memory' },
      { id: 'SMSN', name: 'Samsung', type: 'supplier', ticker: '005930.KS', exposure: 25, sector: 'Technology', description: 'HBM3E memory' },
      { id: 'NVDA', name: 'NVIDIA', type: 'company', ticker: 'NVDA', sector: 'Semiconductors' },
      { id: 'MSFT', name: 'Microsoft', type: 'customer', ticker: 'MSFT', exposure: 15, sector: 'Technology', description: 'Azure AI infrastructure' },
      { id: 'AMZN', name: 'Amazon', type: 'customer', ticker: 'AMZN', exposure: 12, sector: 'Technology', description: 'AWS AI clusters' },
      { id: 'GOOGL', name: 'Alphabet', type: 'customer', ticker: 'GOOGL', exposure: 10, sector: 'Technology', description: 'GCP AI training' },
      { id: 'META', name: 'Meta', type: 'customer', ticker: 'META', exposure: 8, sector: 'Technology', description: 'LLM training' },
    ],
    edges: [
      { source: 'TSM', target: 'NVDA', label: 'GPU wafers (sole fab)' },
      { source: 'HKI', target: 'NVDA', label: 'HBM memory' },
      { source: 'MU', target: 'NVDA', label: 'GDDR6X' },
      { source: 'SMSN', target: 'NVDA', label: 'HBM3E memory' },
      { source: 'NVDA', target: 'MSFT', label: 'H100/H200 clusters' },
      { source: 'NVDA', target: 'AMZN', label: 'H100/H200 clusters' },
      { source: 'NVDA', target: 'GOOGL', label: 'A100/H100' },
      { source: 'NVDA', target: 'META', label: 'H100 AI training' },
    ],
  },
  TSLA: {
    nodes: [
      { id: 'CATL', name: 'CATL', type: 'supplier', ticker: '300750.SZ', exposure: 40, sector: 'Battery', description: 'LFP battery cells (China)' },
      { id: 'PANE', name: 'Panasonic', type: 'supplier', ticker: '6752.T', exposure: 30, sector: 'Battery', description: '2170/4680 cells (US)' },
      { id: 'LGENG', name: 'LG Energy', type: 'supplier', ticker: '373220.KS', exposure: 15, sector: 'Battery', description: 'Cylindrical cells' },
      { id: 'SMSN', name: 'Samsung SDI', type: 'supplier', ticker: '006400.KS', exposure: 10, sector: 'Battery', description: 'Prismatic cells' },
      { id: 'TSLA', name: 'Tesla Inc.', type: 'company', ticker: 'TSLA', sector: 'Automotive' },
      { id: 'UBER', name: 'Uber', type: 'customer', ticker: 'UBER', exposure: 5, sector: 'Transport', description: 'Robotaxi partnership' },
      { id: 'HERT', name: 'Hertz', type: 'customer', ticker: 'HTZ', exposure: 3, sector: 'Rental', description: 'Fleet purchase' },
      { id: 'PCG', name: 'PG&E', type: 'customer', ticker: 'PCG', exposure: 2, sector: 'Utilities', description: 'Powerwall/Megapack' },
    ],
    edges: [
      { source: 'CATL', target: 'TSLA', label: 'LFP cells' },
      { source: 'PANE', target: 'TSLA', label: '2170/4680 cells' },
      { source: 'LGENG', target: 'TSLA', label: 'Cylindrical cells' },
      { source: 'SMSN', target: 'TSLA', label: 'Prismatic cells' },
      { source: 'TSLA', target: 'UBER', label: 'FSD robotaxi' },
      { source: 'TSLA', target: 'HERT', label: 'Fleet vehicles' },
      { source: 'TSLA', target: 'PCG', label: 'Energy storage' },
    ],
  },
  AMZN: {
    nodes: [
      { id: 'NVDA', name: 'NVIDIA', type: 'supplier', ticker: 'NVDA', exposure: 30, sector: 'Semiconductors', description: 'GPU accelerators' },
      { id: 'INTC', name: 'Intel', type: 'supplier', ticker: 'INTC', exposure: 20, sector: 'Semiconductors', description: 'Xeon server CPUs' },
      { id: 'UPS', name: 'UPS', type: 'supplier', ticker: 'UPS', exposure: 15, sector: 'Logistics', description: 'Package delivery' },
      { id: 'FDX', name: 'FedEx', type: 'supplier', ticker: 'FDX', exposure: 10, sector: 'Logistics', description: 'Express shipping' },
      { id: 'AMZN', name: 'Amazon', type: 'company', ticker: 'AMZN', sector: 'Technology/Retail' },
      { id: 'MSFT', name: 'Microsoft', type: 'customer', ticker: 'MSFT', exposure: 8, sector: 'Technology', description: 'AWS enterprise' },
      { id: 'NFLX', name: 'Netflix', type: 'customer', ticker: 'NFLX', exposure: 5, sector: 'Media', description: 'AWS cloud infra' },
      { id: 'MCD', name: "McDonald's", type: 'customer', ticker: 'MCD', exposure: 3, sector: 'Restaurants', description: 'AWS enterprise' },
    ],
    edges: [
      { source: 'NVDA', target: 'AMZN', label: 'AI accelerators' },
      { source: 'INTC', target: 'AMZN', label: 'Server CPUs' },
      { source: 'UPS', target: 'AMZN', label: 'Delivery partner' },
      { source: 'FDX', target: 'AMZN', label: 'Express delivery' },
      { source: 'AMZN', target: 'MSFT', label: 'AWS enterprise' },
      { source: 'AMZN', target: 'NFLX', label: 'Cloud streaming' },
      { source: 'AMZN', target: 'MCD', label: 'AWS cloud' },
    ],
  },
  GOOGL: {
    nodes: [
      { id: 'TSM', name: 'TSMC', type: 'supplier', ticker: 'TSM', exposure: 50, sector: 'Semiconductors', description: 'TPU fabrication' },
      { id: 'SMSN', name: 'Samsung', type: 'supplier', ticker: '005930.KS', exposure: 30, sector: 'Technology', description: 'Server memory' },
      { id: 'WDC', name: 'Western Digital', type: 'supplier', ticker: 'WDC', exposure: 15, sector: 'Storage', description: 'Data center HDDs' },
      { id: 'GOOGL', name: 'Alphabet', type: 'company', ticker: 'GOOGL', sector: 'Technology' },
      { id: 'META', name: 'Meta', type: 'customer', ticker: 'META', exposure: 10, sector: 'Social', description: 'Google Ads' },
      { id: 'AMZN', name: 'Amazon', type: 'customer', ticker: 'AMZN', exposure: 8, sector: 'Retail', description: 'Google Search/Ads' },
      { id: 'NFLX', name: 'Netflix', type: 'customer', ticker: 'NFLX', exposure: 5, sector: 'Media', description: 'YouTube/Ads' },
    ],
    edges: [
      { source: 'TSM', target: 'GOOGL', label: 'TPU chips' },
      { source: 'SMSN', target: 'GOOGL', label: 'Server memory' },
      { source: 'WDC', target: 'GOOGL', label: 'Storage' },
      { source: 'GOOGL', target: 'META', label: 'Ad auctions' },
      { source: 'GOOGL', target: 'AMZN', label: 'Product search ads' },
      { source: 'GOOGL', target: 'NFLX', label: 'YouTube integration' },
    ],
  },
  META: {
    nodes: [
      { id: 'TSM', name: 'TSMC', type: 'supplier', ticker: 'TSM', exposure: 55, sector: 'Semiconductors', description: 'Custom MTIA silicon' },
      { id: 'NVDA', name: 'NVIDIA', type: 'supplier', ticker: 'NVDA', exposure: 50, sector: 'Semiconductors', description: 'AI training GPUs' },
      { id: 'INTC', name: 'Intel', type: 'supplier', ticker: 'INTC', exposure: 20, sector: 'Semiconductors', description: 'Server infrastructure' },
      { id: 'META', name: 'Meta', type: 'company', ticker: 'META', sector: 'Technology' },
      { id: 'GOOGL', name: 'Alphabet', type: 'customer', ticker: 'GOOGL', exposure: 15, sector: 'Technology', description: 'Ad platform competitor/partner' },
      { id: 'WPP', name: 'WPP', type: 'customer', ticker: 'WPP', exposure: 12, sector: 'Advertising', description: 'Major ad buyer' },
      { id: 'AMZN', name: 'Amazon', type: 'customer', ticker: 'AMZN', exposure: 8, sector: 'Retail', description: 'Performance ad spend' },
    ],
    edges: [
      { source: 'TSM', target: 'META', label: 'MTIA AI chips' },
      { source: 'NVDA', target: 'META', label: 'AI training clusters' },
      { source: 'INTC', target: 'META', label: 'Data center CPUs' },
      { source: 'META', target: 'GOOGL', label: 'Cross-platform ads' },
      { source: 'META', target: 'WPP', label: 'Ad inventory' },
      { source: 'META', target: 'AMZN', label: 'Performance ads' },
    ],
  },
  AMD: {
    nodes: [
      { id: 'TSM', name: 'TSMC', type: 'supplier', ticker: 'TSM', exposure: 95, sector: 'Semiconductors', description: 'Sole fabrication partner' },
      { id: 'ASMLD', name: 'ASML', type: 'supplier', ticker: 'ASML', exposure: 30, sector: 'Equipment', description: 'EUV lithography' },
      { id: 'MU', name: 'Micron', type: 'supplier', ticker: 'MU', exposure: 20, sector: 'Memory', description: 'HBM memory for GPUs' },
      { id: 'AMD', name: 'AMD', type: 'company', ticker: 'AMD', sector: 'Semiconductors' },
      { id: 'MSFT', name: 'Microsoft', type: 'customer', ticker: 'MSFT', exposure: 20, sector: 'Technology', description: 'Azure EPYC servers' },
      { id: 'AMZN', name: 'Amazon', type: 'customer', ticker: 'AMZN', exposure: 18, sector: 'Technology', description: 'AWS EPYC/Instinct' },
      { id: 'GOOGL', name: 'Alphabet', type: 'customer', ticker: 'GOOGL', exposure: 12, sector: 'Technology', description: 'GCP Milan/Genoa' },
      { id: 'META', name: 'Meta', type: 'customer', ticker: 'META', exposure: 8, sector: 'Technology', description: 'MI300X AI training' },
    ],
    edges: [
      { source: 'TSM', target: 'AMD', label: 'CPU/GPU wafers' },
      { source: 'ASMLD', target: 'AMD', label: 'Lithography' },
      { source: 'MU', target: 'AMD', label: 'HBM memory' },
      { source: 'AMD', target: 'MSFT', label: 'EPYC + Instinct' },
      { source: 'AMD', target: 'AMZN', label: 'EPYC cloud CPUs' },
      { source: 'AMD', target: 'GOOGL', label: 'EPYC servers' },
      { source: 'AMD', target: 'META', label: 'MI300X clusters' },
    ],
  },
  INTC: {
    nodes: [
      { id: 'ASMLD', name: 'ASML', type: 'supplier', ticker: 'ASML', exposure: 40, sector: 'Equipment', description: 'EUV lithography systems' },
      { id: 'AMAT', name: 'Applied Matls', type: 'supplier', ticker: 'AMAT', exposure: 25, sector: 'Equipment', description: 'Deposition equipment' },
      { id: 'LRCX', name: 'Lam Research', type: 'supplier', ticker: 'LRCX', exposure: 20, sector: 'Equipment', description: 'Etch equipment' },
      { id: 'INTC', name: 'Intel', type: 'company', ticker: 'INTC', sector: 'Semiconductors' },
      { id: 'DELL', name: 'Dell', type: 'customer', ticker: 'DELL', exposure: 25, sector: 'Computing', description: 'Server/PC OEM' },
      { id: 'HPQ', name: 'HP Inc.', type: 'customer', ticker: 'HPQ', exposure: 18, sector: 'Computing', description: 'PC OEM' },
      { id: 'LENOV', name: 'Lenovo', type: 'customer', exposure: 15, sector: 'Computing', description: 'PC OEM (largest Intel buyer)' },
    ],
    edges: [
      { source: 'ASMLD', target: 'INTC', label: 'EUV scanners' },
      { source: 'AMAT', target: 'INTC', label: 'CVD tools' },
      { source: 'LRCX', target: 'INTC', label: 'Etch systems' },
      { source: 'INTC', target: 'DELL', label: 'Xeon + Core' },
      { source: 'INTC', target: 'HPQ', label: 'PC/workstation CPUs' },
      { source: 'INTC', target: 'LENOV', label: 'Core CPU supply' },
    ],
  },
  JPM: {
    nodes: [
      { id: 'MSFT', name: 'Microsoft', type: 'supplier', ticker: 'MSFT', exposure: 35, sector: 'Technology', description: 'Azure cloud infra' },
      { id: 'ORCL', name: 'Oracle', type: 'supplier', ticker: 'ORCL', exposure: 20, sector: 'Technology', description: 'Database & ERP' },
      { id: 'IBM', name: 'IBM', type: 'supplier', ticker: 'IBM', exposure: 15, sector: 'Technology', description: 'Mainframe & consulting' },
      { id: 'JPM', name: 'JPMorgan', type: 'company', ticker: 'JPM', sector: 'Financial Services' },
      { id: 'GS', name: 'Goldman Sachs', type: 'customer', ticker: 'GS', exposure: 20, sector: 'Finance', description: 'Interbank markets' },
      { id: 'BAC', name: 'Bank of America', type: 'customer', ticker: 'BAC', exposure: 18, sector: 'Finance', description: 'Correspondent banking' },
      { id: 'BLK', name: 'BlackRock', type: 'customer', ticker: 'BLK', exposure: 12, sector: 'Asset Mgmt', description: 'Prime brokerage' },
    ],
    edges: [
      { source: 'MSFT', target: 'JPM', label: 'Cloud infrastructure' },
      { source: 'ORCL', target: 'JPM', label: 'Core banking DB' },
      { source: 'IBM', target: 'JPM', label: 'Mainframe ops' },
      { source: 'JPM', target: 'GS', label: 'Capital markets' },
      { source: 'JPM', target: 'BAC', label: 'Interbank' },
      { source: 'JPM', target: 'BLK', label: 'Prime brokerage' },
    ],
  },
  NFLX: {
    nodes: [
      { id: 'AMZN', name: 'Amazon AWS', type: 'supplier', ticker: 'AMZN', exposure: 70, sector: 'Technology', description: 'Primary cloud/CDN infra' },
      { id: 'GOOGL', name: 'Google Cloud', type: 'supplier', ticker: 'GOOGL', exposure: 15, sector: 'Technology', description: 'Secondary cloud' },
      { id: 'DIS', name: 'Disney', type: 'supplier', ticker: 'DIS', exposure: 10, sector: 'Media', description: 'Content licensing' },
      { id: 'NFLX', name: 'Netflix', type: 'company', ticker: 'NFLX', sector: 'Entertainment' },
      { id: 'AAPL', name: 'Apple', type: 'customer', ticker: 'AAPL', exposure: 20, sector: 'Technology', description: 'Apple TV+ partner/rival' },
      { id: 'GOOGL2', name: 'Google/Android', type: 'customer', ticker: 'GOOGL', exposure: 35, sector: 'Technology', description: 'Android subscribers' },
      { id: 'CMCSA', name: 'Comcast', type: 'customer', ticker: 'CMCSA', exposure: 8, sector: 'Telecom', description: 'Bundle partner' },
    ],
    edges: [
      { source: 'AMZN', target: 'NFLX', label: 'AWS streaming infra' },
      { source: 'GOOGL', target: 'NFLX', label: 'Cloud services' },
      { source: 'DIS', target: 'NFLX', label: 'Licensed content' },
      { source: 'NFLX', target: 'AAPL', label: 'Apple TV app' },
      { source: 'NFLX', target: 'GOOGL2', label: 'Android/Smart TV' },
      { source: 'NFLX', target: 'CMCSA', label: 'Xfinity bundle' },
    ],
  },
  TSM: {
    nodes: [
      { id: 'ASMLD', name: 'ASML', type: 'supplier', ticker: 'ASML', exposure: 45, sector: 'Equipment', description: 'EUV scanners (sole source)' },
      { id: 'AMAT', name: 'Applied Matls', type: 'supplier', ticker: 'AMAT', exposure: 30, sector: 'Equipment', description: 'Deposition/etch tools' },
      { id: 'KLAC', name: 'KLA Corp', type: 'supplier', ticker: 'KLAC', exposure: 20, sector: 'Equipment', description: 'Inspection systems' },
      { id: 'TSM', name: 'TSMC', type: 'company', ticker: 'TSM', sector: 'Semiconductors' },
      { id: 'AAPL', name: 'Apple', type: 'customer', ticker: 'AAPL', exposure: 25, sector: 'Technology', description: 'A-series/M-series chips' },
      { id: 'NVDA', name: 'NVIDIA', type: 'customer', ticker: 'NVDA', exposure: 20, sector: 'Semiconductors', description: 'GPU wafers' },
      { id: 'AMD', name: 'AMD', type: 'customer', ticker: 'AMD', exposure: 15, sector: 'Semiconductors', description: 'CPU/GPU wafers' },
      { id: 'QCOM', name: 'Qualcomm', type: 'customer', ticker: 'QCOM', exposure: 12, sector: 'Semiconductors', description: 'Snapdragon SoCs' },
    ],
    edges: [
      { source: 'ASMLD', target: 'TSM', label: 'EUV scanners' },
      { source: 'AMAT', target: 'TSM', label: 'Process equipment' },
      { source: 'KLAC', target: 'TSM', label: 'Yield inspection' },
      { source: 'TSM', target: 'AAPL', label: '3nm/5nm chips' },
      { source: 'TSM', target: 'NVDA', label: '4nm GPUs' },
      { source: 'TSM', target: 'AMD', label: '4nm CPU/GPU' },
      { source: 'TSM', target: 'QCOM', label: 'Mobile SoCs' },
    ],
  },
};

// ── Sector-based templates for dynamic generation ─────────────────────────────

interface SectorTemplate {
  suppliers: Array<Omit<SupplyChainNode, 'id' | 'type'>>;
  customers: Array<Omit<SupplyChainNode, 'id' | 'type'>>;
  label: string;
}

const SECTOR_TEMPLATES: Record<string, SectorTemplate> = {
  Technology: {
    label: 'Technology',
    suppliers: [
      { name: 'TSMC', ticker: 'TSM', exposure: 40, sector: 'Semiconductors', description: 'Chip fabrication' },
      { name: 'NVIDIA', ticker: 'NVDA', exposure: 35, sector: 'Semiconductors', description: 'AI/GPU accelerators' },
      { name: 'Intel', ticker: 'INTC', exposure: 20, sector: 'Semiconductors', description: 'Server CPUs' },
    ],
    customers: [
      { name: 'Amazon', ticker: 'AMZN', exposure: 20, sector: 'Technology', description: 'Enterprise/cloud' },
      { name: 'Microsoft', ticker: 'MSFT', exposure: 15, sector: 'Technology', description: 'Enterprise software' },
      { name: 'Alphabet', ticker: 'GOOGL', exposure: 10, sector: 'Technology', description: 'Cloud/search' },
    ],
  },
  'Consumer Cyclical': {
    label: 'Consumer Cyclical',
    suppliers: [
      { name: 'UPS', ticker: 'UPS', exposure: 25, sector: 'Logistics', description: 'Parcel delivery' },
      { name: 'FedEx', ticker: 'FDX', exposure: 20, sector: 'Logistics', description: 'Express shipping' },
      { name: 'Procter & Gamble', ticker: 'PG', exposure: 15, sector: 'Consumer', description: 'Input goods' },
    ],
    customers: [
      { name: 'Walmart', ticker: 'WMT', exposure: 25, sector: 'Retail', description: 'Mass-market retail' },
      { name: 'Amazon', ticker: 'AMZN', exposure: 20, sector: 'E-commerce', description: 'Online marketplace' },
      { name: 'Target', ticker: 'TGT', exposure: 10, sector: 'Retail', description: 'Retail distribution' },
    ],
  },
  'Consumer Defensive': {
    label: 'Consumer Defensive',
    suppliers: [
      { name: 'Archer-Daniels', ticker: 'ADM', exposure: 30, sector: 'Agriculture', description: 'Agricultural inputs' },
      { name: 'Packaging Corp', ticker: 'PKG', exposure: 20, sector: 'Materials', description: 'Packaging materials' },
      { name: 'Sysco', ticker: 'SYY', exposure: 15, sector: 'Distribution', description: 'Food distribution' },
    ],
    customers: [
      { name: 'Walmart', ticker: 'WMT', exposure: 30, sector: 'Retail', description: 'Mass-market retail' },
      { name: 'Kroger', ticker: 'KR', exposure: 20, sector: 'Grocery', description: 'Grocery distribution' },
      { name: 'Costco', ticker: 'COST', exposure: 12, sector: 'Retail', description: 'Wholesale retail' },
    ],
  },
  'Financial Services': {
    label: 'Financial Services',
    suppliers: [
      { name: 'Microsoft', ticker: 'MSFT', exposure: 30, sector: 'Technology', description: 'Cloud & software' },
      { name: 'Oracle', ticker: 'ORCL', exposure: 20, sector: 'Technology', description: 'Core banking DB' },
      { name: 'Fiserv', ticker: 'FI', exposure: 15, sector: 'Fintech', description: 'Payment processing' },
    ],
    customers: [
      { name: 'BlackRock', ticker: 'BLK', exposure: 20, sector: 'Asset Mgmt', description: 'Institutional client' },
      { name: 'Vanguard', exposure: 15, sector: 'Asset Mgmt', description: 'Fund client' },
      { name: 'State Street', ticker: 'STT', exposure: 10, sector: 'Finance', description: 'Custodian partner' },
    ],
  },
  Healthcare: {
    label: 'Healthcare',
    suppliers: [
      { name: 'Thermo Fisher', ticker: 'TMO', exposure: 30, sector: 'Life Sciences', description: 'Lab equipment & reagents' },
      { name: 'McKesson', ticker: 'MCK', exposure: 25, sector: 'Distribution', description: 'Drug distribution' },
      { name: 'Cardinal Health', ticker: 'CAH', exposure: 20, sector: 'Distribution', description: 'Medical supply chain' },
    ],
    customers: [
      { name: 'CVS Health', ticker: 'CVS', exposure: 25, sector: 'Pharmacy', description: 'Retail pharmacy' },
      { name: 'Walgreens', ticker: 'WBA', exposure: 20, sector: 'Pharmacy', description: 'Retail pharmacy' },
      { name: 'UnitedHealth', ticker: 'UNH', exposure: 15, sector: 'Insurance', description: 'Payer/PBM' },
    ],
  },
  'Basic Materials': {
    label: 'Basic Materials',
    suppliers: [
      { name: 'Rio Tinto', ticker: 'RIO', exposure: 30, sector: 'Mining', description: 'Iron ore & aluminium' },
      { name: 'BHP Group', ticker: 'BHP', exposure: 25, sector: 'Mining', description: 'Diversified minerals' },
      { name: 'Air Products', ticker: 'APD', exposure: 15, sector: 'Chemicals', description: 'Industrial gases' },
    ],
    customers: [
      { name: 'Caterpillar', ticker: 'CAT', exposure: 20, sector: 'Industrials', description: 'Equipment manufacturer' },
      { name: 'Deere & Co.', ticker: 'DE', exposure: 15, sector: 'Industrials', description: 'Ag & construction' },
      { name: 'Nucor', ticker: 'NUE', exposure: 12, sector: 'Steel', description: 'Steel manufacturer' },
    ],
  },
  Industrials: {
    label: 'Industrials',
    suppliers: [
      { name: 'Honeywell', ticker: 'HON', exposure: 25, sector: 'Conglomerate', description: 'Process controls' },
      { name: 'Emerson Electric', ticker: 'EMR', exposure: 20, sector: 'Automation', description: 'Automation systems' },
      { name: 'Parker Hannifin', ticker: 'PH', exposure: 15, sector: 'Engineering', description: 'Motion control' },
    ],
    customers: [
      { name: 'Boeing', ticker: 'BA', exposure: 20, sector: 'Aerospace', description: 'Aerospace OEM' },
      { name: 'GE Aerospace', ticker: 'GE', exposure: 18, sector: 'Aerospace', description: 'Jet engine OEM' },
      { name: 'Lockheed Martin', ticker: 'LMT', exposure: 12, sector: 'Defense', description: 'Defense contractor' },
    ],
  },
  Energy: {
    label: 'Energy',
    suppliers: [
      { name: 'Halliburton', ticker: 'HAL', exposure: 25, sector: 'Oil Services', description: 'Drilling services' },
      { name: 'Schlumberger', ticker: 'SLB', exposure: 20, sector: 'Oil Services', description: 'Oilfield services' },
      { name: 'Baker Hughes', ticker: 'BKR', exposure: 15, sector: 'Oil Services', description: 'Equipment & services' },
    ],
    customers: [
      { name: 'Exxon Mobil', ticker: 'XOM', exposure: 20, sector: 'Energy', description: 'Upstream operations' },
      { name: 'Chevron', ticker: 'CVX', exposure: 18, sector: 'Energy', description: 'Upstream operations' },
      { name: 'Shell', ticker: 'SHEL', exposure: 12, sector: 'Energy', description: 'Downstream refining' },
    ],
  },
  'Communication Services': {
    label: 'Communication Services',
    suppliers: [
      { name: 'Ericsson', ticker: 'ERIC', exposure: 30, sector: 'Telecom Equip', description: '5G network equipment' },
      { name: 'Nokia', ticker: 'NOK', exposure: 25, sector: 'Telecom Equip', description: 'RAN infrastructure' },
      { name: 'Corning', ticker: 'GLW', exposure: 15, sector: 'Materials', description: 'Fiber optic cable' },
    ],
    customers: [
      { name: 'AT&T', ticker: 'T', exposure: 20, sector: 'Telecom', description: 'Wireless carrier' },
      { name: 'Verizon', ticker: 'VZ', exposure: 18, sector: 'Telecom', description: 'Wireless carrier' },
      { name: 'T-Mobile', ticker: 'TMUS', exposure: 15, sector: 'Telecom', description: 'Wireless carrier' },
    ],
  },
  Utilities: {
    label: 'Utilities',
    suppliers: [
      { name: 'GE Vernova', ticker: 'GEV', exposure: 25, sector: 'Energy Tech', description: 'Gas turbines & grid' },
      { name: 'Siemens Energy', ticker: 'SMNEY', exposure: 20, sector: 'Energy Tech', description: 'Transmission equipment' },
      { name: 'Quanta Services', ticker: 'PWR', exposure: 15, sector: 'Construction', description: 'Grid construction' },
    ],
    customers: [
      { name: 'Amazon', ticker: 'AMZN', exposure: 20, sector: 'Technology', description: 'Data center power' },
      { name: 'Microsoft', ticker: 'MSFT', exposure: 18, sector: 'Technology', description: 'Data center power' },
      { name: 'Google', ticker: 'GOOGL', exposure: 12, sector: 'Technology', description: 'Data center power' },
    ],
  },
  'Real Estate': {
    label: 'Real Estate',
    suppliers: [
      { name: 'CBRE Group', ticker: 'CBRE', exposure: 25, sector: 'RE Services', description: 'Property management' },
      { name: 'JLL', ticker: 'JLL', exposure: 20, sector: 'RE Services', description: 'Leasing & advisory' },
      { name: 'Prologis', ticker: 'PLD', exposure: 15, sector: 'Industrial REIT', description: 'Warehouse space' },
    ],
    customers: [
      { name: 'Amazon', ticker: 'AMZN', exposure: 25, sector: 'E-commerce', description: 'Fulfillment centers' },
      { name: 'Walmart', ticker: 'WMT', exposure: 18, sector: 'Retail', description: 'Retail/logistics space' },
      { name: 'FedEx', ticker: 'FDX', exposure: 12, sector: 'Logistics', description: 'Distribution hubs' },
    ],
  },
};

const DEFAULT_TEMPLATE: SectorTemplate = {
  label: 'General',
  suppliers: [
    { name: 'Primary Inputs', exposure: 30, sector: 'Materials/Services', description: 'Core input supplier' },
    { name: 'Technology Services', ticker: 'MSFT', exposure: 20, sector: 'Technology', description: 'Cloud & software' },
    { name: 'Logistics Partner', ticker: 'UPS', exposure: 15, sector: 'Logistics', description: 'Distribution' },
  ],
  customers: [
    { name: 'Enterprise Clients', exposure: 25, sector: 'Various', description: 'B2B customers' },
    { name: 'Retail Channel', ticker: 'WMT', exposure: 18, sector: 'Retail', description: 'Retail distribution' },
    { name: 'Online Channel', ticker: 'AMZN', exposure: 12, sector: 'E-commerce', description: 'Digital sales' },
  ],
};

function buildSectorChain(
  symbol: string,
  companyName: string,
  sector: string,
  industry: string,
): SupplyChainData & { isEstimated: boolean; estimatedBasis: string } {
  const template = SECTOR_TEMPLATES[sector] || DEFAULT_TEMPLATE;

  const centerNode: SupplyChainNode = {
    id: symbol,
    name: companyName || symbol,
    type: 'company',
    ticker: symbol,
    sector: sector || 'Unknown',
    description: industry || undefined,
  };

  const supplierNodes: SupplyChainNode[] = template.suppliers.map((s, i) => ({
    ...s,
    id: s.ticker || `${symbol}_sup${i}`,
    type: 'supplier' as const,
  }));

  const customerNodes: SupplyChainNode[] = template.customers.map((c, i) => ({
    ...c,
    id: c.ticker || `${symbol}_cus${i}`,
    type: 'customer' as const,
  }));

  const edges: SupplyChainEdge[] = [
    ...supplierNodes.map(n => ({ source: n.id, target: symbol, label: n.description })),
    ...customerNodes.map(n => ({ source: symbol, target: n.id, label: n.description })),
  ];

  return {
    nodes: [...supplierNodes, centerNode, ...customerNodes],
    edges,
    isEstimated: true,
    estimatedBasis: industry ? `${sector} / ${industry}` : sector,
  };
}

async function fetchSectorInfo(symbol: string): Promise<{ name: string; sector: string; industry: string }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile,quoteType`,
      {
        headers: {
          'User-Agent': YF_HEADERS['User-Agent'],
          Accept: YF_HEADERS.Accept,
          'Accept-Language': YF_HEADERS['Accept-Language'],
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return { name: symbol, sector: 'Technology', industry: '' };
    const data = await res.json();
    const r = data?.quoteSummary?.result?.[0];
    return {
      name: r?.quoteType?.shortName || r?.assetProfile?.longName || symbol,
      sector: r?.assetProfile?.sector || 'Technology',
      industry: r?.assetProfile?.industry || '',
    };
  } catch {
    return { name: symbol, sector: 'Technology', industry: '' };
  }
}

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get('symbol') || 'AAPL').toUpperCase().trim();

  const hardcoded = SUPPLY_CHAINS[symbol];
  if (hardcoded) {
    return NextResponse.json(hardcoded, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }

  // Dynamic: fetch sector from Yahoo Finance and build sector-based chain
  const { name, sector, industry } = await fetchSectorInfo(symbol);
  const chain = buildSectorChain(symbol, name, sector, industry);
  return NextResponse.json(chain, { headers: { 'Cache-Control': 'public, max-age=1800' } });
}
