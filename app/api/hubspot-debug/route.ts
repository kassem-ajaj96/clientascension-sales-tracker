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

    // List all owners
    const owners: Record<string, string> = {};
    try {
      const o = await hs("/crm/v3/owners?limit=100");
      for (const owner of o.results ?? []) {
        owners[String(owner.id)] = `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email || owner.id;
      }
    } catch (_e) {
      // Fall back to individual lookups
      for (const id of ownerIds) {
        try {
          const o = await hs(`/crm/v3/owners/${id}`);
          owners[id] = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email || id;
        } catch (_e2) {
          owners[id] = "lookup failed";
        }
      }
    }

    // Get unique deal stages
    const stagesResult = await hs("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: "setter", operator: "EQ", value: "Antwon" }] },
          { filters: [{ propertyName: "setter", operator: "EQ", value: "Erten" }] },
          { filters: [{ propertyName: "setter", operator: "EQ", value: "Noah" }] },
        ],
        properties: ["dealstage"],
        limit: 100,
      }),
    });

    const uniqueStages = Array.from(
      new Set(
        stagesResult.results.map((d: { properties: { dealstage: string } }) => d.properties.dealstage)
      )
    );

    // Get pipeline stages info
    let pipelineStages: Record<string, string> = {};
    try {
      const pipelines = await hs("/crm/v3/pipelines/deals");
      for (const pipeline of pipelines.results ?? []) {
        for (const stage of pipeline.stages ?? []) {
          pipelineStages[stage.id] = `${pipeline.label} → ${stage.label}`;
        }
      }
    } catch (_e) {
      pipelineStages = { error: "pipeline lookup failed" };
    }

    // Search for deals that have hyros_first_source set, show actual values
    let hyrosDeals: unknown[] = [];
    let hyrosSearchError = "";
    try {
      const hyrosResult = await hs("/crm/v3/objects/deals/search", {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [{
            filters: [{ propertyName: "hyros_first_source", operator: "HAS_PROPERTY" }]
          }],
          properties: ["hyros_first_source", "hyros_first_source_platform", "hubspot_owner_id", "aiaa_call_scheduled"],
          limit: 20,
        }),
      });
      hyrosDeals = (hyrosResult.results ?? []).map((d: { id: string; properties: Record<string, string> }) => ({
        id: d.id,
        hyros_first_source: d.properties.hyros_first_source,
        hyros_first_source_platform: d.properties.hyros_first_source_platform,
        aiaa_call_scheduled: d.properties.aiaa_call_scheduled,
        owner: d.properties.hubspot_owner_id,
      }));
    } catch (_e) {
      hyrosSearchError = String(_e);
    }

    return NextResponse.json({
      totalDeals: dealsResult.total,
      uniqueOwnerIds: ownerIds,
      ownerNames: owners,
      uniqueDealStages: uniqueStages,
      stageLabels: Object.fromEntries(
        uniqueStages.map((id) => [id, pipelineStages[id as string] ?? "unknown"])
      ),
      allPipelineStages: pipelineStages,
      hyrosDeals,
      hyrosSearchError,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
