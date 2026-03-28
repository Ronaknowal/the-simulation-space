export type SituationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Situation {
  id: string;
  title: string;
  severity: SituationSeverity;
  createdAt: number;
  source: string;
  details: string;
  intelligence: string[];
  possibleActivity: string[];
  relatedAlertIds: string[];
  relatedSimulationIds: string[];
  status: "active" | "monitoring" | "resolved";
  lat?: number;
  lng?: number;
}
