"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { TabNav } from "@/components/TabNav";
import { AETab } from "@/components/AETab";
import { SDRTab } from "@/components/SDRTab";

type Tab = "ae" | "sdr";

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
  const [aeLoading, setAELoading] = useState(false);
  const [sdrLoading, setSDRLoading] = useState(false);

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

  useEffect(() => {
    fetchAE(from, to);
    fetchSDR(from, to);
  }, [from, to, fetchAE, fetchSDR]);

  function handleApply() {
    setFrom(pendingFrom);
    setTo(pendingTo);
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
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
    </div>
  );
}
