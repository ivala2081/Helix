"use client";

import { useEffect, useState } from "react";
import { LiveEquityChart } from "@/components/live/LiveEquityChart";
import { LivePortfolioCard } from "@/components/live/LivePortfolioCard";
import { LiveStatusBadge } from "@/components/live/LiveStatusBadge";
import { OpenPositionsStrip } from "@/components/live/OpenPositionsStrip";
import { LiveTradeAnalytics } from "@/components/live/LiveTradeAnalytics";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

interface Portfolio {
  symbol: string;
  equity: number;
  initial_capital: number;
  realized_pnl: number;
  open_trade: {
    direction: string;
    entryPrice: number;
    stopLoss?: number;
    takeProfit1?: number;
    takeProfit2?: number;
    takeProfit3?: number;
    tp1Hit?: boolean;
    tp2Hit?: boolean;
  } | null;
  warmup_complete: boolean;
  started_at: string;
  updated_at: string;
}

interface CronRun {
  ran_at: string;
  duration_ms: number;
  status: string;
  candles_processed: number;
  trades_closed: number;
}

interface LiveData {
  portfolios: Portfolio[];
  totalTradeCount: number;
  lastCronRun: CronRun | null;
  updatedAt: string;
}

export default function LivePage() {
  const dict = useDictionary();
  const t = dict.live;
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchData() {
      if (document.hidden) return; // skip when tab is backgrounded
      try {
        const r = await fetch("/api/live");
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
    interval = setInterval(fetchData, 30_000);

    // Refresh immediately when tab becomes visible after being hidden
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

  const totalEquity = data?.portfolios.reduce((s, p) => s + p.equity, 0) ?? 0;
  const totalInitial = data?.portfolios.reduce((s, p) => s + p.initial_capital, 0) ?? 0;
  const totalReturn = totalInitial > 0 ? ((totalEquity - totalInitial) / totalInitial) * 100 : 0;
  const bestCoin = data?.portfolios.reduce((best, p) => {
    if (!best) return p;
    const pRet = (p.equity - p.initial_capital) / p.initial_capital;
    const bRet = (best.equity - best.initial_capital) / best.initial_capital;
    return pRet > bRet ? p : best;
  }, undefined as Portfolio | undefined);
  const bestCoinReturnPct = bestCoin
    ? ((bestCoin.equity - bestCoin.initial_capital) / bestCoin.initial_capital) * 100
    : 0;
  const earliestStart = data?.portfolios
    .map((p) => p.started_at)
    .sort()[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <LiveStatusBadge startedAt={earliestStart} badgeLabel={t.badge} />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.title}
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-muted)]">
          {t.subtitle}
        </p>
      </div>

      {error && (
        <div className="mx-auto mt-6 max-w-md rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {t.errorPrefix} {error}
        </div>
      )}

      {!data && !error && (
        <div className="mt-16 text-center text-sm text-[var(--color-muted)]">
          {t.loading}
        </div>
      )}

      {data && (
        <>
          {/* Summary KPI strip */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniKpi
              label={t.kpis.totalEquity}
              value={`$${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
            <MiniKpi
              label={t.kpis.totalReturn}
              value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`}
              tone={totalReturn >= 0 ? "positive" : "negative"}
            />
            <MiniKpi
              label={t.kpis.bestPerformer}
              value={
                bestCoin
                  ? `${bestCoin.symbol.replace("USDT", "")} ${bestCoinReturnPct >= 0 ? "+" : ""}${bestCoinReturnPct.toFixed(1)}%`
                  : "—"
              }
              tone={bestCoinReturnPct >= 0 ? "positive" : "negative"}
            />
            <MiniKpi
              label={t.kpis.totalTrades}
              value={String(data.totalTradeCount)}
            />
          </div>

          {/* Portfolio cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {data.portfolios.map((p) => (
              <LivePortfolioCard key={p.symbol} p={p} updatedLabel={t.updated} />
            ))}
          </div>

          {/* Equity curve (all coins overlay) */}
          <LiveEquityChart title={t.chartTitle} />

          {/* Open positions */}
          <OpenPositionsStrip portfolios={data.portfolios} title={t.openPositionsTitle} />

          {/* Cron health */}
          {data.lastCronRun && (
            <div className="mt-4 text-center text-[10px] text-[var(--color-muted)]">
              {t.lastTick}: {new Date(data.lastCronRun.ran_at).toLocaleString()} ·{" "}
              {data.lastCronRun.duration_ms}ms · {data.lastCronRun.status}
            </div>
          )}

          {/* Trade Analytics */}
          <LiveTradeAnalytics />
        </>
      )}

      {/* Disclaimer */}
      <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center text-[11px] text-yellow-200/80">
        {t.disclaimer}
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-lg font-bold tabular-nums ${
          tone === "positive"
            ? "text-emerald-400"
            : tone === "negative"
            ? "text-red-400"
            : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
