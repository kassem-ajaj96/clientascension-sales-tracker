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
  hyros_first_source: string;
  closedate: string;
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

const COLD_TRAFFIC_KEYWORDS = [
  "cold",
  "statics",
  "AIBC",
  "CB Traveling",
  "DF Evan",
  "free training",
  "retargeting",
  "SWAW",
  "Daniel Fazio Placement - AIAA Ads - DF - YT - Ayman 10/1 - Set 2 - Direct Angle 2",
  "These_ai_offers_are_working_right_now_steal_them",
  "Winners up to 12/30/2025 - No Optin",
  "Youtube_ads_description",
  "YT AIAA",
];

function isColdTrafficSource(source: string): boolean {
  const lower = source.toLowerCase();
  return COLD_TRAFFIC_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

// Owner IDs for the 5 AEs — used to narrow the cold traffic search server-side
const AE_OWNER_IDS = ["191709153", "83317424", "83529533", "90936901", "90936902"];

async function searchColdTrafficDeals(): Promise<{ id: string; properties: DealProps }[]> {
  const deals: { id: string; properties: DealProps }[] = [];
  let after: string | undefined;
  do {
    const body: Record<string, unknown> = {
      filterGroups: AE_OWNER_IDS.map((ownerId) => ({
        filters: [
          { propertyName: "hyros_first_source", operator: "HAS_PROPERTY" },
          { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId },
        ],
      })),
      properties: ["hubspot_owner_id", "dealstage", "closed_lost_cause", "aiaa_call_scheduled", "hyros_first_source", "closedate"],
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
    const { dealstage, closed_lost_cause, hubspot_owner_id, aiaa_call_scheduled, hyros_first_source, closedate } = deal.properties;

    if (!hyros_first_source || !isColdTrafficSource(hyros_first_source)) continue;

    const ae = ownerMap[hubspot_owner_id];
    if (!ae) continue;

    // Calls / shows / offers: filtered by aiaa_call_scheduled date
    if (aiaa_call_scheduled) {
      const callMs = new Date(aiaa_call_scheduled).getTime();
      if (!isNaN(callMs) && callMs >= fromMs && callMs <= toMs) {
        stats[ae].calls++;
        if (SHOWED_STAGES.has(dealstage)) stats[ae].liveCalls++;
        if (isOffered(dealstage, closed_lost_cause ?? "")) stats[ae].offers++;
      }
    }

    // Closes: filtered by closedate
    if (dealstage === CLOSED_WON && closedate) {
      const closedMs = new Date(closedate).getTime();
      if (!isNaN(closedMs) && closedMs >= fromMs && closedMs <= toMs) {
        stats[ae].closes++;
      }
    }
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

// ── Report batch helpers (fetch once, filter both months in-memory) ───────────

function buildCTResponse(stats: Record<string, CTStats>) {
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
    (acc, r) => ({ calls: acc.calls + r.calls, liveCalls: acc.liveCalls + r.liveCalls, offers: acc.offers + r.offers, closes: acc.closes + r.closes }),
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

export async function getHubSpotColdTrafficReportData(
  m1From: string, m1To: string,
  m2From: string, m2To: string
) {
  const fromMs1 = new Date(m1From).getTime();
  const toMs1 = new Date(`${m1To}T23:59:59`).getTime();
  const fromMs2 = new Date(m2From).getTime();
  const toMs2 = new Date(`${m2To}T23:59:59`).getTime();

  const [deals, ownerMap] = await Promise.all([searchColdTrafficDeals(), buildOwnerMap()]);

  const make = () => Object.fromEntries(AE_NAMES.map((n) => [n, emptyCTStats()])) as Record<string, CTStats>;
  const stats1 = make();
  const stats2 = make();

  for (const deal of deals) {
    const { dealstage, closed_lost_cause, hubspot_owner_id, aiaa_call_scheduled, hyros_first_source, closedate } = deal.properties;
    if (!hyros_first_source || !isColdTrafficSource(hyros_first_source)) continue;
    const ae = ownerMap[hubspot_owner_id];
    if (!ae) continue;

    if (aiaa_call_scheduled) {
      const callMs = new Date(aiaa_call_scheduled).getTime();
      if (!isNaN(callMs)) {
        for (const [s, fromMs, toMs] of [[stats1, fromMs1, toMs1], [stats2, fromMs2, toMs2]] as const) {
          if (callMs >= fromMs && callMs <= toMs) {
            s[ae].calls++;
            if (SHOWED_STAGES.has(dealstage)) s[ae].liveCalls++;
            if (isOffered(dealstage, closed_lost_cause ?? "")) s[ae].offers++;
          }
        }
      }
    }
    if (dealstage === CLOSED_WON && closedate) {
      const closedMs = new Date(closedate).getTime();
      if (!isNaN(closedMs)) {
        for (const [s, fromMs, toMs] of [[stats1, fromMs1, toMs1], [stats2, fromMs2, toMs2]] as const) {
          if (closedMs >= fromMs && closedMs <= toMs) s[ae].closes++;
        }
      }
    }
  }

  return { month1: buildCTResponse(stats1), month2: buildCTResponse(stats2) };
}

// Fetches ALL setter deals once and returns data split by setter view × month.
export async function getHubSpotAllReportData(
  m1From: string, m1To: string,
  m2From: string, m2To: string
) {
  const fromMs1 = new Date(m1From).getTime();
  const toMs1 = new Date(`${m1To}T23:59:59`).getTime();
  const fromMs2 = new Date(m2From).getTime();
  const toMs2 = new Date(`${m2To}T23:59:59`).getTime();

  const [deals, ownerMap] = await Promise.all([
    searchDeals(null, [], ["setter", "dealstage", "closed_lost_cause", "hubspot_owner_id", "amount", "aiaa_call_scheduled", "closedate"]),
    buildOwnerMap(),
  ]);

  const VIEWS = ["All", "Antwon", "Noah"] as const;
  const makeAEStats = () => Object.fromEntries(AE_NAMES.map((n) => [n, emptyStats()])) as Record<string, AEStats>;
  const sm: Record<string, { m1: Record<string, AEStats>; m2: Record<string, AEStats> }> = {};
  for (const v of VIEWS) sm[v] = { m1: makeAEStats(), m2: makeAEStats() };

  for (const deal of deals) {
    const { setter: dealSetter, dealstage, closed_lost_cause, hubspot_owner_id, aiaa_call_scheduled, closedate, amount } = deal.properties;
    if (!SDR_SETTERS.includes(dealSetter)) continue;
    const ae = ownerMap[hubspot_owner_id];
    if (!ae) continue;

    const views: string[] = ["All"];
    if (sm[dealSetter]) views.push(dealSetter);

    for (const view of views) {
      if (aiaa_call_scheduled) {
        const callMs = new Date(aiaa_call_scheduled).getTime();
        if (!isNaN(callMs)) {
          for (const [s, fromMs, toMs] of [[sm[view].m1, fromMs1, toMs1], [sm[view].m2, fromMs2, toMs2]] as const) {
            if (callMs >= fromMs && callMs <= toMs) {
              s[ae].scheduled++;
              if (dealstage === MEETING_SCHEDULED) s[ae].meetingScheduled++;
              if (SHOWED_STAGES.has(dealstage)) s[ae].showed++;
              if (isOffered(dealstage, closed_lost_cause ?? "")) s[ae].offered++;
            }
          }
        }
      }
      if (dealstage === CLOSED_WON && closedate) {
        const closedMs = new Date(closedate).getTime();
        if (!isNaN(closedMs)) {
          for (const [s, fromMs, toMs] of [[sm[view].m1, fromMs1, toMs1], [sm[view].m2, fromMs2, toMs2]] as const) {
            if (closedMs >= fromMs && closedMs <= toMs) {
              s[ae].closes++;
              s[ae].cashCollected += parseFloat(amount || "0") || 0;
            }
          }
        }
      }
    }
  }

  return {
    all1: buildResponse(sm["All"].m1),   all2: buildResponse(sm["All"].m2),
    antwon1: buildResponse(sm["Antwon"].m1), antwon2: buildResponse(sm["Antwon"].m2),
    noah1: buildResponse(sm["Noah"].m1),  noah2: buildResponse(sm["Noah"].m2),
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
