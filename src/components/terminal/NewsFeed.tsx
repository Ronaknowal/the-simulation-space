"use client";

import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { NewsItem } from "./types";
import { timeAgo } from "./utils";

interface Props {
  news: NewsItem[];
  symbol: string;
}

function SentimentBadge({ s }: { s: NewsItem["sentiment"] }) {
  if (s === "bullish") return (
    <span className="flex items-center gap-0.5 font-mono text-[8px] font-bold text-[#2ecc71]">
      <TrendingUp className="h-2.5 w-2.5" /> BULL
    </span>
  );
  if (s === "bearish") return (
    <span className="flex items-center gap-0.5 font-mono text-[8px] font-bold text-[#e74c3c]">
      <TrendingDown className="h-2.5 w-2.5" /> BEAR
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 font-mono text-[8px] text-[#555]">
      <Minus className="h-2.5 w-2.5" /> NEUT
    </span>
  );
}

export default function NewsFeed({ news, symbol }: Props) {
  const bullish = news.filter(n => n.sentiment === "bullish").length;
  const bearish = news.filter(n => n.sentiment === "bearish").length;
  const total = news.length || 1;
  const sentScore = ((bullish - bearish) / total) * 100;
  const overallSentiment = sentScore > 10 ? "bullish" : sentScore < -10 ? "bearish" : "neutral";

  return (
    <div className="flex flex-col h-full bg-[#000] border-t border-[#1c1c1c]">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#222] bg-[#050505] shrink-0">
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[#d4952b] text-black">NEWS</span>
        <span className="font-mono text-[10px] text-[#ddd]">{symbol} FEED</span>
        <div className="flex-1" />
        {/* Sentiment summary */}
        <div className="flex items-center gap-1.5 font-mono text-[9px]">
          <span className="text-[#555]">SENTIMENT:</span>
          <span style={{ color: overallSentiment === "bullish" ? "#2ecc71" : overallSentiment === "bearish" ? "#e74c3c" : "#666" }}
            className="font-bold">
            {overallSentiment.toUpperCase()}
          </span>
          <span className="text-[#444]">
            ({bullish}↑ {bearish}↓ {total - bullish - bearish}→)
          </span>
        </div>
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto">
        {news.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-[10px] text-[#333]">NO NEWS DATA</span>
          </div>
        ) : (
          news.map((item) => (
            <a
              key={item.uuid}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 px-2 py-1.5 border-b border-[#0d0d0d] hover:bg-[#080808] group transition-colors"
            >
              {/* Sentiment bar */}
              <div
                className="w-0.5 self-stretch shrink-0 rounded"
                style={{
                  backgroundColor:
                    item.sentiment === "bullish" ? "#2ecc71" :
                    item.sentiment === "bearish" ? "#e74c3c" : "#333",
                }}
              />
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <p className="font-mono text-[10px] text-[#ccc] leading-snug group-hover:text-white line-clamp-2">
                  {item.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] text-[#444]">{item.publisher}</span>
                  <span className="font-mono text-[8px] text-[#333]">·</span>
                  <span className="font-mono text-[8px] text-[#444]">{timeAgo(item.providerPublishTime)}</span>
                  <div className="ml-auto">
                    <SentimentBadge s={item.sentiment} />
                  </div>
                </div>
              </div>
              <ExternalLink className="h-2.5 w-2.5 text-[#333] group-hover:text-[#d4952b] shrink-0 mt-0.5" />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
