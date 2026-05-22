"use client";

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden min-w-[260px]">
      <div className="px-5 py-3 border-b border-[#1e1e1e] bg-[#111]">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e53e1e]">{title}</span>
      </div>
      <div className="divide-y divide-[#1a1a1a]">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = "text-white" }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-[#111] transition-colors">
      <span className="text-sm font-bold text-white">{label}</span>
      <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value, valueClass = "text-white" }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-[#0a0a0a]">
      <span className="text-sm font-bold text-white">{label}</span>
      <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

export function BreakdownTab({ data, loading }: { data: BreakdownData | null; loading: boolean }) {
  return (
    <div className="p-6">
      <div className="w-fit space-y-6">
        {loading && <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>}
        {!loading && data && (
          <div className="flex gap-5 items-start">
            <Card title="Payment Plan">
              {data.paymentPlans.map((row) => (
                <Row key={row.plan} label={row.plan} value={row.count} />
              ))}
              <TotalRow label="Total" value={data.totalCloses} />
            </Card>

            <Card title="Close Type">
              {data.closeTypes.map((row) => (
                <Row key={row.type} label={row.type} value={row.count} />
              ))}
              <TotalRow label="Total" value={data.totalCloses} />
            </Card>

            <Card title="Cash by Close Type">
              {data.closeTypes.map((row) => (
                <Row key={row.type} label={row.type} value={fmt$(row.cash)} valueClass="text-green-400" />
              ))}
              <TotalRow label="Total" value={fmt$(data.totalCash)} valueClass="text-green-400" />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
