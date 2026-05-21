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

// Search ALL deals where setter is one of the SDR names (no date filter — date filtering
// happens via the contact's aiaa_call_scheduled property after association lookup).
async function searchDealsBySetter(): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;
  do {
    const body: Record<string, unknown> = {
      filterGroups: SDR_SETTERS.map((setter) => ({
        filters: [{ propertyName: "setter", operator: "EQ", value: setter }],
      })),
      properties: ["hs_object_id"],
      limit: 100,
    };
    if (after) body.after = after;
    const result = await hs("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    ids.push(...result.results.map((d: { id: string }) => d.id));
    after = result.paging?.next?.after;
  } while (after);
  return ids;
}

// Returns Map<dealId, contactId> — one contact per deal (first associated contact).
async function getContactsForDeals(dealIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const batch of chunk(dealIds, 100)) {
    const result = await hs("/crm/v3/associations/deals/contacts/batch/read", {
      method: "POST",
      body: JSON.stringify({ inputs: batch.map((id) => ({ id })) }),
    });
    for (const item of result.results ?? []) {
      if (item.to?.length > 0) {
        map.set(item.from.id, item.to[0].id);
      }
    }
  }
  return map;
}

// Returns Map<contactId, aiaa_call_scheduled_ms>.
async function readContactDates(contactIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const batch of chunk(contactIds, 100)) {
    const result = await hs("/crm/v3/objects/contacts/batch/read", {
      method: "POST",
      body: JSON.stringify({
        inputs: batch.map((id) => ({ id })),
        properties: ["aiaa_call_scheduled"],
      }),
    });
    for (const contact of result.results ?? []) {
      const val = contact.properties?.aiaa_call_scheduled;
      if (val) map.set(contact.id, Number(val));
    }
  }
  return map;
}

interface DealProps {
  setter: string;
  dealstage: string;
  closed_lost_cause: string;
  hubspot_owner_id: string;
  amount: string;
}

async function readDeals(dealIds: string[]): Promise<{ id: string; properties: DealProps }[]> {
  const deals: { id: string; properties: DealProps }[] = [];
  for (const batch of chunk(dealIds, 100)) {
    const result = await hs("/crm/v3/objects/deals/batch/read", {
      method: "POST",
      body: JSON.stringify({
        inputs: batch.map((id) => ({ id })),
        properties: ["setter", "dealstage", "closed_lost_cause", "hubspot_owner_id", "amount"],
      }),
    });
    deals.push(...(result.results ?? []));
  }
  return deals;
}

// Maps HubSpot owner ID → AE display name.
const OWNER_TO_AE: Record<string, string> = {
  "77779084": "Peter",
  "76766176": "Logan",
  "644809822": "Andrew",
  "654260366": "Andrew",
};

type AEStats = { scheduled: number; showed: number; offered: number; closes: number; cashCollected: number };

function emptyStats(): AEStats {
  return { scheduled: 0, showed: 0, offered: 0, closes: 0, cashCollected: 0 };
}

export async function getHubSpotAEData(from: string, to: string) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(`${to}T23:59:59`).getTime();

  const allDealIds = await searchDealsBySetter();
  if (allDealIds.length === 0) return buildResponse({});

  const dealToContact = await getContactsForDeals(allDealIds);
  const contactIds = Array.from(new Set(dealToContact.values()));
  if (contactIds.length === 0) return buildResponse({});

  const contactDates = await readContactDates(contactIds);
  const deals = await readDeals(allDealIds);

  const stats: Record<string, AEStats> = {};
  for (const name of AE_NAMES) stats[name] = emptyStats();

  for (const deal of deals) {
    const { setter, dealstage, closed_lost_cause, hubspot_owner_id, amount } = deal.properties;
    if (!SDR_SETTERS.includes(setter)) continue;

    const contactId = dealToContact.get(deal.id);
    if (!contactId) continue;
    const callDate = contactDates.get(contactId);
    if (!callDate || callDate < fromMs || callDate > toMs) continue;

    const ae = OWNER_TO_AE[hubspot_owner_id];
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
