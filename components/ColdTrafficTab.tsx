"use client";
import React, { useState } from "react";
import { KPICard } from "./KPICard";
import { PctBadge } from "./PctBadge";

interface CTRep {
  name: string;
  calls: number;
  liveCalls: number;
  offers: number;
  closes: number;
  showRate: number | null;
  offerRate: number | null;
  closeRate: number | null;
}

interface CTData {
  reps: CTRep[];
  totals: Omit<CTRep, "name">;
}

const AES = ["All Team", "Peter", "Logan", "Andrew", "Ciaran"] as const;
type AEName = (typeof AES)[number];

function fmtPct(v: number | null) {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function ColdTrafficTab({ data, loading }: { data: CTData | null; loading: boolean }) {
  const [activeRep, setActiveRep] = useState<AEName>("All Team");

  const stats =
    activeRep === "All Team"
      ? data?.totals
      : data?.reps.find((r) => r.name === activeRep);

  const tableReps =
    activeRep === "All Team" ? data?.reps : data?.reps.filter((r) => r.name === activeRep);

  const totalRow = activeRep === "All Team" ? data?.totals : null;

  return (
    <div className="p-4 sm:p-6">
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="col-span-1">
            <KPICard
              label="Show Rate"
              value={stats ? fmtPct(stats.showRate) : "—"}
              color="blue"
            />
            <div className="flex gap-1 mt-2 flex-wrap">
              {AES.map((rep) => (
                <button
                  key={rep}
                  onClick={() => setActiveRep(rep)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    activeRep === rep
                      ? "bg-[#e53e1e] text-white"
                      : "bg-[#111] text-gray-500 hover:text-gray-200 border border-[#2a2a2a]"
                  }`}
                >
                  {rep}
                </button>
              ))}
            </div>
          </div>
          <KPICard
            label="Offer Rate"
            value={stats ? fmtPct(stats.offerRate) : "—"}
            color="green"
          />
          <KPICard
            label="Close Rate"
            value={stats ? fmtPct(stats.closeRate) : "—"}
            color="purple"
          />
          <KPICard
            label={activeRep === "All Team" ? "Team Calls" : "Calls"}
            value={stats ? String(stats.calls) : "—"}
            color="gold"
          />
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
          {loading && (
            <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>
          )}
          {!loading && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-bold">Rep</th>
                  <th className="text-right px-4 py-3 font-bold">Calls</th>
                  <th className="text-right px-4 py-3 font-bold">Live Calls</th>
                  <th className="text-right px-4 py-3 font-bold">Offers</th>
                  <th className="text-right px-4 py-3 font-bold">Closes</th>
                  <th className="text-center px-4 py-3 font-bold">Show%</th>
                  <th className="text-center px-4 py-3 font-bold">Offer%</th>
                  <th className="text-center px-4 py-3 font-bold">Close%</th>
                </tr>
              </thead>
              <tbody>
                {tableReps?.map((rep) => (
                  <tr
                    key={rep.name}
                    className="border-b border-[#111] hover:bg-[#111] transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-white">{rep.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-300">{rep.calls}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-300">{rep.liveCalls}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-300">{rep.offers}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-300">{rep.closes}</td>
                    <td className="px-4 py-3 text-center">
                      <PctBadge value={rep.showRate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PctBadge value={rep.offerRate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PctBadge value={rep.closeRate} />
                    </td>
                  </tr>
                ))}
                {totalRow && (
                  <tr className="bg-[#0a0a0a] border-t border-[#1e1e1e]">
                    <td className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
                      Team Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">{totalRow.calls}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{totalRow.liveCalls}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{totalRow.offers}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{totalRow.closes}</td>
                    <td className="px-4 py-3 text-center">
                      <PctBadge value={totalRow.showRate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PctBadge value={totalRow.offerRate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PctBadge value={totalRow.closeRate} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
