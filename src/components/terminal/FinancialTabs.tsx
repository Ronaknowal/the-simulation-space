"use client";

import { useState } from "react";
import { IncomeStatement, BalanceSheet, CashFlowStatement } from "./types";
import { fmtNumber } from "./utils";

type Period = "quarterly" | "annual";
type Tab = "income" | "balance" | "cashflow";

interface Props {
  quarterlyIncome: IncomeStatement[];
  annualIncome: IncomeStatement[];
  quarterlyBalance: BalanceSheet[];
  annualBalance: BalanceSheet[];
  quarterlyCashflow: CashFlowStatement[];
  annualCashflow: CashFlowStatement[];
}

function Spark({ values }: { values: (number | undefined)[] }) {
  const nums = values.filter((v): v is number => v !== undefined && !isNaN(v));
  if (nums.length < 2) return <span className="text-[#333]">—</span>;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const w = 36, h = 12;
  const pts = nums
    .map((v, i) => `${(i / (nums.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  const last = nums[nums.length - 1];
  const first = nums[0];
  const color = last >= first ? "#2ecc71" : "#e74c3c";
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

function Row({
  label,
  values,
  color,
  sparkValues,
}: {
  label: string;
  values: string[];
  color?: string;
  sparkValues?: (number | undefined)[];
}) {
  return (
    <tr className="border-t border-[#111] hover:bg-[#080808]">
      <td className="py-0.5 pl-2 pr-1 font-mono text-[9px] text-[#666] whitespace-nowrap">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-0.5 px-2 font-mono text-[9px] text-right tabular-nums whitespace-nowrap" style={{ color: color || "#ccc" }}>
          {v}
        </td>
      ))}
      {sparkValues && (
        <td className="py-0.5 px-2">
          <Spark values={sparkValues} />
        </td>
      )}
    </tr>
  );
}

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  return fmtNumber(n);
}

function IncomeTable({ data }: { data: IncomeStatement[] }) {
  const d = data.slice(0, 4).reverse();
  const dates = d.map(s => s.date);
  if (!d.length) return <NoData />;
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-[#222]">
          <th className="py-1 pl-2 font-mono text-[8px] text-[#444] uppercase tracking-wider w-28">METRIC</th>
          {dates.map(dt => (
            <th key={dt} className="py-1 px-2 font-mono text-[8px] text-[#d4952b] text-right uppercase tracking-wider">{dt}</th>
          ))}
          <th className="py-1 px-2 font-mono text-[8px] text-[#444] text-right uppercase tracking-wider">TREND</th>
        </tr>
      </thead>
      <tbody>
        <Row label="REVENUE" values={d.map(s => fmt(s.totalRevenue))} color="#fff" sparkValues={d.map(s => s.totalRevenue)} />
        <Row label="GROSS PROFIT" values={d.map(s => fmt(s.grossProfit))} color="#d4952b" sparkValues={d.map(s => s.grossProfit)} />
        <Row label="OP INCOME" values={d.map(s => fmt(s.operatingIncome))} sparkValues={d.map(s => s.operatingIncome)} />
        <Row label="NET INCOME" values={d.map(s => fmt(s.netIncome))} color="#2ecc71" sparkValues={d.map(s => s.netIncome)} />
        <Row label="EBITDA" values={d.map(s => fmt(s.ebitda))} sparkValues={d.map(s => s.ebitda)} />
        <Row label="EPS (BASIC)" values={d.map(s => (typeof s.basicEPS === 'number') ? `$${s.basicEPS.toFixed(2)}` : "—")} color="#d4952b" sparkValues={d.map(s => s.basicEPS)} />
        <Row label="EPS (DIL)" values={d.map(s => (typeof s.dilutedEPS === 'number') ? `$${s.dilutedEPS.toFixed(2)}` : "—")} sparkValues={d.map(s => s.dilutedEPS)} />
      </tbody>
    </table>
  );
}

function BalanceTable({ data }: { data: BalanceSheet[] }) {
  const d = data.slice(0, 4).reverse();
  const dates = d.map(s => s.date);
  if (!d.length) return <NoData />;
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-[#222]">
          <th className="py-1 pl-2 font-mono text-[8px] text-[#444] uppercase tracking-wider w-28">METRIC</th>
          {dates.map(dt => (
            <th key={dt} className="py-1 px-2 font-mono text-[8px] text-[#d4952b] text-right">{dt}</th>
          ))}
          <th className="py-1 px-2 font-mono text-[8px] text-[#444] text-right">TREND</th>
        </tr>
      </thead>
      <tbody>
        <Row label="TOTAL ASSETS" values={d.map(s => fmt(s.totalAssets))} color="#fff" sparkValues={d.map(s => s.totalAssets)} />
        <Row label="CURR ASSETS" values={d.map(s => fmt(s.totalCurrentAssets))} sparkValues={d.map(s => s.totalCurrentAssets)} />
        <Row label="TOTAL LIAB" values={d.map(s => fmt(s.totalLiab))} color="#e74c3c" sparkValues={d.map(s => s.totalLiab)} />
        <Row label="CURR LIAB" values={d.map(s => fmt(s.totalCurrentLiabilities))} color="#e74c3c" sparkValues={d.map(s => s.totalCurrentLiabilities)} />
        <Row label="EQUITY" values={d.map(s => fmt(s.totalStockholderEquity))} color="#2ecc71" sparkValues={d.map(s => s.totalStockholderEquity)} />
        <Row label="CASH" values={d.map(s => fmt(s.cash))} color="#d4952b" sparkValues={d.map(s => s.cash)} />
        <Row label="LONG-TERM DEBT" values={d.map(s => fmt(s.longTermDebt))} color="#e74c3c" sparkValues={d.map(s => s.longTermDebt)} />
      </tbody>
    </table>
  );
}

function CashTable({ data }: { data: CashFlowStatement[] }) {
  const d = data.slice(0, 4).reverse();
  const dates = d.map(s => s.date);
  if (!d.length) return <NoData />;
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-[#222]">
          <th className="py-1 pl-2 font-mono text-[8px] text-[#444] uppercase tracking-wider w-28">METRIC</th>
          {dates.map(dt => (
            <th key={dt} className="py-1 px-2 font-mono text-[8px] text-[#d4952b] text-right">{dt}</th>
          ))}
          <th className="py-1 px-2 font-mono text-[8px] text-[#444] text-right">TREND</th>
        </tr>
      </thead>
      <tbody>
        <Row label="OPER CASHFLOW" values={d.map(s => fmt(s.operatingCashflow))} color="#2ecc71" sparkValues={d.map(s => s.operatingCashflow)} />
        <Row label="CAPEX" values={d.map(s => fmt(s.capitalExpenditures))} color="#e74c3c" sparkValues={d.map(s => s.capitalExpenditures)} />
        <Row label="FREE CASHFLOW" values={d.map(s => fmt(s.freeCashFlow))} color="#d4952b" sparkValues={d.map(s => s.freeCashFlow)} />
        <Row label="DIVIDENDS" values={d.map(s => fmt(s.dividendsPaid))} sparkValues={d.map(s => s.dividendsPaid)} />
      </tbody>
    </table>
  );
}

function NoData() {
  return (
    <div className="flex items-center justify-center h-20">
      <span className="font-mono text-[10px] text-[#333]">NO FINANCIAL DATA</span>
    </div>
  );
}

export default function FinancialTabs({
  quarterlyIncome, annualIncome,
  quarterlyBalance, annualBalance,
  quarterlyCashflow, annualCashflow,
}: Props) {
  const [tab, setTab] = useState<Tab>("income");
  const [period, setPeriod] = useState<Period>("annual");

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`font-mono text-[9px] px-2 py-1 border-b-2 transition-colors ${
        tab === t ? "border-[#d4952b] text-[#d4952b]" : "border-transparent text-[#555] hover:text-[#888]"
      }`}
    >
      {label}
    </button>
  );

  const perBtn = (p: Period, label: string) => (
    <button
      onClick={() => setPeriod(p)}
      className={`font-mono text-[8px] px-1.5 py-0.5 transition-colors ${
        period === p ? "bg-[#d4952b] text-black font-bold" : "text-[#555] hover:text-[#888]"
      }`}
    >
      {label}
    </button>
  );

  const income = period === "quarterly" ? quarterlyIncome : annualIncome;
  const balance = period === "quarterly" ? quarterlyBalance : annualBalance;
  const cashflow = period === "quarterly" ? quarterlyCashflow : annualCashflow;

  return (
    <div className="flex flex-col h-full bg-[#000] border-l border-[#1c1c1c]">
      {/* Header */}
      <div className="flex items-center gap-0 px-2 pt-1 border-b border-[#222] bg-[#050505] shrink-0">
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-[#d4952b] text-black mr-2">FA</span>
        {tabBtn("income", "INCOME")}
        {tabBtn("balance", "BALANCE")}
        {tabBtn("cashflow", "CASH FLOW")}
        <div className="flex-1" />
        <div className="flex gap-0.5 mr-1">
          {perBtn("quarterly", "Q")}
          {perBtn("annual", "A")}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {tab === "income" && <IncomeTable data={income} />}
        {tab === "balance" && <BalanceTable data={balance} />}
        {tab === "cashflow" && <CashTable data={cashflow} />}
      </div>
    </div>
  );
}
