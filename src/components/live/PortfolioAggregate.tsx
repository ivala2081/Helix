"use client";

import { useEffect, useState } from "react";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { PortfolioRanking } from "./PortfolioRanking";
import { PortfolioAllocation } from "./PortfolioAllocation";
import { PortfolioDrawdown } from "./PortfolioDrawdown";
import { AggregateRiskKPIs } from "./AggregateRiskKPIs";

interface AggregateData {
  ranking: {
    symbol: string;
    equity: number;
    initialCapital: number;
    returnPct: number;
    realizedPnl: number;
    unrealizedPnl: number;
    tradeCount: number;
    winRate: number | null;
    maxDrawdownPct: number;
    currentDrawdownPct: number;
    hasOpenTrade: boolean;
    rank: number;
  }[];
  allocation: { symbol: string; equity: number; pct: number }[];
  aggregate: {
    totalEquity: number;
    totalInitial: number;
    totalReturnPct: number;
    totalRealizedPnl: number;
    totalUnrealizedPnl: number;
    totalTrades: number;
    overallWinRate: number | null;
    overallProfitFactor: number | null;
    portfolioMaxDrawdownPct: number;
    portfolioCurrentDrawdownPct: number;
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    calmarRatio: number | null;
  };
  drawdownSeries: { ts: number; drawdownPct: number }[];
}

export function PortfolioAggregate() {
  const dict = useDictionary();
  const t = dict.live.portfolioAnalytics;
  const [data, setData] = useState<AggregateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchData() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/live/aggregate");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError((err as Error).message);
      }
    }

    fetchData();
    interval = setInterval(fetchData, 60_000);

    const onVisibility = () => {
      if (!document.hidden) fetchData();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">
        {t.title}
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Risk KPIs */}
      <AggregateRiskKPIs
        aggregate={data?.aggregate ?? null}
        dict={t.risk}
      />

      {/* Ranking table + Allocation donut */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {data ? (
            <PortfolioRanking ranking={data.ranking} dict={t.table} />
          ) : (
            <div className="h-64 animate-pulse rounded-xl bg-[var(--color-surface)]/80" />
          )}
        </div>
        <div>
          {data ? (
            <PortfolioAllocation
              allocation={data.allocation}
              totalEquity={data.aggregate.totalEquity}
              title={t.allocation.title}
            />
          ) : (
            <div className="h-64 animate-pulse rounded-xl bg-[var(--color-surface)]/80" />
          )}
        </div>
      </div>

      {/* Drawdown chart */}
      <div className="mt-4">
        {data ? (
          <PortfolioDrawdown
            series={data.drawdownSeries}
            title={t.drawdown.title}
            emptyText={t.drawdown.empty}
          />
        ) : (
          <div className="h-48 animate-pulse rounded-xl bg-[var(--color-surface)]/80" />
        )}
      </div>
    </section>
  );
}
