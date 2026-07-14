import { NextRequest, NextResponse } from "next/server";
import { getSheetRows } from "@/lib/sheets";

const AE_NAMES = ["Peter", "Logan", "Andrew", "Ciaran"];

function toNum(val: string): number {
  const n = parseFloat((val || "").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
    label: new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

function prevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getMonthData(from: string, to: string, label: string) {
  const [aeRows, closesRows] = await Promise.all([
    getSheetRows("ae database", "Date", from, to),
    getSheetRows("closes", "Date of close", from, to),
  ]);

  const byCloser: Record<string, { scheduled: number; showed: number; offered: number; closes: number; cash: number }> = {};
  for (const name of AE_NAMES) {
    byCloser[name] = { scheduled: 0, showed: 0, offered: 0, closes: 0, cash: 0 };
  }

  for (const row of aeRows) {
    const name = row["Closer"]?.trim();
    if (!name || !byCloser[name]) continue;
    byCloser[name].scheduled += toNum(row["Scheduled calls"]);
    byCloser[name].showed += toNum(row["Live calls"]);
    byCloser[name].offered += toNum(row["Offers"]);
  }

  for (const row of closesRows) {
    const name = row["Closer"]?.trim();
    if (!name || !byCloser[name]) continue;
    const isPayment = row["Type"]?.trim().toLowerCase() === "payment";
    byCloser[name].cash += toNum(row["Upfront Cash"]);
    if (!isPayment) byCloser[name].closes += 1;
  }

  const reps = AE_NAMES.map((name) => {
    const s = byCloser[name];
    return {
      name,
      scheduled: s.scheduled,
      showed: s.showed,
      offered: s.offered,
      closes: s.closes,
      cashCollected: s.cash,
      showRate: s.scheduled > 0 ? s.showed / s.scheduled : null,
      offerRate: s.showed > 0 ? s.offered / s.showed : null,
      closeRate: s.showed > 0 ? s.closes / s.showed : null,
      cashPerCall: s.scheduled > 0 ? s.cash / s.scheduled : null,
    };
  });

  const raw = reps.reduce(
    (acc, r) => ({
      scheduled: acc.scheduled + r.scheduled,
      showed: acc.showed + r.showed,
      offered: acc.offered + r.offered,
      closes: acc.closes + r.closes,
      cashCollected: acc.cashCollected + r.cashCollected,
    }),
    { scheduled: 0, showed: 0, offered: 0, closes: 0, cashCollected: 0 }
  );

  return {
    reps,
    totals: {
      ...raw,
      showRate: raw.scheduled > 0 ? raw.showed / raw.scheduled : null,
      offerRate: raw.showed > 0 ? raw.offered / raw.showed : null,
      closeRate: raw.showed > 0 ? raw.closes / raw.showed : null,
      cashPerCall: raw.scheduled > 0 ? raw.cashCollected / raw.scheduled : null,
    },
    label,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = currentYearMonth();
  const month1 = searchParams.get("month1") || now;
  const month2 = searchParams.get("month2") || prevYearMonth(now);

  const range1 = getMonthRange(month1);
  const range2 = getMonthRange(month2);

  const [current, previous] = await Promise.all([
    getMonthData(range1.from, range1.to, range1.label),
    getMonthData(range2.from, range2.to, range2.label),
  ]);

  return NextResponse.json({ current, previous });
}
