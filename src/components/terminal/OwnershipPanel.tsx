"use client";

import { InstitutionalHolder, InsiderTransaction } from "./types";
import { fmtNumber, fmtDate } from "./utils";

interface Props {
  holders: InstitutionalHolder[];
  insiders: InsiderTransaction[];
}

export default function OwnershipPanel({ holders, insiders }: Props) {
  const buys = insiders.filter(t => t.shares > 0).length;
  const sells = insiders.filter(t => t.shares < 0).length;
  const totalInsider = buys + sells || 1;
  const buyPct = (buys / totalInsider) * 100;

  return (
    <div className="flex flex-col h-full bg-[#000] border-t border-l border-[#1c1c1c]">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#222] bg-[#050505] shrink-0">
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[#d4952b] text-black">OWN</span>
        <span className="font-mono text-[10px] font-bold text-[#ddd]">OWNERSHIP</span>
        <div className="flex-1" />
        {/* Insider ratio bar */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[8px] text-[#555]">INSIDER:</span>
          <div className="relative h-2 w-20 bg-[#111] rounded-sm overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-[#2ecc71]"
              style={{ width: `${buyPct}%` }}
            />
          </div>
          <span className="font-mono text-[8px] text-[#2ecc71]">{buys}B</span>
          <span className="font-mono text-[8px] text-[#e74c3c]">{sells}S</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Institutional Holders */}
        <div className="shrink-0">
          <div className="px-2 py-1 border-b border-[#111] bg-[#040404]">
            <span className="font-mono text-[8px] text-[#555] uppercase tracking-widest">TOP INSTITUTIONAL HOLDERS</span>
          </div>
          {holders.length === 0 ? (
            <div className="px-2 py-2 font-mono text-[9px] text-[#333]">No data</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#111]">
                  <th className="py-0.5 pl-2 font-mono text-[7px] text-[#444] uppercase">INSTITUTION</th>
                  <th className="py-0.5 px-2 font-mono text-[7px] text-[#444] text-right uppercase">SHARES</th>
                  <th className="py-0.5 px-2 font-mono text-[7px] text-[#444] text-right uppercase">VALUE</th>
                  <th className="py-0.5 pr-2 font-mono text-[7px] text-[#444] text-right uppercase">% HELD</th>
                </tr>
              </thead>
              <tbody>
                {holders.slice(0, 8).map((h, i) => (
                  <tr key={i} className="border-t border-[#0a0a0a] hover:bg-[#060606]">
                    <td className="py-0.5 pl-2 pr-1 font-mono text-[9px] text-[#aaa] max-w-[120px] truncate">
                      {h.organization}
                    </td>
                    <td className="py-0.5 px-2 font-mono text-[9px] text-right tabular-nums text-[#888]">
                      {fmtNumber(h.position, 0)}
                    </td>
                    <td className="py-0.5 px-2 font-mono text-[9px] text-right tabular-nums text-[#d4952b]">
                      ${fmtNumber(h.value)}
                    </td>
                    <td className="py-0.5 pr-2 font-mono text-[9px] text-right tabular-nums text-[#ddd]">
                      {(h.pctHeld * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Insider Transactions */}
        <div className="flex-1">
          <div className="px-2 py-1 border-y border-[#111] bg-[#040404]">
            <span className="font-mono text-[8px] text-[#555] uppercase tracking-widest">INSIDER TRANSACTIONS (FORM 4)</span>
          </div>
          {insiders.length === 0 ? (
            <div className="px-2 py-2 font-mono text-[9px] text-[#333]">No insider data</div>
          ) : (
            <div className="flex flex-col">
              {insiders.slice(0, 10).map((t, i) => {
                const isBuy = t.shares > 0;
                const color = isBuy ? "#2ecc71" : "#e74c3c";
                return (
                  <div key={i} className="flex items-start gap-2 px-2 py-1 border-b border-[#0a0a0a] hover:bg-[#060606]">
                    <span
                      className="font-mono text-[9px] font-bold shrink-0 w-6 text-center"
                      style={{ color }}
                    >
                      {isBuy ? "B" : "S"}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                      <span className="font-mono text-[9px] text-[#ccc] truncate">{t.filerName}</span>
                      <span className="font-mono text-[8px] text-[#555]">{t.filerRelation}</span>
                      <span className="font-mono text-[8px] text-[#444] truncate">{t.transactionText}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-mono text-[9px] tabular-nums" style={{ color }}>
                        {isBuy ? "+" : ""}{fmtNumber(t.shares, 0)}
                      </span>
                      {t.value && (
                        <span className="font-mono text-[8px] text-[#555] tabular-nums">
                          ${fmtNumber(t.value)}
                        </span>
                      )}
                      <span className="font-mono text-[7px] text-[#333]">
                        {t.startDate ? fmtDate(t.startDate) : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
