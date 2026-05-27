"use client";
import React, { useState } from "react";

interface RepStats {
  name: string;
  scheduled: number;
  showed: number;
  offered: number;
  closes: number;
  cashCollected: number;
  cashPerCall: number | null;
  showRate: number | null;
  offerRate: number | null;
  closeRate: number | null;
}

interface MonthSnapshot {
  reps: RepStats[];
  totals: Omit<RepStats, "name">;
  label: string;
}

interface MonthlyData {
  current: MonthSnapshot;
  previous: MonthSnapshot;
}

const AES = ["All Team", "Peter", "Logan", "Andrew", "Ciaran", "Fourkan"] as const;
type AEName = (typeof AES)[number];

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevYearMonth(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions(count: number): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

const MONTH_OPTIONS = getMonthOptions(12);

function fmt$(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtPct(v: number | null) {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function getStats(snapshot: MonthSnapshot, name: AEName): Omit<RepStats, "name"> {
  if (name === "All Team") return snapshot.totals;
  return (
    snapshot.reps.find((r) => r.name === name) ?? {
      scheduled: 0,
      showed: 0,
      offered: 0,
      closes: 0,
      cashCollected: 0,
      cashPerCall: null,
      showRate: null,
      offerRate: null,
      closeRate: null,
    }
  );
}

interface MetricRow {
  label: string;
  currDisplay: string;
  prevDisplay: string;
  diff: number | null;
  diffDisplay: string | null;
}

function buildRows(curr: Omit<RepStats, "name">, prev: Omit<RepStats, "name">): MetricRow[] {
  function numRow(label: string, c: number, p: number): MetricRow {
    const diff = c - p;
    return {
      label,
      currDisplay: String(c),
      prevDisplay: String(p),
      diff,
      diffDisplay: diff !== 0 ? `${diff > 0 ? "+" : ""}${diff}` : null,
    };
  }

  function cashRow(label: string, c: number, p: number): MetricRow {
    const diff = c - p;
    return {
      label,
      currDisplay: fmt$(c),
      prevDisplay: fmt$(p),
      diff,
      diffDisplay: diff !== 0 ? `${diff > 0 ? "+" : ""}${fmt$(diff)}` : null,
    };
  }

  function cashNullRow(label: string, c: number | null, p: number | null): MetricRow {
    const diff = c !== null && p !== null ? c - p : null;
    return {
      label,
      currDisplay: c !== null ? fmt$(c) : "—",
      prevDisplay: p !== null ? fmt$(p) : "—",
      diff,
      diffDisplay: diff !== null && diff !== 0 ? `${diff > 0 ? "+" : ""}${fmt$(diff)}` : null,
    };
  }

  function pctRow(label: string, c: number | null, p: number | null): MetricRow {
    const diff = c !== null && p !== null ? c - p : null;
    return {
      label,
      currDisplay: fmtPct(c),
      prevDisplay: fmtPct(p),
      diff,
      diffDisplay:
        diff !== null && diff !== 0
          ? `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)}%`
          : null,
    };
  }

  return [
    numRow("Calls", curr.scheduled, prev.scheduled),
    numRow("Shows", curr.showed, prev.showed),
    numRow("Offers", curr.offered, prev.offered),
    numRow("Closes", curr.closes, prev.closes),
    cashRow("Cash Collected", curr.cashCollected, prev.cashCollected),
    cashNullRow("Cash / Call", curr.cashPerCall, prev.cashPerCall),
    pctRow("Show Rate", curr.showRate, prev.showRate),
    pctRow("Offer Rate", curr.offerRate, prev.offerRate),
    pctRow("Close Rate", curr.closeRate, prev.closeRate),
  ];
}

export function MonthlyPerformanceTab({
  data,
  loading,
  onMonthChange,
}: {
  data: MonthlyData | null;
  loading: boolean;
  onMonthChange: (month1: string, month2: string) => void;
}) {
  const [activeRep, setActiveRep] = useState<AEName>("All Team");
  const [month1, setMonth1] = useState(currentYearMonth);
  const [month2, setMonth2] = useState(() => prevYearMonth(currentYearMonth()));

  function handleMonth1Change(val: string) {
    setMonth1(val);
    onMonthChange(val, month2);
  }

  function handleMonth2Change(val: string) {
    setMonth2(val);
    onMonthChange(month1, val);
  }

  const rows =
    data
      ? buildRows(getStats(data.current, activeRep), getStats(data.previous, activeRep))
      : [];

  return (
    <div className="p-4 sm:p-6">
      <div className="space-y-5 w-full">
        {/* Rep selector */}
        <div className="flex gap-2 flex-wrap">
          {AES.map((rep) => (
            <button
              key={rep}
              onClick={() => setActiveRep(rep)}
              className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${
                activeRep === rep
                  ? "bg-[#e53e1e] text-white"
                  : "bg-[#111] text-gray-500 hover:text-gray-200 border border-[#2a2a2a]"
              }`}
            >
              {rep}
            </button>
          ))}
        </div>

        {/* Month pickers */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Month 1</span>
            <select
              value={month1}
              onChange={(e) => handleMonth1Change(e.target.value)}
              className="bg-[#111] border border-[#2a2a2a] text-white text-sm font-bold rounded px-3 py-1.5 [color-scheme:dark] cursor-pointer"
            >
              {MONTH_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <span className="text-gray-600 font-bold mt-5">vs</span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Month 2</span>
            <select
              value={month2}
              onChange={(e) => handleMonth2Change(e.target.value)}
              className="bg-[#111] border border-[#2a2a2a] text-white text-sm font-bold rounded px-3 py-1.5 [color-scheme:dark] cursor-pointer"
            >
              {MONTH_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>
        )}

        {!loading && data && (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-bold">Metric</th>
                  <th className="text-right px-5 py-3 font-bold text-white">
                    {data.current.label}
                  </th>
                  <th className="text-right px-5 py-3 font-bold">
                    {data.previous.label}
                  </th>
                  <th className="text-center px-5 py-3 font-bold">Growth</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-[#111] hover:bg-[#111] transition-colors ${
                      i === rows.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-bold text-gray-400">{row.label}</td>
                    <td className="px-5 py-3 text-right font-bold text-white">
                      {row.currDisplay}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-500">
                      {row.prevDisplay}
                    </td>
                    <td
                      className={`px-5 py-3 text-center font-bold ${
                        row.diff === null || row.diff === 0
                          ? "text-gray-600"
                          : row.diff > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {row.diffDisplay ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
