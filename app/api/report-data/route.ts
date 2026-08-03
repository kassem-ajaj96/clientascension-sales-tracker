import { NextRequest, NextResponse } from "next/server";
import { getHubSpotAllReportData, getHubSpotColdTrafficReportData } from "@/lib/hubspot";
import { getSheetRows } from "@/lib/sheets";

const SDR_NAMES = ["Antwon", "Noah"];

function toNum(val: string): number {
  const n = parseFloat((val || "").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function getMonthRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getSDRData(from: string, to: string) {
  const rows = await getSheetRows("sdr database", "Date", from, to);

  const byRep: Record<string, { dials: number; connects: number; convo: number; booked: number }> = {};
  for (const row of rows) {
    const name = row["Setter"]?.trim();
    if (!name) continue;
    if (!byRep[name]) byRep[name] = { dials: 0, connects: 0, convo: 0, booked: 0 };
    byRep[name].dials += toNum(row["Dials"]);
    byRep[name].connects += toNum(row["Connects"]);
    byRep[name].convo += toNum(row["Conversation"]);
    byRep[name].booked += toNum(row["Meetings booked"]);
  }

  const reps = SDR_NAMES.map((name) => {
    const r = byRep[name] || { dials: 0, connects: 0, convo: 0, booked: 0 };
    return {
      name,
      dials: r.dials,
      connects: r.connects,
      convo: r.convo,
      meetingsBooked: r.booked,
      connectionRate: r.dials > 0 ? r.connects / r.dials : null,
      connectToConvo: r.connects > 0 ? r.convo / r.connects : null,
      convoToBooking: r.convo > 0 ? r.booked / r.convo : null,
      connectToBooking: r.connects > 0 ? r.booked / r.connects : null,
      dialToBooking: r.dials > 0 ? r.booked / r.dials : null,
    };
  });

  const raw = reps.reduce(
    (acc, r) => ({ dials: acc.dials + r.dials, connects: acc.connects + r.connects, convo: acc.convo + r.convo, meetingsBooked: acc.meetingsBooked + r.meetingsBooked }),
    { dials: 0, connects: 0, convo: 0, meetingsBooked: 0 }
  );

  return {
    reps,
    totals: {
      ...raw,
      connectionRate: raw.dials > 0 ? raw.connects / raw.dials : null,
      connectToConvo: raw.connects > 0 ? raw.convo / raw.connects : null,
      convoToBooking: raw.convo > 0 ? raw.meetingsBooked / raw.convo : null,
      connectToBooking: raw.connects > 0 ? raw.meetingsBooked / raw.connects : null,
      dialToBooking: raw.dials > 0 ? raw.meetingsBooked / raw.dials : null,
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = currentYearMonth();
  const month1 = searchParams.get("month1") || now;
  const month2 = searchParams.get("month2") || prevYearMonth(now);

  const r1 = getMonthRange(month1);
  const r2 = getMonthRange(month2);

  try {
    // 2 HubSpot calls (each fetches all deals once, filters both months in-memory)
    // + 2 Google Sheets calls for SDR — all run in parallel
    const [cold, hs, sdr1, sdr2] = await Promise.all([
      getHubSpotColdTrafficReportData(r1.from, r1.to, r2.from, r2.to),
      getHubSpotAllReportData(r1.from, r1.to, r2.from, r2.to),
      getSDRData(r1.from, r1.to),
      getSDRData(r2.from, r2.to),
    ]);

    return NextResponse.json({
      cold1: cold.month1, cold2: cold.month2,
      sdr1, sdr2,
      hsAll1: hs.all1, hsAll2: hs.all2,
      hsAntwon1: hs.antwon1, hsAntwon2: hs.antwon2,
      hsNoah1: hs.noah1, hsNoah2: hs.noah2,
    });
  } catch (err) {
    console.error("Report data error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
