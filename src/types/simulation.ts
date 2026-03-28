export interface SimConfig {
  agentCount: number;
  durationMinutes: number;
  focusSectors: string[];
  geographicScope: string[];
}

export interface AgentAction {
  agentId: string;
  agentRole: string;
  action: string;
  simulatedTime: string;
  timestamp: number;
}

export interface CascadeImpact {
  sector: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  affectedEntities: string[];
  confidence: number;
}

export interface MarketImpact {
  ticker: string;
  name: string;
  predictedChange: number;
  confidence: number;
  reasoning: string;
}

export interface SimulationState {
  id: string;
  seed: string;
  config: SimConfig;
  status: "configuring" | "running" | "completed" | "failed";
  agentCount: number;
  elapsed: number;
  progress: number;
  agentFeed: AgentAction[];
  impacts: CascadeImpact[];
  dependencyGraph: { nodes: unknown[]; edges: unknown[] };
  marketImpacts: MarketImpact[];
  report: string | null;
  error: string | null;
  createdAt: number;
}
