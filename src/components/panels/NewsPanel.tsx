"use client";

import PanelContainer from "@/components/panels/PanelContainer";

const MOCK_NEWS = [
  { id: "1", source: "GDELT", headline: "China-US trade tensions escalate", sentiment: "negative" as const },
  { id: "2", source: "BBC", headline: "EU semiconductor act phase 2", sentiment: "neutral" as const },
  { id: "3", source: "Reddit", headline: "r/wallstreetbets: NVDA supply chain", sentiment: "positive" as const },
  { id: "4", source: "Bluesky", headline: "OSINT: naval movements Taiwan", sentiment: "negative" as const },
  { id: "5", source: "AP", headline: "Global shipping rates surge 40%", sentiment: "warning" as const },
];

const sentimentLabel: Record<"negative" | "neutral" | "positive" | "warning", string> = {
  negative: "NEG",
  neutral: "NEU",
  positive: "POS",
  warning: "MIX",
};

const sentimentClass: Record<"negative" | "neutral" | "positive" | "warning", string> = {
  negative: "text-negative",
  neutral: "text-text-disabled",
  positive: "text-positive",
  warning: "text-warning",
};

export function NewsPanel() {
  return (
    <PanelContainer id="news" title="Intel / News / Social">
      <div className="overflow-y-auto h-full">
        {MOCK_NEWS.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-2 py-1 border-b border-border-subtle"
          >
            <span className="text-text-disabled text-[8px] uppercase tracking-widest shrink-0 w-10">
              {item.source}
            </span>
            <span className="text-text-secondary text-[9px] flex-1 leading-snug">{item.headline}</span>
            <span className={`text-[8px] uppercase tracking-widest shrink-0 ${sentimentClass[item.sentiment]}`}>
              {sentimentLabel[item.sentiment]}
            </span>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
}

export default NewsPanel;
