"use client";

import { useState } from "react";
import { ExternalLink, Building2, Globe, Phone } from "lucide-react";
import { CompanyProfile as CompanyProfileType, StockMeta } from "./types";
import { fmtNumber } from "./utils";

interface Props {
  profile: CompanyProfileType | null;
  meta: StockMeta | null;
  symbol: string;
}

export default function CompanyProfile({ profile, meta, symbol }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!profile && !meta) {
    return (
      <div className="flex flex-col h-full bg-[#000] border-l border-[#1c1c1c]">
        <PanelHeader label="DES" title="DESCRIPTION" />
        <div className="flex flex-1 items-center justify-center">
          <span className="font-mono text-[10px] text-[#333]">Loading…</span>
        </div>
      </div>
    );
  }

  const summary = profile?.longBusinessSummary || "";
  const truncated = summary.slice(0, 320);
  const showToggle = summary.length > 320;

  return (
    <div className="flex flex-col h-full bg-[#000] border-l border-[#1c1c1c] overflow-y-auto">
      <PanelHeader label="DES" title={meta?.shortName || symbol} />

      <div className="flex flex-col gap-0 p-2 text-[10px] font-mono">
        {/* Header identifiers */}
        <div className="grid grid-cols-2 gap-0 border-b border-[#111] pb-2 mb-2">
          <InfoRow label="SYMBOL" value={symbol} color="#d4952b" />
          <InfoRow label="EXCHANGE" value={meta?.exchange || "—"} />
          <InfoRow label="SECTOR" value={profile?.sector || "—"} color="#d4952b" />
          <InfoRow label="INDUSTRY" value={profile?.industry || "—"} />
          <InfoRow label="EMPLOYEES" value={profile?.fullTimeEmployees ? fmtNumber(profile.fullTimeEmployees, 0) : "—"} />
          <InfoRow label="CURRENCY" value={meta?.currency || "USD"} />
        </div>

        {/* Description */}
        {summary && (
          <div className="border-b border-[#111] pb-2 mb-2">
            <div className="text-[#666] text-[8px] uppercase tracking-widest mb-1">BUSINESS DESCRIPTION</div>
            <p className="text-[#aaa] text-[9px] leading-relaxed">
              {expanded ? summary : truncated}
              {showToggle && !expanded && "…"}
            </p>
            {showToggle && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-1 text-[#d4952b] text-[8px] hover:underline"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* Contact info */}
        <div className="border-b border-[#111] pb-2 mb-2 grid grid-cols-1 gap-0.5">
          {profile?.city && (
            <div className="flex items-center gap-1.5 text-[#666]">
              <Building2 className="h-2.5 w-2.5 text-[#444]" />
              <span>{[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {profile?.phone && (
            <div className="flex items-center gap-1.5 text-[#666]">
              <Phone className="h-2.5 w-2.5 text-[#444]" />
              <span>{profile.phone}</span>
            </div>
          )}
          {profile?.website && (
            <div className="flex items-center gap-1.5">
              <Globe className="h-2.5 w-2.5 text-[#444]" />
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="text-[#d4952b] hover:underline flex items-center gap-1"
              >
                {profile.website.replace(/^https?:\/\//, "")}
                <ExternalLink className="h-2 w-2" />
              </a>
            </div>
          )}
        </div>

        {/* Key executives */}
        {profile?.companyOfficers && profile.companyOfficers.length > 0 && (
          <div>
            <div className="text-[#666] text-[8px] uppercase tracking-widest mb-1.5">KEY EXECUTIVES</div>
            <div className="flex flex-col gap-1">
              {profile.companyOfficers.slice(0, 5).map((o, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[#ddd] text-[9px] font-bold">{o.name}</span>
                    <span className="text-[#555] text-[8px]">{o.title}</span>
                  </div>
                  {o.totalPay && o.totalPay > 0 && (
                    <span className="text-[#d4952b] text-[9px] shrink-0 tabular-nums">
                      ${fmtNumber(o.totalPay)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#222] bg-[#050505] shrink-0">
      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[#d4952b] text-black">{label}</span>
      <span className="font-mono text-[10px] font-bold text-[#ddd] truncate">{title}</span>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col py-0.5">
      <span className="text-[8px] text-[#444] uppercase tracking-widest">{label}</span>
      <span className="text-[10px]" style={{ color: color || "#aaa" }}>{value}</span>
    </div>
  );
}
