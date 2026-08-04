"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { TabNav } from "@/components/TabNav";
import { AETab } from "@/components/AETab";
import { SDRTab } from "@/components/SDRTab";
import { SDRAETab } from "@/components/SDRAETab";
import { BreakdownTab } from "@/components/BreakdownTab";
import { AnalysisTab } from "@/components/MonthlyPerformanceTab";
import { ColdTrafficTab } from "@/components/ColdTrafficTab";

type Tab = "ae" | "sdr" | "sdr-ae" | "breakdown" | "monthly" | "cold";

function defaultFrom() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function defaultTo() {
  return new Date().toISOString().split("T")[0];
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("ae");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [pendingFrom, setPendingFrom] = useState(defaultFrom);
  const [pendingTo, setPendingTo] = useState(defaultTo);

  const [aeData, setAEData] = useState(null);
  const [sdrData, setSDRData] = useState(null);
  const [hsData, setHSData] = useState(null);
  const [bdData, setBDData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [coldData, setColdData] = useState(null);
  const [aeLoading, setAELoading] = useState(false);
  const [sdrLoading, setSDRLoading] = useState(false);
  const [hsLoading, setHSLoading] = useState(false);
  const [bdLoading, setBDLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [coldLoading, setColdLoading] = useState(false);

  const fetchAE = useCallback(async (f: string, t: string) => {
    setAELoading(true);
    try {
      const res = await fetch(`/api/ae?from=${f}&to=${t}`);
      if (res.ok) setAEData(await res.json());
    } finally {
      setAELoading(false);
    }
  }, []);

  const fetchSDR = useCallback(async (f: string, t: string) => {
    setSDRLoading(true);
    try {
      const res = await fetch(`/api/sdr?from=${f}&to=${t}`);
      if (res.ok) setSDRData(await res.json());
    } finally {
      setSDRLoading(false);
    }
  }, []);

  const fetchHS = useCallback(async (f: string, t: string, setter: string | null = null) => {
    setHSLoading(true);
    try {
      const url = setter
        ? `/api/hubspot?from=${f}&to=${t}&setter=${encodeURIComponent(setter)}`
        : `/api/hubspot?from=${f}&to=${t}`;
      const res = await fetch(url);
      if (res.ok) setHSData(await res.json());
    } finally {
      setHSLoading(false);
    }
  }, []);

  const fetchBD = useCallback(async (f: string, t: string) => {
    setBDLoading(true);
    try {
      const res = await fetch(`/api/breakdown?from=${f}&to=${t}`);
      if (res.ok) setBDData(await res.json());
    } finally {
      setBDLoading(false);
    }
  }, []);

  const fetchCold = useCallback(async (f: string, t: string) => {
    setColdLoading(true);
    try {
      const res = await fetch(`/api/cold-traffic?from=${f}&to=${t}`);
      if (res.ok) setColdData(await res.json());
    } finally {
      setColdLoading(false);
    }
  }, []);

  const fetchMonthly = useCallback(async (month1?: string, month2?: string) => {
    setMonthlyLoading(true);
    try {
      const params = new URLSearchParams();
      if (month1) params.set("month1", month1);
      if (month2) params.set("month2", month2);
      const qs = params.toString();
      const res = await fetch(qs ? `/api/monthly-performance?${qs}` : "/api/monthly-performance");
      if (res.ok) setMonthlyData(await res.json());
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  // Google Sheets tabs: fetch on load and when dates change
  useEffect(() => {
    fetchAE(from, to);
    fetchSDR(from, to);
    fetchBD(from, to);
    fetchMonthly();
  }, [from, to, fetchAE, fetchSDR, fetchBD, fetchMonthly]);

  // HubSpot tabs: fetch only when the tab is active (avoids rate limit contention)
  useEffect(() => {
    if (tab === "sdr-ae") fetchHS(from, to);
    if (tab === "cold") fetchCold(from, to);
  }, [tab, from, to, fetchHS, fetchCold]);

  function handleApply() {
    setFrom(pendingFrom);
    setTo(pendingTo);
  }

  return (
    <div className="min-h-screen bg-black">
      <Header
        from={pendingFrom}
        to={pendingTo}
        onFromChange={setPendingFrom}
        onToChange={setPendingTo}
        onApply={handleApply}
      />
      <TabNav active={tab} onChange={setTab} />
      {tab === "ae" && <AETab data={aeData} loading={aeLoading} />}
      {tab === "sdr" && <SDRTab data={sdrData} loading={sdrLoading} />}
      {tab === "sdr-ae" && (
        <SDRAETab
          data={hsData}
          loading={hsLoading}
          onSetterChange={(setter) => fetchHS(from, to, setter)}
        />
      )}
      {tab === "breakdown" && <BreakdownTab data={bdData} loading={bdLoading} />}
      {tab === "monthly" && <AnalysisTab data={monthlyData} loading={monthlyLoading} onMonthChange={(m1, m2) => fetchMonthly(m1, m2)} from={from} to={to} />}
      {tab === "cold" && <ColdTrafficTab data={coldData} loading={coldLoading} />}
    </div>
  );
}
