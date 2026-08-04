"use client";
import React, { useState } from "react";

interface RepStats {
  name: string;
  scheduled: number;
  showed: number;
  offered: number;
  closes: number;
  cashCollected: number;
  cashPerCall: number | null;
  showRate: number | null;
  offerRate: number | null;
  closeRate: number | null;
}

interface MonthSnapshot {
  reps: RepStats[];
  totals: Omit<RepStats, "name">;
  label: string;
}

interface MonthlyData {
  current: MonthSnapshot;
  previous: MonthSnapshot;
}

const AES = ["All Team", "Peter", "Logan", "Andrew", "Ciaran"] as const;
type AEName = (typeof AES)[number];

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevYearMonth(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions(count: number): { value: string; label: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

function getMonthRange(ym: string): { from: string; to: string; label: string } {
  const [year, month] = ym.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
    label: new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

const MONTH_OPTIONS = getMonthOptions(12);

function fmt$(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtPct(v: number | null) {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function getStats(snapshot: MonthSnapshot, name: AEName): Omit<RepStats, "name"> {
  if (name === "All Team") return snapshot.totals;
  return (
    snapshot.reps.find((r) => r.name === name) ?? {
      scheduled: 0,
      showed: 0,
      offered: 0,
      closes: 0,
      cashCollected: 0,
      cashPerCall: null,
      showRate: null,
      offerRate: null,
      closeRate: null,
    }
  );
}

interface MetricRow {
  label: string;
  currDisplay: string;
  prevDisplay: string;
  diff: number | null;
  diffDisplay: string | null;
}

function buildRows(curr: Omit<RepStats, "name">, prev: Omit<RepStats, "name">): MetricRow[] {
  function numRow(label: string, c: number, p: number): MetricRow {
    const diff = c - p;
    return {
      label,
      currDisplay: String(c),
      prevDisplay: String(p),
      diff,
      diffDisplay: diff !== 0 ? `${diff > 0 ? "+" : ""}${diff}` : null,
    };
  }

  function cashRow(label: string, c: number, p: number): MetricRow {
    const diff = c - p;
    return {
      label,
      currDisplay: fmt$(c),
      prevDisplay: fmt$(p),
      diff,
      diffDisplay: diff !== 0 ? `${diff > 0 ? "+" : ""}${fmt$(diff)}` : null,
    };
  }

  function cashNullRow(label: string, c: number | null, p: number | null): MetricRow {
    const diff = c !== null && p !== null ? c - p : null;
    return {
      label,
      currDisplay: c !== null ? fmt$(c) : "—",
      prevDisplay: p !== null ? fmt$(p) : "—",
      diff,
      diffDisplay: diff !== null && diff !== 0 ? `${diff > 0 ? "+" : ""}${fmt$(diff)}` : null,
    };
  }

  function pctRow(label: string, c: number | null, p: number | null): MetricRow {
    const diff = c !== null && p !== null ? c - p : null;
    return {
      label,
      currDisplay: fmtPct(c),
      prevDisplay: fmtPct(p),
      diff,
      diffDisplay:
        diff !== null && diff !== 0
          ? `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)}%`
          : null,
    };
  }

  return [
    numRow("Calls", curr.scheduled, prev.scheduled),
    numRow("Shows", curr.showed, prev.showed),
    numRow("Offers", curr.offered, prev.offered),
    numRow("Closes", curr.closes, prev.closes),
    cashRow("Cash Collected", curr.cashCollected, prev.cashCollected),
    cashNullRow("Cash / Call", curr.cashPerCall, prev.cashPerCall),
    pctRow("Show Rate", curr.showRate, prev.showRate),
    pctRow("Offer Rate", curr.offerRate, prev.offerRate),
    pctRow("Close Rate", curr.closeRate, prev.closeRate),
  ];
}

// ---------------------------------------------------------------------------
// PDF report HTML builder
// ---------------------------------------------------------------------------

function buildReportHTML(
  monthlyData: MonthlyData | null,
  m1Label: string,
  m2Label: string,
  cold1: any, cold2: any,
  sdr1: any, sdr2: any,
  hsAll1: any, hsAll2: any,
  hsAntwon1: any, hsAntwon2: any,
  hsNoah1: any, hsNoah2: any,
  generatedAt: string
): string {
  const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
  const $m = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const $mOrDash = (n: number | null) => (n === null ? "—" : $m(n));

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111; background: white; }
    .page { padding: 40px 40px 64px; page-break-after: always; position: relative; min-height: 100vh; }
    .page:last-child { page-break-after: avoid; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #e53e1e; padding-bottom: 12px; margin-bottom: 24px; }
    .brand { font-size: 15px; font-weight: 900; color: #e53e1e; letter-spacing: 0.08em; text-transform: uppercase; }
    .period { font-size: 12px; font-weight: 600; color: #555; }
    .title { font-size: 20px; font-weight: 800; color: #111; margin-bottom: 18px; }
    .section-lbl { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #e5e5e5; }
    .section-lbl + table { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead { background: #f8f8f8; }
    th { text-align: left; padding: 8px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #555; border-bottom: 2px solid #e5e5e5; }
    th.r { text-align: right; }
    th.c { text-align: center; }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; color: #333; vertical-align: middle; }
    td.r { text-align: right; }
    td.c { text-align: center; }
    td.name { font-weight: 700; color: #111; }
    td.dim { color: #999; }
    tr.tot td { font-weight: 800; background: #f8f8f8; color: #111; border-top: 2px solid #e5e5e5; border-bottom: none; }
    .grp-sep { border-left: 2px solid #e0e0e0 !important; }
    .pos { color: #16a34a; font-weight: 700; }
    .neg { color: #dc2626; font-weight: 700; }
    .neu { color: #aaa; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .bg { background: #dcfce7; color: #16a34a; }
    .br { background: #fee2e2; color: #dc2626; }
    .bn { background: #f5f5f5; color: #888; }
    .footer { position: absolute; bottom: 20px; left: 40px; right: 40px; display: flex; justify-content: space-between; font-size: 10px; color: #aaa; border-top: 1px solid #e5e5e5; padding-top: 8px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
    }
  `;

  function hdr(period: string) {
    return `<div class="hdr"><div class="brand">Client Ascension</div><div class="period">${period}</div></div>`;
  }

  function footer(pageNum: number, total: number) {
    return `<div class="footer"><span>Generated ${generatedAt}</span><span>Page ${pageNum} of ${total}</span></div>`;
  }

  function badge(v: number | null): string {
    if (v === null) return `<span class="badge bn">—</span>`;
    const pv = v * 100;
    const cls = pv >= 50 ? "bg" : pv >= 25 ? "bn" : "br";
    return `<span class="badge ${cls}">${pv.toFixed(1)}%</span>`;
  }

  function diffHtml(c: number | null, prev: number | null, fmt: "num" | "pct" | "money"): string {
    if (c === null || prev === null) return '<span class="neu">—</span>';
    const diff = c - prev;
    if (diff === 0) return '<span class="neu">—</span>';
    const cls = diff > 0 ? "pos" : "neg";
    let display = "";
    if (fmt === "num") display = `${diff > 0 ? "+" : ""}${diff}`;
    else if (fmt === "pct") display = `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)}%`;
    else display = `${diff > 0 ? "+" : ""}${$m(diff)}`;
    return `<span class="${cls}">${display}</span>`;
  }

  // ── Closer pages ──────────────────────────────────────────────────────────

  const closerNames = ["All Team", ...(monthlyData?.current.reps.map((r) => r.name) ?? [])];

  function closerPage(name: string, pageNum: number, total: number): string {
    const zero = { scheduled: 0, showed: 0, offered: 0, closes: 0, cashCollected: 0, cashPerCall: null, showRate: null, offerRate: null, closeRate: null };
    const c = name === "All Team" ? monthlyData?.current.totals ?? zero : monthlyData?.current.reps.find((r) => r.name === name) ?? zero;
    const p = name === "All Team" ? monthlyData?.previous.totals ?? zero : monthlyData?.previous.reps.find((r) => r.name === name) ?? zero;

    const rows = [
      ["Calls",          String(p.scheduled),    String(c.scheduled),    diffHtml(c.scheduled,    p.scheduled,    "num")],
      ["Shows",          String(p.showed),        String(c.showed),        diffHtml(c.showed,        p.showed,        "num")],
      ["Offers",         String(p.offered),       String(c.offered),       diffHtml(c.offered,       p.offered,       "num")],
      ["Closes",         String(p.closes),        String(c.closes),        diffHtml(c.closes,        p.closes,        "num")],
      ["Cash Collected", $m(p.cashCollected),     $m(c.cashCollected),     diffHtml(c.cashCollected, p.cashCollected, "money")],
      ["Cash/Call",      $mOrDash(p.cashPerCall), $mOrDash(c.cashPerCall), diffHtml(c.cashPerCall,   p.cashPerCall,   "money")],
      ["Show Rate",      pct(p.showRate),          pct(c.showRate),          diffHtml(c.showRate,      p.showRate,      "pct")],
      ["Offer Rate",     pct(p.offerRate),         pct(c.offerRate),         diffHtml(c.offerRate,     p.offerRate,     "pct")],
      ["Close Rate",     pct(p.closeRate),         pct(c.closeRate),         diffHtml(c.closeRate,     p.closeRate,     "pct")],
    ];

    return `
      ${hdr(`${m1Label} vs ${m2Label}`)}
      <div class="title">Closer Performance — ${name}</div>
      <table>
        <thead><tr>
          <th>Metric</th><th class="r">${m2Label}</th><th class="r">${m1Label}</th><th class="c">Growth</th>
        </tr></thead>
        <tbody>
          ${rows.map(([lbl, pv, cv, d]) => `
            <tr>
              <td class="name">${lbl}</td>
              <td class="r" style="color:#999">${pv}</td>
              <td class="r"><strong>${cv}</strong></td>
              <td class="c">${d}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${footer(pageNum, total)}
    `;
  }

  // ── Grouped-header comparison table helper ───────────────────────────────

  function grpTh(label: string) {
    return `<th colspan="3" class="c grp-sep">${label}</th>`;
  }
  function grpSubThs(align: "r" | "c") {
    return `<th class="${align} grp-sep dim">${m2Label}</th><th class="${align}">${m1Label}</th><th class="c">±</th>`;
  }

  // ── Cold Traffic page ─────────────────────────────────────────────────────

  function coldPage(pageNum: number, total: number): string {
    const get = (ds: any, name: string) =>
      name === "Team Total" ? ds?.totals : ds?.reps?.find((r: any) => r.name === name);
    const names = [...(cold1?.reps?.map((r: any) => r.name) ?? []), "Team Total"];

    const rows = names.map(name => {
      const c = get(cold1, name) ?? { calls: 0, liveCalls: 0, closes: 0, showRate: null, closeRate: null };
      const p = get(cold2, name) ?? { calls: 0, liveCalls: 0, closes: 0, showRate: null, closeRate: null };
      const tot = name === "Team Total";
      return `<tr${tot ? ' class="tot"' : ''}>
        <td class="name">${name}</td>
        <td class="r dim grp-sep">${p.calls}</td><td class="r">${c.calls}</td><td class="c">${diffHtml(c.calls, p.calls, "num")}</td>
        <td class="r dim grp-sep">${p.liveCalls}</td><td class="r">${c.liveCalls}</td><td class="c">${diffHtml(c.liveCalls, p.liveCalls, "num")}</td>
        <td class="r dim grp-sep">${p.closes}</td><td class="r">${c.closes}</td><td class="c">${diffHtml(c.closes, p.closes, "num")}</td>
        <td class="c dim grp-sep">${pct(p.showRate)}</td><td class="c">${pct(c.showRate)}</td><td class="c">${diffHtml(c.showRate, p.showRate, "pct")}</td>
        <td class="c dim grp-sep">${pct(p.closeRate)}</td><td class="c">${pct(c.closeRate)}</td><td class="c">${diffHtml(c.closeRate, p.closeRate, "pct")}</td>
      </tr>`;
    });

    return `
      ${hdr(`${m1Label} vs ${m2Label}`)}
      <div class="title">Cold Traffic Performance</div>
      <table style="font-size:11px">
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align:bottom">Rep</th>
            ${grpTh("Calls")}${grpTh("Live Calls")}${grpTh("Closes")}${grpTh("Show %")}${grpTh("Close %")}
          </tr>
          <tr>${grpSubThs("r")}${grpSubThs("r")}${grpSubThs("r")}${grpSubThs("c")}${grpSubThs("c")}</tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
      ${footer(pageNum, total)}
    `;
  }

  // ── Setter → Closer pages ─────────────────────────────────────────────────

  function setterCloserPage(hs1: any, hs2: any, setterName: string, pageNum: number, total: number): string {
    const get = (ds: any, name: string) =>
      name === "Team Total" ? ds?.totals : ds?.reps?.find((r: any) => r.name === name);
    const names = [...(hs1?.reps?.map((r: any) => r.name) ?? []), "Team Total"];

    const rows = names.map(name => {
      const c = get(hs1, name) ?? { scheduled: 0, showed: 0, closes: 0, showRate: null, closeRate: null };
      const p = get(hs2, name) ?? { scheduled: 0, showed: 0, closes: 0, showRate: null, closeRate: null };
      const tot = name === "Team Total";
      return `<tr${tot ? ' class="tot"' : ''}>
        <td class="name">${name}</td>
        <td class="r dim grp-sep">${p.scheduled}</td><td class="r">${c.scheduled}</td><td class="c">${diffHtml(c.scheduled, p.scheduled, "num")}</td>
        <td class="r dim grp-sep">${p.showed}</td><td class="r">${c.showed}</td><td class="c">${diffHtml(c.showed, p.showed, "num")}</td>
        <td class="r dim grp-sep">${p.closes}</td><td class="r">${c.closes}</td><td class="c">${diffHtml(c.closes, p.closes, "num")}</td>
        <td class="c dim grp-sep">${pct(p.showRate)}</td><td class="c">${pct(c.showRate)}</td><td class="c">${diffHtml(c.showRate, p.showRate, "pct")}</td>
        <td class="c dim grp-sep">${pct(p.closeRate)}</td><td class="c">${pct(c.closeRate)}</td><td class="c">${diffHtml(c.closeRate, p.closeRate, "pct")}</td>
      </tr>`;
    });

    return `
      ${hdr(`${m1Label} vs ${m2Label}`)}
      <div class="title">Setter → Closer: ${setterName}</div>
      <table style="font-size:11px">
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align:bottom">Rep</th>
            ${grpTh("Calls")}${grpTh("Showed")}${grpTh("Closes")}${grpTh("Show %")}${grpTh("Close %")}
          </tr>
          <tr>${grpSubThs("r")}${grpSubThs("r")}${grpSubThs("r")}${grpSubThs("c")}${grpSubThs("c")}</tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
      ${footer(pageNum, total)}
    `;
  }

  // ── Cash Collected page ───────────────────────────────────────────────────

  function cashPage(pageNum: number, total: number): string {
    const names = ["All Team", ...(monthlyData?.current.reps.map((r) => r.name) ?? [])];
    const zero = { cashCollected: 0, closes: 0, cashPerCall: null };

    const rows = names.map(name => {
      const c = name === "All Team" ? monthlyData?.current.totals ?? zero : monthlyData?.current.reps.find((r) => r.name === name) ?? zero;
      const p = name === "All Team" ? monthlyData?.previous.totals ?? zero : monthlyData?.previous.reps.find((r) => r.name === name) ?? zero;
      const tot = name === "All Team";
      return `<tr${tot ? ' class="tot"' : ''}>
        <td class="name">${name}</td>
        <td class="r dim grp-sep">${$m(p.cashCollected)}</td><td class="r">${$m(c.cashCollected)}</td><td class="c">${diffHtml(c.cashCollected, p.cashCollected, "money")}</td>
        <td class="r dim grp-sep">${p.closes}</td><td class="r">${c.closes}</td><td class="c">${diffHtml(c.closes, p.closes, "num")}</td>
        <td class="r dim grp-sep">${$mOrDash(p.cashPerCall)}</td><td class="r">${$mOrDash(c.cashPerCall)}</td><td class="c">${diffHtml(c.cashPerCall, p.cashPerCall, "money")}</td>
      </tr>`;
    });

    return `
      ${hdr(`${m1Label} vs ${m2Label}`)}
      <div class="title">Cash Collected</div>
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align:bottom">Rep</th>
            ${grpTh("Cash Collected")}${grpTh("Closes")}${grpTh("Cash / Call")}
          </tr>
          <tr>${grpSubThs("r")}${grpSubThs("r")}${grpSubThs("r")}</tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
      ${footer(pageNum, total)}
    `;
  }

  // ── Revenue / Call chart page (current month only) ────────────────────────

  function revChartPage(pageNum: number, total: number): string {
    const reps = monthlyData?.current.reps ?? [];
    const tots = monthlyData?.current.totals as any;
    const everyone: any[] = [
      ...reps,
      tots ? { name: "All Team", cashCollected: tots.cashCollected, scheduled: tots.scheduled, showed: tots.showed } : null,
    ].filter(Boolean);

    const data = everyone.map((r: any) => ({
      name: r.name,
      revPerCall: r.scheduled > 0 ? Math.round(r.cashCollected / r.scheduled) : 0,
      revPerLiveCall: r.showed > 0 ? Math.round(r.cashCollected / r.showed) : 0,
    }));

    const maxCall = Math.max(...data.map(d => d.revPerCall), 1);
    const maxLive = Math.max(...data.map(d => d.revPerLiveCall), 1);

    const LBL_W = 80; const BAR_MAX = 360; const BAR_H = 28; const GAP = 10; const SVG_W = 560;
    const n = data.length;
    const secH = 26 + n * (BAR_H + GAP);

    const section = (title: string, getter: (d: any) => number, maxVal: number, color: string, yOff: number) =>
      `<text x="${LBL_W}" y="${yOff + 14}" font-size="12" font-weight="800" fill="#333" font-family="sans-serif">${title}</text>` +
      data.map((d, i) => {
        const w = Math.max(Math.round((getter(d) / maxVal) * BAR_MAX), 3);
        const y = yOff + 22 + i * (BAR_H + GAP);
        return `<text x="${LBL_W - 6}" y="${y + 19}" text-anchor="end" font-size="11" fill="#444" font-family="sans-serif">${d.name}</text>
          <rect x="${LBL_W}" y="${y}" width="${w}" height="${BAR_H}" fill="${color}" rx="3" opacity="0.85"/>
          <text x="${LBL_W + w + 6}" y="${y + 19}" font-size="11" font-weight="700" fill="#111" font-family="sans-serif">${$m(getter(d))}</text>`;
      }).join("");

    const svgH = secH * 2 + 30;
    const svg = `<svg width="${SVG_W}" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-top:16px">
      ${section("Revenue per Call", d => d.revPerCall, maxCall, "#e53e1e", 0)}
      ${section("Revenue per Live Call", d => d.revPerLiveCall, maxLive, "#2563eb", secH + 20)}
    </svg>`;

    return `
      ${hdr(m1Label)}
      <div class="title">Revenue per Call — ${m1Label}</div>
      ${svg}
      ${footer(pageNum, total)}
    `;
  }

  // ── Setter Performance page ───────────────────────────────────────────────

  function setterCompTable(name: string): string {
    const zero = { dials: 0, connects: 0, convo: 0, meetingsBooked: 0, connectionRate: null, connectToConvo: null, convoToBooking: null, dialToBooking: null };
    const c = name === "Team Total"
      ? (sdr1?.totals ?? zero)
      : (sdr1?.reps?.find((r: any) => r.name === name) ?? zero);
    const p = name === "Team Total"
      ? (sdr2?.totals ?? zero)
      : (sdr2?.reps?.find((r: any) => r.name === name) ?? zero);

    const rows = [
      ["Dials",           String(p.dials),           String(c.dials),           diffHtml(c.dials,           p.dials,           "num")],
      ["Connects",        String(p.connects),        String(c.connects),        diffHtml(c.connects,        p.connects,        "num")],
      ["Conversations",   String(p.convo),            String(c.convo),           diffHtml(c.convo,           p.convo,           "num")],
      ["Meetings Booked", String(p.meetingsBooked),  String(c.meetingsBooked),  diffHtml(c.meetingsBooked,  p.meetingsBooked,  "num")],
      ["Connection Rate", pct(p.connectionRate),     pct(c.connectionRate),     diffHtml(c.connectionRate,  p.connectionRate,  "pct")],
      ["Connect → Convo", pct(p.connectToConvo),     pct(c.connectToConvo),     diffHtml(c.connectToConvo,  p.connectToConvo,  "pct")],
      ["Convo → Booking", pct(p.convoToBooking),     pct(c.convoToBooking),     diffHtml(c.convoToBooking,  p.convoToBooking,  "pct")],
      ["Dial → Booking",  pct(p.dialToBooking),      pct(c.dialToBooking),      diffHtml(c.dialToBooking,   p.dialToBooking,   "pct")],
    ];

    return `
      <table>
        <thead><tr>
          <th>Metric</th><th class="r">${m2Label}</th><th class="r">${m1Label}</th><th class="c">Growth</th>
        </tr></thead>
        <tbody>
          ${rows.map(([lbl, pv, cv, d]) => `
            <tr>
              <td class="name">${lbl}</td>
              <td class="r" style="color:#999">${pv}</td>
              <td class="r"><strong>${cv}</strong></td>
              <td class="c">${d}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function setterPage(pageNum: number, total: number): string {
    const names: string[] = sdr1?.reps?.map((r: any) => r.name) ?? ["Antwon", "Noah"];
    return `
      ${hdr(`${m1Label} vs ${m2Label}`)}
      <div class="title">Setter Performance</div>
      ${names.map((name: string) => `
        <div class="section-lbl">${name}</div>
        ${setterCompTable(name)}
      `).join("")}
      <div class="section-lbl">Team Total</div>
      ${setterCompTable("Team Total")}
      ${footer(pageNum, total)}
    `;
  }

  // ── Assemble pages ────────────────────────────────────────────────────────

  const total = closerNames.length + 7; // cold + 3×setter→closer + setter perf + cash + rev chart

  const numberedPages: string[] = [
    ...closerNames.map((name, i) => closerPage(name, i + 1, total)),
    coldPage(closerNames.length + 1, total),
    setterCloserPage(hsAll1,    hsAll2,    "All",    closerNames.length + 2, total),
    setterCloserPage(hsAntwon1, hsAntwon2, "Antwon", closerNames.length + 3, total),
    setterCloserPage(hsNoah1,   hsNoah2,   "Noah",   closerNames.length + 4, total),
    setterPage(closerNames.length + 5, total),
    cashPage(closerNames.length + 6, total),
    revChartPage(closerNames.length + 7, total),
  ];

  const pages = numberedPages.map((content, i) =>
    `<div class="page"${i === numberedPages.length - 1 ? ' style="page-break-after:avoid"' : ""}>${content}</div>`
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Monthly Report — ${m1Label}</title>
  <style>${css}</style>
</head>
<body>
  ${pages.join("\n")}
  <script>
    window.addEventListener("load", function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalysisTab({
  data,
  loading,
  onMonthChange,
  from,
  to,
}: {
  data: MonthlyData | null;
  loading: boolean;
  onMonthChange: (month1: string, month2: string) => void;
  from: string;
  to: string;
}) {
  const [activeView, setActiveView] = useState<"report" | "followup" | "demo" | null>(null);
  const [activeRep, setActiveRep] = useState<AEName>("All Team");
  const [month1, setMonth1] = useState(currentYearMonth);
  const [month2, setMonth2] = useState(() => prevYearMonth(currentYearMonth()));
  const [generating, setGenerating] = useState(false);
  const [followupData, setFollowupData] = useState<any>(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  function handleMonth1Change(val: string) {
    setMonth1(val);
    onMonthChange(val, month2);
  }

  function handleMonth2Change(val: string) {
    setMonth2(val);
    onMonthChange(month1, val);
  }

  const rows = data
    ? buildRows(getStats(data.current, activeRep), getStats(data.previous, activeRep))
    : [];

  async function fetchFollowup() {
    setFollowupLoading(true);
    try {
      const res = await fetch(`/api/followup-closes?from=${from}&to=${to}`);
      if (res.ok) setFollowupData(await res.json());
    } finally {
      setFollowupLoading(false);
    }
  }

  async function fetchDemo() {
    setDemoLoading(true);
    try {
      const res = await fetch(`/api/demo-scheduled?from=${from}&to=${to}`);
      if (res.ok) setDemoData(await res.json());
    } finally {
      setDemoLoading(false);
    }
  }

  function selectView(v: "report" | "followup" | "demo") {
    setActiveView(v);
    if (v === "followup") fetchFollowup();
    if (v === "demo") fetchDemo();
  }

  async function generateReport() {
    // Open the window synchronously (must happen before any await or browsers block it as a popup)
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups for this site, then try again.");
      return;
    }
    win.document.write(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:48px;color:#555">
      <p style="font-size:18px">Loading report data&hellip;</p>
      <p style="font-size:13px;margin-top:8px">This may take 15–30 seconds while fetching HubSpot data.</p>
    </body></html>`);
    win.document.close();

    setGenerating(true);
    try {
      const r1 = getMonthRange(month1);
      const r2 = getMonthRange(month2);

      const res = await fetch(`/api/report-data?month1=${month1}&month2=${month2}`);
      if (!res.ok) {
        const msg = `API error ${res.status}: ${await res.text()}`;
        win.document.open();
        win.document.write(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:48px;color:#c00"><b>Failed to load report data</b><pre style="margin-top:12px;font-size:12px">${msg}</pre></body></html>`);
        win.document.close();
        return;
      }
      const rd = await res.json();

      const generatedAt = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
      });

      const html = buildReportHTML(
        data, r1.label, r2.label,
        rd.cold1, rd.cold2,
        rd.sdr1, rd.sdr2,
        rd.hsAll1, rd.hsAll2,
        rd.hsAntwon1, rd.hsAntwon2,
        rd.hsNoah1, rd.hsNoah2,
        generatedAt
      );

      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
    } catch (err) {
      console.error("Report generation failed:", err);
      win.document.open();
      win.document.write(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:48px;color:#c00"><b>Report generation failed</b><pre style="margin-top:12px;font-size:12px">${String(err)}</pre></body></html>`);
      win.document.close();
    } finally {
      setGenerating(false);
    }
  }

  const OPTION_CARDS = [
    { id: "report"  as const, title: "Monthly Report",    desc: "Generate PDF comparison between two months" },
    { id: "followup" as const, title: "Follow-up Closes", desc: "Closes where the call was made in a prior period" },
    { id: "demo"    as const, title: "Demo Scheduled",    desc: "Deals still in demo scheduled stage this period" },
  ];

  function SimpleTable({ colA, colB, rows, total }: { colA: string; colB: string; rows: {name: string; count: number}[]; total: number }) {
    return (
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-bold">{colA}</th>
              <th className="text-right px-5 py-3 font-bold">{colB}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={`border-b border-[#111] hover:bg-[#111] ${i === rows.length - 1 ? "border-b-0" : ""}`}>
                <td className="px-5 py-3 font-bold text-white">{r.name}</td>
                <td className="px-5 py-3 text-right font-bold text-white">{r.count}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#2a2a2a] bg-[#0a0a0a]">
              <td className="px-5 py-3 font-bold text-[#e53e1e]">Team Total</td>
              <td className="px-5 py-3 text-right font-bold text-[#e53e1e]">{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="space-y-5 w-full">

        {/* ── Option cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {OPTION_CARDS.map(({ id, title, desc }) => (
            <button
              key={id}
              onClick={() => selectView(id)}
              className={`text-left p-4 rounded-lg border transition-all ${
                activeView === id
                  ? "bg-[#1a0a06] border-[#e53e1e]"
                  : "bg-[#0d0d0d] border-[#1e1e1e] hover:border-[#3a3a3a]"
              }`}
            >
              <div className="font-bold text-sm mb-1 text-white">{title}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </button>
          ))}
        </div>

        {/* ── Monthly Report view ───────────────────────────────────── */}
        {activeView === "report" && (
          <div className="space-y-5">
            <div className="flex gap-2 flex-wrap">
              {AES.map((rep) => (
                <button
                  key={rep}
                  onClick={() => setActiveRep(rep)}
                  className={`px-4 py-1.5 rounded text-sm font-bold transition-colors ${
                    activeRep === rep
                      ? "bg-[#e53e1e] text-white"
                      : "bg-[#111] text-gray-500 hover:text-gray-200 border border-[#2a2a2a]"
                  }`}
                >
                  {rep}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Month 1</span>
                <select
                  value={month1}
                  onChange={(e) => handleMonth1Change(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] text-white text-sm font-bold rounded px-3 py-1.5 [color-scheme:dark] cursor-pointer"
                >
                  {MONTH_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <span className="text-gray-600 font-bold mt-5">vs</span>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Month 2</span>
                <select
                  value={month2}
                  onChange={(e) => handleMonth2Change(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] text-white text-sm font-bold rounded px-3 py-1.5 [color-scheme:dark] cursor-pointer"
                >
                  {MONTH_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="mt-5">
                <button
                  onClick={generateReport}
                  disabled={generating || loading || !data}
                  className={`px-5 py-1.5 rounded text-sm font-bold transition-colors flex items-center gap-2 ${
                    generating || loading || !data
                      ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-[#2a2a2a]"
                      : "bg-[#e53e1e] text-white hover:bg-[#cc3519]"
                  }`}
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : "Generate Monthly Report"}
                </button>
              </div>
            </div>

            {loading && <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>}

            {!loading && data && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-bold">Metric</th>
                      <th className="text-right px-5 py-3 font-bold text-white">
                        {data.current.label}
                  </th>
                      <th className="text-right px-5 py-3 font-bold">{data.previous.label}</th>
                      <th className="text-center px-5 py-3 font-bold">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.label} className={`border-b border-[#111] hover:bg-[#111] transition-colors ${i === rows.length - 1 ? "border-b-0" : ""}`}>
                        <td className="px-5 py-3 font-bold text-gray-400">{row.label}</td>
                        <td className="px-5 py-3 text-right font-bold text-white">{row.currDisplay}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-500">{row.prevDisplay}</td>
                        <td className={`px-5 py-3 text-center font-bold ${
                          row.diff === null || row.diff === 0 ? "text-gray-600"
                          : row.diff > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {row.diffDisplay ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Follow-up Closes view ─────────────────────────────────── */}
        {activeView === "followup" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Deals closed within the selected date range where the original call was scheduled <strong className="text-gray-400">before</strong> the range started.
            </p>
            {followupLoading && <div className="text-center text-gray-500 py-10 text-sm">Loading…</div>}
            {!followupLoading && followupData && (
              <SimpleTable colA="Closer" colB="Follow-up Closes" rows={followupData.reps} total={followupData.total} />
            )}
          </div>
        )}

        {/* ── Demo Scheduled view ───────────────────────────────────── */}
        {activeView === "demo" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Deals where the call was scheduled within the selected date range and the stage is still <strong className="text-gray-400">Demo Scheduled</strong>.
            </p>
            {demoLoading && <div className="text-center text-gray-500 py-10 text-sm">Loading…</div>}
            {!demoLoading && demoData && (
              <SimpleTable colA="Closer" colB="Demo Scheduled" rows={demoData.reps} total={demoData.total} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
