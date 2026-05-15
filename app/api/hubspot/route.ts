import { NextRequest, NextResponse } from "next/server";
import { getHubSpotAEData } from "@/lib/hubspot";

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

  try {
    const data = await getHubSpotAEData(from, to);
    return NextResponse.json(data);
  } catch (err) {
    console.error("HubSpot error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
