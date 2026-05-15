import { NextRequest, NextResponse } from "next/server";
import { getSheetRows } from "@/lib/sheets";

const AE_NAMES = ["Peter", "Logan", "Andrew", "Ciaran", "Fourkan"];

function toNum(val: string): number {
  const n = parseFloat((val || "").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function defaultFrom() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function defaultTo() {
  return new Date().toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || defaultFrom();
  const to = searchParams.get("to") || defaultTo();

  const [aeRows, closesRows] = await Promise.all([
    getSheetRows("ae database", "Date", from, to),
    getSheetRows("closes", "Date of close", from, to),
  ]);

  const aeByCloser: Record<string, { scheduled: number; live: number; offers: number }> = {};
  for (const row of aeRows) {
    const name = row["Closer"]?.trim();
    if (!name) continue;
    if (!aeByCloser[name]) aeByCloser[name] = { scheduled: 0, live: 0, offers: 0 };
    aeByCloser[name].scheduled += toNum(row["Scheduled calls"]);
    aeByCloser[name].live += toNum(row["Live calls"]);
    aeByCloser[name].offers += toNum(row["Offers"]);
  }

  const closesByCloser: Record<string, { closes: number; cash: number }> = {};
  for (const row of closesRows) {
    const name = row["Closer"]?.trim();
    if (!name) continue;
    if (!closesByCloser[name]) closesByCloser[name] = { closes: 0, cash: 0 };
    closesByCloser[name].closes += 1;
    closesByCloser[name].cash += toNum(row["Upfront Cash"]);
  }

  const reps = AE_NAMES.map((name) => {
    const ae = aeByCloser[name] || { scheduled: 0, live: 0, offers: 0 };
    const cl = closesByCloser[name] || { closes: 0, cash: 0 };
    return {
      name,
      scheduled: ae.scheduled,
      liveCalls: ae.live,
      offers: ae.offers,
      closes: cl.closes,
      cashCollected: cl.cash,
      showRate: ae.scheduled > 0 ? ae.live / ae.scheduled : null,
      offerRate: ae.live > 0 ? ae.offers / ae.live : null,
      closeRate: ae.live > 0 ? cl.closes / ae.live : null,
      cashPerCall: ae.scheduled > 0 ? cl.cash / ae.scheduled : null,
    };
  });

  const raw = reps.reduce(
    (acc, r) => ({
      scheduled: acc.scheduled + r.scheduled,
      liveCalls: acc.liveCalls + r.liveCalls,
      offers: acc.offers + r.offers,
      closes: acc.closes + r.closes,
      cashCollected: acc.cashCollected + r.cashCollected,
    }),
    { scheduled: 0, liveCalls: 0, offers: 0, closes: 0, cashCollected: 0 }
  );

  const totals = {
    ...raw,
    showRate: raw.scheduled > 0 ? raw.liveCalls / raw.scheduled : null,
    offerRate: raw.liveCalls > 0 ? raw.offers / raw.liveCalls : null,
    closeRate: raw.liveCalls > 0 ? raw.closes / raw.liveCalls : null,
    cashPerCall: raw.scheduled > 0 ? raw.cashCollected / raw.scheduled : null,
  };

  return NextResponse.json({ reps, totals });
}
