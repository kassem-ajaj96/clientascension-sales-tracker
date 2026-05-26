const BASE = "https://api.hubapi.com";

const SDR_SETTERS = ["Antwon", "Erten", "Noah"];
const AE_NAMES = ["Peter", "Logan", "Andrew", "Ciaran", "Fourkan"];

// AIAA Pipeline stage IDs
const SHOWED_STAGES = new Set([
  "1164856622",  // Holding Nurturing
  "1164987316",  // Hot List
  "1164987317",  // Follow Up
  "1164987318",  // Closed Won
  "1164987319",  // Closed Lost
]);

const OFFERED_STAGES = new Set([
  "1164856622",  // Holding Nurturing
  "1164987316",  // Hot List
  "1164987317",  // Follow Up
  "1164987318",  // Closed Won
]);

const MEETING_SCHEDULED = "1164987313";  // AIAA Pipeline → Meeting Scheduled
const CLOSED_WON = "1164987318";
const CLOSED_LOST = "1164987319";

function isOffered(stage: string, closedLostCause: string): boolean {
  if (OFFERED_STAGES.has(stage)) return true;
  if (stage === CLOSED_LOST && closedLostCause?.startsWith("Offered - ")) return true;
  return false;
}

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface DealProps {
  setter: string;
  dealstage: string;
  closed_lost_cause: string;
  hubspot_owner_id: string;
  amount: string;
  aiaa_call_scheduled: string;
}

async function searchDeals(
  setterFilter: string | null,
  extraFilters: Record<string, unknown>[] = [],
  properties: string[] = ["setter", "dealstage", "closed_lost_cause", "hubspot_owner_id", "amount", "aiaa_call_scheduled"]
): Promise<{ id: string; properties: DealProps }[]> {
  const setters = setterFilter ? [setterFilter] : SDR_SETTERS;
  const deals: { id: string; properties: DealProps }[] = [];
  let after: string | undefined;
  do {
    const body: Record<string, unknown> = {
      filterGroups: setters.map((setter) => ({
        filters: [
          { propertyName: "setter", operator: "EQ", value: setter },
          ...extraFilters,
        ],
      })),
      properties,
      limit: 100,
    };
    if (after) body.after = after;
    const result = await hs("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    deals.push(...(result.results ?? []));
    after = result.paging?.next?.after;
  } while (after);
  return deals;
}

async function buildOwnerMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const result = await hs("/crm/v3/owners?limit=100");
    for (const owner of result.results ?? []) {
      const firstName = (owner.firstName ?? "").trim();
      if (AE_NAMES.includes(firstName)) {
        map[String(owner.id)] = firstName;
      }
    }
  } catch (_e) {
    // Fall back to hardcoded map if owners API fails
    Object.assign(map, {
      "191709153": "Peter",
      "83317424": "Logan",
      "83529533": "Andrew",
    });
  }
  return map;
}

type AEStats = { scheduled: number; meetingScheduled: number; showed: number; offered: number; closes: number; cashCollected: number };

function emptyStats(): AEStats {
  return { scheduled: 0, meetingScheduled: 0, showed: 0, offered: 0, closes: 0, cashCollected: 0 };
}

export async function getHubSpotAEData(from: string, to: string, setter: string | null = null) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(`${to}T23:59:59`).getTime();

  const [deals, closedWonDeals, ownerMap] = await Promise.all([
    // Scheduled/Showed/Offered: all setter deals, date-filtered in-process by aiaa_call_scheduled
    searchDeals(setter),
    // Closes/Cash: Closed Won deals filtered by closedate in the dashboard range
    searchDeals(
      setter,
      [
        { propertyName: "dealstage", operator: "EQ", value: CLOSED_WON },
        { propertyName: "closedate", operator: "GTE", value: String(fromMs) },
        { propertyName: "closedate", operator: "LTE", value: String(toMs) },
      ],
      ["setter", "hubspot_owner_id", "amount"]
    ),
    buildOwnerMap(),
  ]);

  const stats: Record<string, AEStats> = {};
  for (const name of AE_NAMES) stats[name] = emptyStats();

  for (const deal of deals) {
    const { setter: dealSetter, dealstage, closed_lost_cause, hubspot_owner_id, aiaa_call_scheduled } = deal.properties;
    if (!SDR_SETTERS.includes(dealSetter)) continue;

    if (!aiaa_call_scheduled) continue;
    const callMs = new Date(aiaa_call_scheduled).getTime();
    if (isNaN(callMs) || callMs < fromMs || callMs > toMs) continue;

    const ae = ownerMap[hubspot_owner_id];
    if (!ae) continue;

    stats[ae].scheduled++;
    if (dealstage === MEETING_SCHEDULED) stats[ae].meetingScheduled++;
    if (SHOWED_STAGES.has(dealstage)) stats[ae].showed++;
    if (isOffered(dealstage, closed_lost_cause ?? "")) stats[ae].offered++;
  }

  for (const deal of closedWonDeals) {
    const { hubspot_owner_id, amount } = deal.properties;
    const ae = ownerMap[hubspot_owner_id];
    if (!ae) continue;
    stats[ae].closes++;
    stats[ae].cashCollected += parseFloat(amount || "0") || 0;
  }

  return buildResponse(stats);
}

// ── Cold Traffic ──────────────────────────────────────────────────────────────

