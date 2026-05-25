import { NextResponse } from "next/server";
import { getHubSpotAEData } from "@/lib/hubspot";

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

export async function GET() {
  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(1);

  const [current, previous] = await Promise.all([
    getHubSpotAEData(thisMonth.from, thisMonth.to),
    getHubSpotAEData(lastMonth.from, lastMonth.to),
  ]);

  return NextResponse.json({
    current: { ...current, label: thisMonth.label },
    previous: { ...previous, label: lastMonth.label },
  });
}
