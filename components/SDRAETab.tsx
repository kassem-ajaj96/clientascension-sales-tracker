import React, { useState } from "react";
import { KPICard } from "./KPICard";
import { PctBadge } from "./PctBadge";

interface SDRAERep {
  name: string;
  scheduled: number;
  meetingScheduled: number;
  showed: number;
  offered: number;
  closes: number;
  showRate: number | null;
  offerRate: number | null;
  closeRate: number | null;
}

interface SDRAEData {
  reps: SDRAERep[];
  totals: Omit<SDRAERep, "name">;
}

function fmtPct(v: number | null) {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

const SETTERS = ["All", "Antwon", "Erten", "Noah"] as const;
type Setter = typeof SETTERS[number];

export function SDRAETab({
  data,
  loading,
  onSetterChange,
}: {
  data: SDRAEData | null;
  loading: boolean;
  onSetterChange: (setter: string | null) => void;
}) {
  const [activeSetter, setActiveSetter] = useState<Setter>("All");
  const t = data?.totals;

  function handleSetter(s: Setter) {
    setActiveSetter(s);
    onSetterChange(s === "All" ? null : s);
  }

  return (
    <div className="p-6">
      <div className="space-y-6 w-fit">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <KPICard label="Show Rate" value={t ? fmtPct(t.showRate) : "—"} color="blue" />
          <div className="flex gap-1 mt-2 flex-wrap">
            {SETTERS.map((s) => (
              <button
                key={s}
                onClick={() => handleSetter(s)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeSetter === s
                    ? "bg-[#e53e1e] text-white"
                    : "bg-[#111] text-gray-500 hover:text-gray-200 border border-[#2a2a2a]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <KPICard label="Offer Rate" value={t ? fmtPct(t.offerRate) : "—"} color="green" />
        <KPICard label="Close Rate" value={t ? fmtPct(t.closeRate) : "—"} color="purple" />
        <KPICard label="Team Closes" value={t ? String(t.closes) : "—"} color="gold" />
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        {loading && (
          <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>
        )}
        {!loading && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Rep</th>
                <th className="text-right px-4 py-3 font-medium">Calls</th>
                <th className="text-right px-4 py-3 font-medium">Meeting Sched</th>
                <th className="text-right px-4 py-3 font-medium">Showed</th>
                <th className="text-right px-4 py-3 font-medium">Offered</th>
                <th className="text-right px-4 py-3 font-medium">Closes</th>
                <th className="text-center px-4 py-3 font-medium">Show%</th>
                <th className="text-center px-4 py-3 font-medium">Offer%</th>
                <th className="text-center px-4 py-3 font-medium">Close%</th>
              </tr>
            </thead>
            <tbody>
              {data?.reps.map((rep) => (
                <tr key={rep.name} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{rep.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.scheduled}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.meetingScheduled}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.showed}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.offered}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.closes}</td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.showRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.offerRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.closeRate} /></td>
                </tr>
              ))}
              {t && (
                <tr className="bg-[#0a0a0a] border-t border-[#1e1e1e]">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Team Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.scheduled}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.meetingScheduled}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.showed}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.offered}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.closes}</td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.showRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.offerRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.closeRate} /></td>
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