const COLD_TRAFFIC_SOURCES = [
  "Client Ascension Ads",
  "CA 2",
  "AIBC 3 - Retargeting - YT",
  "Brand - Client Ascension",
  "Client Ascension Search",
  "AIAA Free Training 2 - Cold",
  "AIAA Retargeting",
  "Brand - AI Assisted Agency",
  "AIAA Cold V1",
  "YT AI Business Challenge 1",
  "AIAA Free Training 1",
  "AIAA Cold V1 - AI Marketing Tools (Males 25-44)",
  "AIAA Cold V1 - Freelancing with AI (Males 25-44)",
  "AIBC 2 - Branded Search",
  "AIBC 2 (Warm)",
  "Daniel Fazio Placement - Client Ascension Offers",
];

async function searchColdTrafficDeals(): Promise<{ id: string; properties: DealProps }[]> {
  const deals: { id: string; properties: DealProps }[] = [];
  let after: string | undefined;
  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hyros_first_source",
              operator: "IN",
              values: COLD_TRAFFIC_SOURCES,
            },
          ],
        },
      ],
      properties: ["hubspot_owner_id", "dealstage", "closed_lost_cause", "aiaa_call_scheduled"],
      limit: 100,
    };
    if (after) body.after = after;
    const result = await hs("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    deals.push(...(result.results ?? []));
    after = result.paging?.next?.after;
  } while (after);
  return deals;
}

type CTStats = { calls: number; liveCalls: number; offers: number; closes: number };

function emptyCTStats(): CTStats {
  return { calls: 0, liveCalls: 0, offers: 0, closes: 0 };
}

export async function getHubSpotColdTrafficData(from: string, to: string) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(`${to}T23:59:59`).getTime();

  const [deals, ownerMap] = await Promise.all([
    searchColdTrafficDeals(),
    buildOwnerMap(),
  ]);

  const stats: Record<string, CTStats> = {};
  for (const name of AE_NAMES) stats[name] = emptyCTStats();

  for (const deal of deals) {
    const { dealstage, closed_lost_cause, hubspot_owner_id, aiaa_call_scheduled } = deal.properties;

    if (!aiaa_call_scheduled) continue;
    const callMs = new Date(aiaa_call_scheduled).getTime();
    if (isNaN(callMs) || callMs < fromMs || callMs > toMs) continue;

    const ae = ownerMap[hubspot_owner_id];
    if (!ae) continue;

    stats[ae].calls++;
    if (SHOWED_STAGES.has(dealstage)) stats[ae].liveCalls++;
    if (isOffered(dealstage, closed_lost_cause ?? "")) stats[ae].offers++;
    if (dealstage === CLOSED_WON) stats[ae].closes++;
  }

  const reps = AE_NAMES.map((name) => {
    const s = stats[name] ?? emptyCTStats();
    return {
      name,
      calls: s.calls,
      liveCalls: s.liveCalls,
      offers: s.offers,
      closes: s.closes,
      showRate: s.calls > 0 ? s.liveCalls / s.calls : null,
      offerRate: s.liveCalls > 0 ? s.offers / s.liveCalls : null,
      closeRate: s.liveCalls > 0 ? s.closes / s.liveCalls : null,
    };
  });

  const raw = reps.reduce(
    (acc, r) => ({
      calls: acc.calls + r.calls,
      liveCalls: acc.liveCalls + r.liveCalls,
      offers: acc.offers + r.offers,
      closes: acc.closes + r.closes,
    }),
    emptyCTStats()
  );

  return {
    reps,
    totals: {
      ...raw,
      showRate: raw.calls > 0 ? raw.liveCalls / raw.calls : null,
      offerRate: raw.liveCalls > 0 ? raw.offers / raw.liveCalls : null,
      closeRate: raw.liveCalls > 0 ? raw.closes / raw.liveCalls : null,
    },
  };
}

// ── SDR → AE ──────────────────────────────────────────────────────────────────

function buildResponse(stats: Record<string, AEStats>) {
  const reps = AE_NAMES.map((name) => {
    const s = stats[name] ?? emptyStats();
    return {
      name,
      scheduled: s.scheduled,
      meetingScheduled: s.meetingScheduled,
      showed: s.showed,
      offered: s.offered,
      closes: s.closes,
      cashCollected: s.cashCollected,
      showRate: s.scheduled > 0 ? s.showed / s.scheduled : null,
      offerRate: s.showed > 0 ? s.offered / s.showed : null,
      closeRate: s.showed > 0 ? s.closes / s.showed : null,
      cashPerCall: s.scheduled > 0 ? s.cashCollected / s.scheduled : null,
    };
  });

  const raw = reps.reduce(
    (acc, r) => ({
      scheduled: acc.scheduled + r.scheduled,
      meetingScheduled: acc.meetingScheduled + r.meetingScheduled,
      showed: acc.showed + r.showed,
      offered: acc.offered + r.offered,
      closes: acc.closes + r.closes,
      cashCollected: acc.cashCollected + r.cashCollected,
    }),
    emptyStats()
  );

  return {
    reps,
    totals: {
      ...raw,
      showRate: raw.scheduled > 0 ? raw.showed / raw.scheduled : null,
      offerRate: raw.showed > 0 ? raw.offered / raw.showed : null,
      closeRate: raw.showed > 0 ? raw.closes / raw.showed : null,
      cashPerCall: raw.scheduled > 0 ? raw.cashCollected / raw.scheduled : null,
    },
  };
}
