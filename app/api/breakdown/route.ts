import { NextRequest, NextResponse } from "next/server";
import { getSheetRows } from "@/lib/sheets";

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

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || defaultFrom();
  const to = searchParams.get("to") || defaultTo();

  const rows = await getSheetRows("closes", "Date of close", from, to);

  const paymentPlans: Record<string, number> = {};
  const closeTypes: Record<string, { count: number; cash: number }> = {};
  let totalCloses = 0;
  let totalCash = 0;

  for (const row of rows) {
    const plan = row["Payment Plan"]?.trim();
    const type = row["Close type"]?.trim();
    const cash = toNum(row["Upfront Cash"]);
    const isPayment = row["Type"]?.trim().toLowerCase() === "payment";

    totalCash += cash;
    if (type) {
      if (!closeTypes[type]) closeTypes[type] = { count: 0, cash: 0 };
      closeTypes[type].cash += cash;
    }

    if (!isPayment) {
      totalCloses++;
      if (plan) paymentPlans[plan] = (paymentPlans[plan] || 0) + 1;
      if (type) closeTypes[type].count++;
    }
  }

  const paymentPlanRows = Object.entries(paymentPlans)
    .sort((a, b) => b[1] - a[1])
    .map(([plan, count]) => ({ plan, count }));

  const closeTypeRows = Object.entries(closeTypes)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([type, { count, cash }]) => ({ type, count, cash }));

  return NextResponse.json({
    totalCloses,
    totalCash,
    paymentPlans: paymentPlanRows,
    closeTypes: closeTypeRows,
  });
}
