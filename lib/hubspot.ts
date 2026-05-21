const BASE = "https://api.hubapi.com";

const SDR_SETTERS = ["Antwon", "Erten", "Noah"];
const AE_NAMES = ["Peter", "Logan", "Andrew", "Ciaran", "Fourkan"];

const SHOWED_STAGES = new Set([
  "252639828",
  "presentationscheduled",
  "decisionmakerboughtin",
  "closedwon",
  "closedlost",
]);

const OFFERED_STAGES = new Set([
  "252639828",
  "presentationscheduled",
  "decisionmakerboughtin",
  "closedwon",
]);

function isOffered(stage: string, closedLostCause: string): boolean {
  if (OFFERED_STAGES.has(stage)) return true;
  if (stage === "closedlost" && closedLostCause?.startsWith("Offered - ")) return true;
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

// Search all deals where setter is one of the SDR names.
// aiaa_call_scheduled is a deal property but may not be indexed for search filters,
// so date filtering is done in-process after reading the property value.
async function searchDealsBySetter(): Promise<{ id: string; properties: DealProps }[]> {
  const deals: { id: string; properties: DealProps }[] = [];
  let after: string | undefined;
  do {
    const body: Record<string, unknown> = {
      filterGroups: SDR_SETTERS.map((setter) => ({
        filters: [{ propertyName: "setter", operator: "EQ", value: setter }],
      })),
      properties: [
        "setter",
        "dealstage",
        "closed_lost_cause",
        "hubspot_owner_id",
        "amount",
        "aiaa_call_scheduled",
      ],
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

type AEStats = { scheduled: number; showed: number; offered: number; closes: number; cashCollected: number };

function emptyStats(): AEStats {
  return { scheduled: 0, showed: 0, offered: 0, closes: 0, cashCollected: 0 };
}

export async function getHubSpotAEData(from: string, to: string) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(`${to}T23:59:59`).getTime();

  const [deals, ownerMap] = await Promise.all([
    searchDealsBySetter(),
    buildOwnerMap(),
  ]);

  const stats: Record<string, AEStats> = {};
  for (const name of AE_NAMES) stats[name] = emptyStats();

  for (const deal of deals) {
    const { setter, dealstage, closed_lost_cause, hubspot_owner_id, amount, aiaa_call_scheduled } = deal.properties;
    if (!SDR_SETTERS.includes(setter)) continue;

    // Filter by aiaa_call_scheduled date (deal property, parsed as ISO string or ms)
    if (!aiaa_call_scheduled) continue;
    const callMs = new Date(aiaa_call_scheduled).getTime();
    if (isNaN(callMs) || callMs < fromMs || callMs > toMs) continue;

    const ae = ownerMap[hubspot_owner_id];
    if (!ae) continue;

    stats[ae].scheduled++;
    if (SHOWED_STAGES.has(dealstage)) stats[ae].showed++;
    if (isOffered(dealstage, closed_lost_cause ?? "")) stats[ae].offered++;
    if (dealstage === "closedwon") {
      stats[ae].closes++;
      stats[ae].cashCollected += parseFloat(amount || "0") || 0;
    }
  }

  return buildResponse(stats);
}

function buildResponse(stats: Record<string, AEStats>) {
  const reps = AE_NAMES.map((name) => {
    const s = stats[name] ?? emptyStats();
    return {
      name,
      scheduled: s.scheduled,
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
