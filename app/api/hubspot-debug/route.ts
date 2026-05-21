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

    // Try to look up owner names (requires crm.objects.owners.read scope)
    let owners: Record<string, string> = {};
    try {
      for (let after = 0; ; after += 100) {
        const o = await hs(`/crm/v3/owners?limit=100&after=${after}`);
        for (const owner of o.results ?? []) {
          owners[owner.id] = `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email;
        }
        if (!o.paging?.next) break;
      }
    } catch (_e) {
      owners = { error: "owners API not accessible (missing scope)" } as Record<string, string>;
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
