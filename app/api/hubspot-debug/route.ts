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
    // Fetch the first 3 deals where setter = Antwon, return raw properties
    const result = await hs("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: "setter", operator: "EQ", value: "Antwon" }] },
        ],
        properties: [
          "setter",
          "dealstage",
          "hubspot_owner_id",
          "amount",
          "aiaa_call_scheduled",
          "createdate",
        ],
        limit: 3,
      }),
    });

    return NextResponse.json({
      total: result.total,
      sample: result.results?.map((d: { id: string; properties: Record<string, string> }) => ({
        id: d.id,
        properties: d.properties,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
