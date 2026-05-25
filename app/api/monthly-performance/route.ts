import { NextResponse } from "next/server";
import { getHubSpotAEData } from "@/lib/hubspot";
import { getSheetRows } from "@/lib/sheets";

function getMonthRange(monthsAgo: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
    label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

function toNum(val: string): number {
  const n = parseFloat((val || "").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function getCashByRep(from: string, to: string): Promise<Record<string, number>> {
  const rows = await getSheetRows("closes", "Date of close", from, to);
  const cash: Record<string, number> = {};
  for (const row of rows) {
    const closer = row["Closer"]?.trim();
    const amount = toNum(row["Upfront Cash"]);
    if (closer) cash[closer] = (cash[closer] || 0) + amount;
  }
  return cash;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeCash(hsData: any, cashByRep: Record<string, number>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reps = hsData.reps.map((rep: any) => {
    const cash = cashByRep[rep.name] ?? 0;
    return {
      ...rep,
      cashCollected: cash,
      cashPerCall: rep.scheduled > 0 ? cash / rep.scheduled : null,
    };
  });

  const totalCash = reps.reduce((sum: number, r: { cashCollected: number }) => sum + r.cashCollected, 0);
  const totalScheduled = hsData.totals.scheduled;

  return {
    reps,
    totals: {
      ...hsData.totals,
      cashCollected: totalCash,
      cashPerCall: totalScheduled > 0 ? totalCash / totalScheduled : null,
    },
  };
}

export async function GET() {
  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(1);

  const [hsThis, hsLast, cashThis, cashLast] = await Promise.all([
    getHubSpotAEData(thisMonth.from, thisMonth.to),
    getHubSpotAEData(lastMonth.from, lastMonth.to),
    getCashByRep(thisMonth.from, thisMonth.to),
    getCashByRep(lastMonth.from, lastMonth.to),
  ]);

  return NextResponse.json({
    current: { ...mergeCash(hsThis, cashThis), label: thisMonth.label },
    previous: { ...mergeCash(hsLast, cashLast), label: lastMonth.label },
  });
}
