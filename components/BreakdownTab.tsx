"use client";
import { KPICard } from "./KPICard";

interface PaymentPlanRow {
  plan: string;
  count: number;
}

interface CloseTypeRow {
  type: string;
  count: number;
  cash: number;
}

interface BreakdownData {
  totalCloses: number;
  totalCash: number;
  paymentPlans: PaymentPlanRow[];
  closeTypes: CloseTypeRow[];
}

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function BreakdownTab({ data, loading }: { data: BreakdownData | null; loading: boolean }) {
  return (
    <div className="p-6">
      <div className="space-y-6 w-fit">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <KPICard label="Total Closes" value={data ? String(data.totalCloses) : "—"} color="gold" />
          <KPICard label="Total Cash" value={data ? fmt$(data.totalCash) : "—"} color="green" />
        </div>

        {/* 3 Tables side by side */}
        {loading && <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>}
        {!loading && data && (
          <div className="flex gap-4 items-start">
            {/* Payment Plans */}
            <div className="bg-black border border-[#1e1e1e] rounded-lg overflow-hidden">
              <table className="text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Payment Plan</th>
                    <th className="text-right px-4 py-3 font-medium">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentPlans.map((row) => (
                    <tr key={row.plan} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{row.plan}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#0a0a0a] border-t border-[#1e1e1e]">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{data.totalCloses}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Close Types */}
            <div className="bg-black border border-[#1e1e1e] rounded-lg overflow-hidden">
              <table className="text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Close Type</th>
                    <th className="text-right px-4 py-3 font-medium">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.closeTypes.map((row) => (
                    <tr key={row.type} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{row.type}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#0a0a0a] border-t border-[#1e1e1e]">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{data.totalCloses}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash by Close Type */}
            <div className="bg-black border border-[#1e1e1e] rounded-lg overflow-hidden">
              <table className="text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Close Type</th>
                    <th className="text-right px-4 py-3 font-medium">Cash Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.closeTypes.map((row) => (
                    <tr key={row.type} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{row.type}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-medium">{fmt$(row.cash)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#0a0a0a] border-t border-[#1e1e1e]">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-400">{fmt$(data.totalCash)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
