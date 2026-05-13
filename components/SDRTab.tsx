import { KPICard } from "./KPICard";
import { PctBadge } from "./PctBadge";

interface SDRRep {
  name: string;
  dials: number;
  connects: number;
  convo: number;
  meetingsBooked: number;
  connectionRate: number | null;
  connectToConvo: number | null;
  convoToBooking: number | null;
  connectToBooking: number | null;
  dialToBooking: number | null;
}

interface SDRData {
  reps: SDRRep[];
  totals: Omit<SDRRep, "name">;
}

export function SDRTab({ data, loading }: { data: SDRData | null; loading: boolean }) {
  const t = data?.totals;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Total Dials" value={t ? String(t.dials) : "—"} color="blue" />
        <KPICard label="Total Connects" value={t ? String(t.connects) : "—"} color="purple" />
        <KPICard label="Total Booked" value={t ? String(t.meetingsBooked) : "—"} color="green" />
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
                <th className="text-right px-4 py-3 font-medium">Dials</th>
                <th className="text-right px-4 py-3 font-medium">Connects</th>
                <th className="text-right px-4 py-3 font-medium">Convo</th>
                <th className="text-right px-4 py-3 font-medium">Booked</th>
                <th className="text-center px-4 py-3 font-medium">Connection%</th>
                <th className="text-center px-4 py-3 font-medium">Connect→Convo%</th>
                <th className="text-center px-4 py-3 font-medium">Convo→Book%</th>
                <th className="text-center px-4 py-3 font-medium">Connect→Book%</th>
                <th className="text-center px-4 py-3 font-medium">Dial→Book%</th>
              </tr>
            </thead>
            <tbody>
              {data?.reps.map((rep) => (
                <tr key={rep.name} className="border-b border-[#1a1a1a] hover:bg-[#191919] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{rep.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.dials || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.connects || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.convo || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{rep.meetingsBooked || "—"}</td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.connectionRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.connectToConvo} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.convoToBooking} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.connectToBooking} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={rep.dialToBooking} /></td>
                </tr>
              ))}

              {/* Team Total */}
              {t && (
                <tr className="bg-[#111] border-t border-[#333]">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Team Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.dials}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.connects}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.convo}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{t.meetingsBooked}</td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.connectionRate} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.connectToConvo} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.convoToBooking} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.connectToBooking} /></td>
                  <td className="px-4 py-3 text-center"><PctBadge value={t.dialToBooking} /></td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
