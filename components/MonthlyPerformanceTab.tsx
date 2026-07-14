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
  coldData: { reps: any[]; totals: any } | null,
  sdrData: { reps: any[]; totals: any } | null,
  hsAll: { reps: any[]; totals: any } | null,
  hsAntwon: { reps: any[]; totals: any } | null,
  hsNoah: { reps: any[]; totals: any } | null
): string {
  const p = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
  const $m = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const $mOrDash = (n: number | null) => (n === null ? "—" : $m(n));

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111; background: white; }
    .page { padding: 44px 40px; page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #e53e1e; padding-bottom: 12px; margin-bottom: 26px; }
    .brand { font-size: 15px; font-weight: 900; color: #e53e1e; letter-spacing: 0.08em; text-transform: uppercase; }
    .period { font-size: 12px; font-weight: 600; color: #666; }
    .title { font-size: 20px; font-weight: 800; color: #111; margin-bottom: 20px; }
    .kpis { display: flex; gap: 12px; margin-bottom: 20px; }
    .kpi { flex: 1; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; text-align: center; }
    .kpi-lbl { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .kpi-val { font-size: 22px; font-weight: 800; color: #111; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #f8f8f8; }
    th { text-align: left; padding: 9px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #555; border-bottom: 2px solid #e5e5e5; }
    th.r { text-align: right; }
    th.c { text-align: center; }
    td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; color: #333; vertical-align: middle; }
    td.r { text-align: right; }
    td.c { text-align: center; }
    td.name { font-weight: 700; color: #111; }
    td.money { color: #16a34a; font-weight: 700; text-align: right; }
    tr.tot td { font-weight: 800; background: #f8f8f8; color: #111; border-top: 2px solid #e5e5e5; border-bottom: none; }
    .pos { color: #16a34a; font-weight: 700; }
    .neg { color: #dc2626; font-weight: 700; }
    .neu { color: #aaa; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .bg { background: #dcfce7; color: #16a34a; }
    .br { background: #fee2e2; color: #dc2626; }
    .bn { background: #f5f5f5; color: #888; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
    }
  `;

  function hdr(period: string) {
    return `<div class="hdr"><div class="brand">Client Ascension</div><div class="period">${period}</div></div>`;
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

  function closerPage(name: string): string {
    const zeroStats = {
      scheduled: 0, showed: 0, offered: 0, closes: 0, cashCollected: 0,
      cashPerCall: null, showRate: null, offerRate: null, closeRate: null,
    };
    const curr =
      name === "All Team"
        ? monthlyData?.current.totals ?? zeroStats
        : monthlyData?.current.reps.find((r) => r.name === name) ?? zeroStats;
    const prev =
      name === "All Team"
        ? monthlyData?.previous.totals ?? zeroStats
        : monthlyData?.previous.reps.find((r) => r.name === name) ?? zeroStats;

    const rows = [
      ["Calls", String(curr.scheduled), String(prev.scheduled), diffHtml(curr.scheduled, prev.scheduled, "num")],
      ["Shows", String(curr.showed), String(prev.showed), diffHtml(curr.showed, prev.showed, "num")],
      ["Offers", String(curr.offered), String(prev.offered), diffHtml(curr.offered, prev.offered, "num")],
      ["Closes", String(curr.closes), String(prev.closes), diffHtml(curr.closes, prev.closes, "num")],
      ["Cash Collected", $m(curr.cashCollected), $m(prev.cashCollected), diffHtml(curr.cashCollected, prev.cashCollected, "money")],
      ["Cash / Call", $mOrDash(curr.cashPerCall), $mOrDash(prev.cashPerCall), diffHtml(curr.cashPerCall, prev.cashPerCall, "money")],
      ["Show Rate", p(curr.showRate), p(prev.showRate), diffHtml(curr.showRate, prev.showRate, "pct")],
      ["Offer Rate", p(curr.offerRate), p(prev.offerRate), diffHtml(curr.offerRate, prev.offerRate, "pct")],
      ["Close Rate", p(curr.closeRate), p(prev.closeRate), diffHtml(curr.closeRate, prev.closeRate, "pct")],
    ];

    return `
      ${hdr(`${m1Label} vs ${m2Label}`)}
      <div class="title">Closer Performance — ${name}</div>
      <table>
        <thead><tr>
          <th>Metric</th>
          <th class="r">${m1Label}</th>
          <th class="r">${m2Label}</th>
          <th class="c">Growth</th>
        </tr></thead>
        <tbody>
          ${rows.map(([lbl, c, pv, d]) => `
            <tr>
              <td class="name">${lbl}</td>
              <td class="r"><strong>${c}</strong></td>
              <td class="r" style="color:#999">${pv}</td>
              <td class="c">${d}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function coldPage(): string {
    const t = coldData?.totals;
    const reps = coldData?.reps ?? [];
    return `
      ${hdr(m1Label)}
      <div class="title">Cold Traffic Performance</div>
      ${t ? `<div class="kpis">
        <div class="kpi"><div class="kpi-lbl">Show Rate</div><div class="kpi-val">${p(t.showRate)}</div></div>
        <div class="kpi"><div class="kpi-lbl">Offer Rate</div><div class="kpi-val">${p(t.offerRate)}</div></div>
        <div class="kpi"><div class="kpi-lbl">Close Rate</div><div class="kpi-val">${p(t.closeRate)}</div></div>
        <div class="kpi"><div class="kpi-lbl">Team Calls</div><div class="kpi-val">${t.calls}</div></div>
      </div>` : ""}
      <table>
        <thead><tr>
          <th>Rep</th><th class="r">Calls</th><th class="r">Live Calls</th>
          <th class="r">Offers</th><th class="r">Closes</th>
          <th class="c">Show%</th><th class="c">Offer%</th><th class="c">Close%</th>
        </tr></thead>
        <tbody>
          ${reps.map((r: any) => `
            <tr>
              <td class="name">${r.name}</td>
              <td class="r">${r.calls}</td><td class="r">${r.liveCalls}</td>
              <td class="r">${r.offers}</td><td class="r">${r.closes}</td>
              <td class="c">${badge(r.showRate)}</td>
              <td class="c">${badge(r.offerRate)}</td>
              <td class="c">${badge(r.closeRate)}</td>
            </tr>
          `).join("")}
          ${t ? `<tr class="tot">
            <td>Team Total</td>
            <td class="r">${t.calls}</td><td class="r">${t.liveCalls}</td>
            <td class="r">${t.offers}</td><td class="r">${t.closes}</td>
            <td class="c">${badge(t.showRate)}</td>
            <td class="c">${badge(t.offerRate)}</td>
            <td class="c">${badge(t.closeRate)}</td>
          </tr>` : ""}
        </tbody>
      </table>
    `;
  }

  function setterCloserPage(hs: { reps: any[]; totals: any } | null, setterName: string): string {
    const t = hs?.totals;
    const reps = hs?.reps ?? [];
    return `
      ${hdr(m1Label)}
      <div class="title">Setter → Closer: ${setterName}</div>
      ${t ? `<div class="kpis">
        <div class="kpi"><div class="kpi-lbl">Show Rate</div><div class="kpi-val">${p(t.showRate)}</div></div>
        <div class="kpi"><div class="kpi-lbl">Offer Rate</div><div class="kpi-val">${p(t.offerRate)}</div></div>
        <div class="kpi"><div class="kpi-lbl">Close Rate</div><div class="kpi-val">${p(t.closeRate)}</div></div>
        <div class="kpi"><div class="kpi-lbl">Team Closes</div><div class="kpi-val">${t.closes}</div></div>
      </div>` : ""}
      <table>
        <thead><tr>
          <th>Rep</th><th class="r">Calls</th><th class="r">Mtg Sched</th>
          <th class="r">Showed</th><th class="r">Offered</th><th class="r">Closes</th>
          <th class="c">Show%</th><th class="c">Offer%</th><th class="c">Close%</th>
        </tr></thead>
        <tbody>
          ${reps.map((r: any) => `
            <tr>
              <td class="name">${r.name}</td>
              <td class="r">${r.scheduled}</td><td class="r">${r.meetingScheduled}</td>
              <td class="r">${r.showed}</td><td class="r">${r.offered}</td><td class="r">${r.closes}</td>
              <td class="c">${badge(r.showRate)}</td>
              <td class="c">${badge(r.offerRate)}</td>
              <td class="c">${badge(r.closeRate)}</td>
            </tr>
          `).join("")}
          ${t ? `<tr class="tot">
            <td>Team Total</td>
            <td class="r">${t.scheduled}</td><td class="r">${t.meetingScheduled}</td>
            <td class="r">${t.showed}</td><td class="r">${t.offered}</td><td class="r">${t.closes}</td>
            <td class="c">${badge(t.showRate)}</td>
            <td class="c">${badge(t.offerRate)}</td>
            <td class="c">${badge(t.closeRate)}</td>
          </tr>` : ""}
        </tbody>
      </table>
    `;
  }

  function setterPage(): string {
    const t = sdrData?.totals;
    const reps = sdrData?.reps ?? [];
    return `
      ${hdr(m1Label)}
      <div class="title">Setter Performance</div>
      ${t ? `<div class="kpis">
        <div class="kpi"><div class="kpi-lbl">Total Dials</div><div class="kpi-val">${t.dials}</div></div>
        <div class="kpi"><div class="kpi-lbl">Total Connects</div><div class="kpi-val">${t.connects}</div></div>
        <div class="kpi"><div class="kpi-lbl">Total Conversations</div><div class="kpi-val">${t.convo}</div></div>
        <div class="kpi"><div class="kpi-lbl">Total Booked</div><div class="kpi-val">${t.meetingsBooked}</div></div>
      </div>` : ""}
      <table>
        <thead><tr>
          <th>Rep</th><th class="r">Dials</th><th class="r">Connects</th>
          <th class="r">Convo</th><th class="r">Booked</th>
          <th class="c">Connection%</th><th class="c">Connect→Convo%</th>
          <th class="c">Convo→Book%</th><th class="c">Dial→Book%</th>
        </tr></thead>
        <tbody>
          ${reps.map((r: any) => `
            <tr>
              <td class="name">${r.name}</td>
              <td class="r">${r.dials}</td><td class="r">${r.connects}</td>
              <td class="r">${r.convo}</td><td class="r">${r.meetingsBooked}</td>
              <td class="c">${badge(r.connectionRate)}</td>
              <td class="c">${badge(r.connectToConvo)}</td>
              <td class="c">${badge(r.convoToBooking)}</td>
              <td class="c">${badge(r.dialToBooking)}</td>
            </tr>
          `).join("")}
          ${t ? `<tr class="tot">
            <td>Team Total</td>
            <td class="r">${t.dials}</td><td class="r">${t.connects}</td>
            <td class="r">${t.convo}</td><td class="r">${t.meetingsBooked}</td>
            <td class="c">${badge(t.connectionRate)}</td>
            <td class="c">${badge(t.connectToConvo)}</td>
            <td class="c">${badge(t.convoToBooking)}</td>
            <td class="c">${badge(t.dialToBooking)}</td>
          </tr>` : ""}
        </tbody>
      </table>
    `;
  }

  const pages = [
    ...["All Team", "Peter", "Logan", "Andrew", "Ciaran"].map(
      (name) => `<div class="page">${closerPage(name)}</div>`
    ),
    `<div class="page">${coldPage()}</div>`,
    `<div class="page">${setterCloserPage(hsAll, "All")}</div>`,
    `<div class="page">${setterCloserPage(hsAntwon, "Antwon")}</div>`,
    `<div class="page">${setterCloserPage(hsNoah, "Noah")}</div>`,
    `<div class="page" style="page-break-after:avoid">${setterPage()}</div>`,
  ];

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

export function MonthlyReportTab({
  data,
  loading,
  onMonthChange,
}: {
  data: MonthlyData | null;
  loading: boolean;
  onMonthChange: (month1: string, month2: string) => void;
}) {
  const [activeRep, setActiveRep] = useState<AEName>("All Team");
  const [month1, setMonth1] = useState(currentYearMonth);
  const [month2, setMonth2] = useState(() => prevYearMonth(currentYearMonth()));
  const [generating, setGenerating] = useState(false);

  function handleMonth1Change(val: string) {
    setMonth1(val);
    onMonthChange(val, month2);
  }

  function handleMonth2Change(val: string) {
    setMonth2(val);
    onMonthChange(month1, val);
  }

  const rows =
    data
      ? buildRows(getStats(data.current, activeRep), getStats(data.previous, activeRep))
      : [];

  async function generateReport() {
    setGenerating(true);
    try {
      const { from, to, label: m1Label } = getMonthRange(month1);
      const m2Label = getMonthRange(month2).label;

      const [coldRes, sdrRes, hsAllRes, hsAntwonRes, hsNoahRes] = await Promise.all([
        fetch(`/api/cold-traffic?from=${from}&to=${to}`),
        fetch(`/api/sdr?from=${from}&to=${to}`),
        fetch(`/api/hubspot?from=${from}&to=${to}`),
        fetch(`/api/hubspot?from=${from}&to=${to}&setter=Antwon`),
        fetch(`/api/hubspot?from=${from}&to=${to}&setter=Noah`),
      ]);

      const [coldData, sdrData, hsAll, hsAntwon, hsNoah] = await Promise.all([
        coldRes.ok ? coldRes.json() : null,
        sdrRes.ok ? sdrRes.json() : null,
        hsAllRes.ok ? hsAllRes.json() : null,
        hsAntwonRes.ok ? hsAntwonRes.json() : null,
        hsNoahRes.ok ? hsNoahRes.json() : null,
      ]);

      const html = buildReportHTML(data, m1Label, m2Label, coldData, sdrData, hsAll, hsAntwon, hsNoah);
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
      }
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="space-y-5 w-full">
        {/* Rep selector */}
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

        {/* Month pickers + Generate button */}
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
              ) : (
                "Generate Monthly Report"
              )}
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>
        )}

        {!loading && data && (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e1e] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-bold">Metric</th>
                  <th className="text-right px-5 py-3 font-bold text-white">
                    {data.current.label}
                  </th>
                  <th className="text-right px-5 py-3 font-bold">
                    {data.previous.label}
                  </th>
                  <th className="text-center px-5 py-3 font-bold">Growth</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-[#111] hover:bg-[#111] transition-colors ${
                      i === rows.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-bold text-gray-400">{row.label}</td>
                    <td className="px-5 py-3 text-right font-bold text-white">
                      {row.currDisplay}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-500">
                      {row.prevDisplay}
                    </td>
                    <td
                      className={`px-5 py-3 text-center font-bold ${
                        row.diff === null || row.diff === 0
                          ? "text-gray-600"
                          : row.diff > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {row.diffDisplay ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
