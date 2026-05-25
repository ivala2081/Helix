"use client";

import { useEffect, useState } from "react";

interface Portfolio {
  equity: number;
  initial_capital: number;
}

interface LiveResponse {
  portfolios: Portfolio[];
  totalTradeCount: number;
}

export function LiveTicker() {
  const [data, setData] = useState<LiveResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/live");
        if (!r.ok) return;
        const j = (await r.json()) as LiveResponse;
        if (!cancelled) setData(j);
      } catch {
        /* silent */
      }
    }
    load();
    const i = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  const totalEquity = data?.portfolios.reduce((s, p) => s + p.equity, 0) ?? 0;
  const totalInitial =
    data?.portfolios.reduce((s, p) => s + p.initial_capital, 0) ?? 0;
  const ret =
    totalInitial > 0 ? ((totalEquity - totalInitial) / totalInitial) * 100 : 0;
  const positive = ret >= 0;

  if (!data) {
    return (
      <div className="font-mono text-sm text-[var(--color-muted)]/60">
        · · ·
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
        Live · {data.totalTradeCount} trades
      </div>
      <div
        className={`font-mono text-3xl font-light tabular-nums sm:text-5xl ${
          positive ? "text-emerald-400/90" : "text-red-400/90"
        }`}
      >
        {positive ? "+" : ""}
        {ret.toFixed(2)}%
      </div>
    </div>
  );
}
