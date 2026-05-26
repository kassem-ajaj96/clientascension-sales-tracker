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

    // Fetch ALL properties of one sample deal to find hyros property names
    let sampleDealAllProps: Record<string, unknown> = {};
    let hyrosProps: Record<string, unknown> = {};
    try {
      if (dealsResult.results?.length > 0) {
        const sampleId = dealsResult.results[0].id;
        const sampleDeal = await hs(`/crm/v3/objects/deals/${sampleId}?properties=hyros_first_source,hyros_first_source_platform,hyros_source,hyros_first_touch_source,first_source,hs_analytics_source`);
        sampleDealAllProps = sampleDeal.properties ?? {};
        // Extract only hyros-related
        hyrosProps = Object.fromEntries(
          Object.entries(sampleDeal.properties ?? {}).filter(([k]) => k.toLowerCase().includes("hyros") || k.toLowerCase().includes("source"))
        );
      }
    } catch (_e) {
      sampleDealAllProps = { error: String(_e) };
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
      sampleDealSourceProps: hyrosProps,
      sampleDealAllProps,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
