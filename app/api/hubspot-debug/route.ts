import { NextResponse } from "next/server";

const BASE = "https://api.hubapi.com";

async function hs(path: string, options: RequestInit = {}) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN is not set");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET() {
  try {
    // Get unique owner IDs from deals with setter=Antwon
    const dealsResult = await hs("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: "setter", operator: "EQ", value: "Antwon" }] },
          { filters: [{ propertyName: "setter", operator: "EQ", value: "Erten" }] },
          { filters: [{ propertyName: "setter", operator: "EQ", value: "Noah" }] },
        ],
        properties: ["setter", "hubspot_owner_id"],
        limit: 100,
      }),
    });

    const ownerIds = Array.from(
      new Set(
        dealsResult.results
          .map((d: { properties: { hubspot_owner_id: string } }) => d.properties.hubspot_owner_id)
          .filter(Boolean)
      )
    ) as string[];

    // Look up each owner ID individually
    const owners: Record<string, string> = {};
    for (const id of ownerIds) {
      try {
        const o = await hs(`/crm/v3/owners/${id}`);
        owners[id] = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email || id;
      } catch (_e) {
        owners[id] = "lookup failed";
      }
    }

    return NextResponse.json({
      totalDeals: dealsResult.total,
      uniqueOwnerIds: ownerIds,
      ownerNames: owners,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
