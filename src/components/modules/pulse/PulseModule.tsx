"use client";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import EventsPanel from "@/components/panels/EventsPanel";
import SpatialPanel from "@/components/panels/SpatialPanel";
import SimulationsPanel from "@/components/panels/SimulationsPanel";
import RiskGaugesPanel from "@/components/panels/RiskGaugesPanel";
import MarketPulsePanel from "@/components/panels/MarketPulsePanel";
import NewsPanel from "@/components/panels/NewsPanel";

export function PulseModule() {
  return (
    <div
      className="h-full w-full bg-border-subtle"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "1px",
      }}
    >
      {/* Row 1, Col 1: Events */}
      <div className="bg-bg overflow-hidden" style={{ gridColumn: "1", gridRow: "1" }}>
        <ErrorBoundary name="events">
          <EventsPanel />
        </ErrorBoundary>
      </div>

      {/* Col 2: Spatial — spans 2 rows */}
      <div className="bg-bg overflow-hidden" style={{ gridColumn: "2", gridRow: "1 / span 2" }}>
        <ErrorBoundary name="spatial">
          <SpatialPanel />
        </ErrorBoundary>
      </div>

      {/* Row 1, Col 3-4: Simulations — spans 2 columns */}
      <div className="bg-bg overflow-hidden" style={{ gridColumn: "3 / span 2", gridRow: "1" }}>
        <ErrorBoundary name="simulations">
          <SimulationsPanel />
        </ErrorBoundary>
      </div>

      {/* Row 2, Col 1: Risk Gauges */}
      <div className="bg-bg overflow-hidden" style={{ gridColumn: "1", gridRow: "2" }}>
        <ErrorBoundary name="risk-gauges">
          <RiskGaugesPanel />
        </ErrorBoundary>
      </div>

      {/* Row 2, Col 3: Market Pulse */}
      <div className="bg-bg overflow-hidden" style={{ gridColumn: "3", gridRow: "2" }}>
        <ErrorBoundary name="market-pulse">
          <MarketPulsePanel />
        </ErrorBoundary>
      </div>

      {/* Row 2, Col 4: News */}
      <div className="bg-bg overflow-hidden" style={{ gridColumn: "4", gridRow: "2" }}>
        <ErrorBoundary name="news">
          <NewsPanel />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default PulseModule;
