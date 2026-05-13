import { KPICard } from "./KPICard";
import { PctBadge } from "./PctBadge";

interface AERep {
  name: string;
  scheduled: number;
  liveCalls: number;
  offers: number;
  closes: number;
  cashCollected: number;
  showRate: number | null;
  offerRate: number | null;
  closeRate: number | null;
  cashPerCall: number | null;
}

interface AEData {
  reps: AERep[];
  totals: Omit<AERep, "name">;
}

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

export function AETab({ data, loading }: { data: AEData | null; loading: boolean }) {
  const t = data?.totals;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard label="Show Rate" value={t ? fmtPct(t.showRate) : "—"} color="blue" />
        <KPICard label="Offer Rate" value={t ? fmtPct(t.offerRate) : "—"} color="green" />
        <KPICard label="Close Rate" value={t ? fmtPct(t.closeRate) : "—"} color="purple" />
        <KPICard label="Team Closes" value={t ? String(t.closes) : "—"} color="gold" />
        <KPICard label="Cash Collected" value={t ? fmt$(t.cashCollected) : "—"} color="green" />
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-[#222] rounded-lg overflow-hidden">
        {loading && (
          <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>
        )}
        {!loading && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222] text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Rep</th>
                <th className="text-right px-4 py-3 font-medium">Scheduled</th>
                <th className="text-right px-4 py-3 font-medium">Live Calls</th>
                <th className="text-right px-4 py-3 font-medium">Offers</th>
                <th className="text-right px-4 py-3 font-medium">Closes</th>
                <th className="text-center px-4 py-3 font-medium">Show%</th>
                <th className="text-center px-4 py-3 font-medium">Offer%</th>
                <th className="text-center px-4 py-3 font-medium">Close%</th>
                <th className="text-right px-4 py-3 font-medium">Cash Collected</th>
                <th className="text-right px-4 py-3 font-medium">Cash/Call</th>
              </tr>
            </thead>
            <tbody>
              {data?.reps.map((rep) => (
                <tr key={rep.name} className="border-b border-[#1a1a1a] hover:bg-[#191919] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{rep.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.scheduled || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.liveCalls || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.offers || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.closes || "—"}</td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.showRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.offerRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.closeRate} /></td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">
                    {rep.cashCollected > 0 ? fmt$(rep.cashCollected) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">
                    {rep.cashPerCall !== null ? fmt$(rep.cashPerCall) : "—"}
                  </td>
                </tr>
              ))}

              {/* Team Total */}
              {t && (
                <tr className="bg-[#111] border-t border-[#333]">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Team Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.scheduled}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.liveCalls}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.offers}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.closes}</td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.showRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.offerRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.closeRate} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-green-400">{fmt$(t.cashCollected)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-400">
                    {t.cashPerCall !== null ? fmt$(t.cashPerCall) : "—"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
