import { NextRequest, NextResponse } from "next/server";
import { getSheetRows } from "@/lib/sheets";

const SDR_NAMES = ["Antwon", "Erten", "Noah"];

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

  const rows = await getSheetRows("sdr database", "Date", from, to);

  const byRep: Record<string, { dials: number; connects: number; convo: number; booked: number }> = {};
  for (const row of rows) {
    const name = row["Closer"]?.trim();
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
    (acc, r) => ({
      dials: acc.dials + r.dials,
      connects: acc.connects + r.connects,
      convo: acc.convo + r.convo,
      meetingsBooked: acc.meetingsBooked + r.meetingsBooked,
    }),
    { dials: 0, connects: 0, convo: 0, meetingsBooked: 0 }
  );

  const totals = {
    ...raw,
    connectionRate: raw.dials > 0 ? raw.connects / raw.dials : null,
    connectToConvo: raw.connects > 0 ? raw.convo / raw.connects : null,
    convoToBooking: raw.convo > 0 ? raw.meetingsBooked / raw.convo : null,
    connectToBooking: raw.connects > 0 ? raw.meetingsBooked / raw.connects : null,
    dialToBooking: raw.dials > 0 ? raw.meetingsBooked / raw.dials : null,
  };

  return NextResponse.json({ reps, totals });
}
