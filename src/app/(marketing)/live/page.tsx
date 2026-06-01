"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroScene } from "@/components/ui/HeroScene";
import { LiveEquityChart } from "@/components/live/LiveEquityChart";

interface OpenTrade {
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  tp1Hit?: boolean;
  tp2Hit?: boolean;
}

interface Portfolio {
  symbol: string;
  equity: number;
  initial_capital: number;
  realized_pnl: number;
  open_trade: OpenTrade | null;
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

const COIN_TINT: Record<string, string> = {
  BTCUSDT: "text-orange-400",
  ETHUSDT: "text-blue-400",
  SOLUSDT: "text-violet-400",
  XRPUSDT: "text-emerald-400",
  BNBUSDT: "text-yellow-400",
};

export default function LivePage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchData() {
      if (document.hidden) return;
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
  const totalInitial =
    data?.portfolios.reduce((s, p) => s + p.initial_capital, 0) ?? 0;
  const totalReturn =
    totalInitial > 0 ? ((totalEquity - totalInitial) / totalInitial) * 100 : 0;
  const positive = totalReturn >= 0;

  const bestCoin = data?.portfolios.reduce((best, p) => {
    if (!best) return p;
    const pRet = (p.equity - p.initial_capital) / p.initial_capital;
    const bRet = (best.equity - best.initial_capital) / best.initial_capital;
    return pRet > bRet ? p : best;
  }, undefined as Portfolio | undefined);
  const bestRet = bestCoin
    ? ((bestCoin.equity - bestCoin.initial_capital) / bestCoin.initial_capital) * 100
    : 0;

  const earliestStart = data?.portfolios.map((p) => p.started_at).sort()[0];
  const daysLive = earliestStart
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(earliestStart).getTime()) / 86_400_000,
        ),
      )
    : 0;

  const lastTickAgeMin = data?.lastCronRun
    ? Math.max(
        0,
        Math.round(
          (Date.now() - new Date(data.lastCronRun.ran_at).getTime()) / 60_000,
        ),
      )
    : null;

  const openPositions = data?.portfolios.filter((p) => p.open_trade) ?? [];

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroScene />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/60 via-[var(--color-bg)]/90 to-[var(--color-bg)]" />
      </div>

      <div className="relative z-20 mx-auto flex max-w-6xl flex-col gap-14 px-6 py-14 sm:py-20">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live forward test · Day {daysLive}
          </div>
          <h1 className="mt-6 text-[clamp(2rem,6vw,3.75rem)] font-light leading-tight tracking-tight text-white/95">
            Forward test dashboard
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-muted)]">
            5 portfolios · 1H candles · $10k seed each · ATR-scaled sizing.
            Trades open and close automatically. No manual intervention.
          </p>
        </div>

        {error && (
          <div className="mx-auto max-w-md rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            Failed to load: {error}
          </div>
        )}

        {!data && !error && (
          <div className="text-center text-sm text-[var(--color-muted)]">
            Loading...
          </div>
        )}

        {data && (
          <>
            {/* ── Top KPI strip — hairline grid ─────────────────── */}
            <section>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
                <Cell
                  label="Total equity"
                  value={`$${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Cell
                  label="Total return"
                  value={`${positive ? "+" : ""}${totalReturn.toFixed(2)}%`}
                  tone={positive ? "emerald" : "red"}
                />
                <Cell
                  label="Best performer"
                  value={
                    bestCoin
                      ? `${bestCoin.symbol.replace("USDT", "")} ${bestRet >= 0 ? "+" : ""}${bestRet.toFixed(1)}%`
                      : "—"
                  }
                  tone={bestRet >= 0 ? "emerald" : "red"}
                />
                <Cell
                  label="Trades closed"
                  value={String(data.totalTradeCount)}
                />
              </div>
            </section>

            {/* ── Portfolios — 5 cards ───────────────────────────── */}
            <section>
              <SectionLabel>Portfolios</SectionLabel>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[...data.portfolios]
                  .sort((a, b) => a.symbol.localeCompare(b.symbol))
                  .map((p) => (
                    <PortfolioCard key={p.symbol} p={p} />
                  ))}
              </div>
            </section>

            {/* ── Equity Curve ──────────────────────────────────── */}
            <section>
              <SectionLabel>Equity curves</SectionLabel>
              <div className="mt-4">
                <LiveEquityChart title="" />
              </div>
            </section>

            {/* ── Open positions ────────────────────────────────── */}
            {openPositions.length > 0 && (
              <section>
                <SectionLabel>
                  Open positions · {openPositions.length}
                </SectionLabel>
                <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)]">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Symbol</th>
                        <th className="px-3 py-2 text-left">Side</th>
                        <th className="px-3 py-2 text-right">Entry</th>
                        <th className="hidden px-3 py-2 text-right sm:table-cell">
                          SL
                        </th>
                        <th className="hidden px-3 py-2 text-right sm:table-cell">
                          TP1
                        </th>
                        <th className="hidden px-3 py-2 text-right sm:table-cell">
                          TP2
                        </th>
                        <th className="hidden px-3 py-2 text-right sm:table-cell">
                          TP3
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums">
                      {openPositions.map((p) => {
                        const t = p.open_trade!;
                        const tint =
                          COIN_TINT[p.symbol] ?? "text-[var(--color-muted)]";
                        return (
                          <tr
                            key={p.symbol}
                            className="border-t border-[var(--color-border)]/50"
                          >
                            <td className={`px-3 py-2 font-semibold ${tint}`}>
                              {p.symbol.replace("USDT", "")}
                            </td>
                            <td className="px-3 py-2 text-xs uppercase">
                              <span
                                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
                                  t.direction === "LONG"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-red-500/15 text-red-400"
                                }`}
                              >
                                {t.direction}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {t.entryPrice.toFixed(4)}
                            </td>
                            <td className="hidden px-3 py-2 text-right text-red-400/70 sm:table-cell">
                              {t.stopLoss?.toFixed(4) ?? "—"}
                            </td>
                            <td className="hidden px-3 py-2 text-right text-emerald-400/70 sm:table-cell">
                              {t.takeProfit1?.toFixed(4) ?? "—"}
                              {t.tp1Hit && " ✓"}
                            </td>
                            <td className="hidden px-3 py-2 text-right text-emerald-400/70 sm:table-cell">
                              {t.takeProfit2?.toFixed(4) ?? "—"}
                              {t.tp2Hit && " ✓"}
                            </td>
                            <td className="hidden px-3 py-2 text-right text-emerald-400/70 sm:table-cell">
                              {t.takeProfit3?.toFixed(4) ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Cron health ───────────────────────────────────── */}
            {data.lastCronRun && (
              <div className="text-center font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]/60">
                Last tick {lastTickAgeMin}m ago ·{" "}
                {data.lastCronRun.duration_ms}ms · {data.lastCronRun.status}
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-8 text-center">
          <h2 className="text-xl font-semibold text-white">
            Bu stratejiyi kendi hesabında çalıştır
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-muted)]">
            Helix Bot aynı stratejiyi senin Binance hesabında 7/24 otomatik
            işletir. Paran sende kalır.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            Hesap oluştur →
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="mx-auto max-w-2xl text-center text-[10px] leading-relaxed text-[var(--color-muted)]/60">
          Helix is a live forward test of a quantitative trading strategy.
          Not financial advice. Past performance does not guarantee future
          results. Trading carries substantial risk of loss.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-4 text-sm">
          <Link
            href="/"
            className="font-medium text-[var(--color-muted)] transition-colors hover:text-white"
          >
            ← Home
          </Link>
          <Link
            href="/about"
            className="font-medium text-[var(--color-muted)] transition-colors hover:text-white"
          >
            Methodology
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
      {children}
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "red"
        ? "text-red-400"
        : "text-white/95";
  return (
    <div className="bg-[var(--color-bg)] px-4 py-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl font-medium tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function PortfolioCard({ p }: { p: Portfolio }) {
  const ret = ((p.equity - p.initial_capital) / p.initial_capital) * 100;
  const tint = COIN_TINT[p.symbol] ?? "text-[var(--color-muted)]";
  const updatedAgo = Math.max(
    0,
    Math.round((Date.now() - new Date(p.updated_at).getTime()) / 60_000),
  );
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-4 py-4 backdrop-blur-md">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        <span className={`font-semibold ${tint}`}>
          {p.symbol.replace("USDT", "")}
        </span>
        {p.open_trade ? (
          <span
            className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold ${
              p.open_trade.direction === "LONG"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {p.open_trade.direction}
          </span>
        ) : (
          <span className="text-[9px] text-[var(--color-muted)]/60">flat</span>
        )}
      </div>
      <div className="mt-3 font-mono text-xl font-medium tabular-nums text-white/95">
        ${Math.round(p.equity).toLocaleString()}
      </div>
      <div
        className={`mt-1 font-mono text-sm tabular-nums ${ret >= 0 ? "text-emerald-400" : "text-red-400"}`}
      >
        {ret >= 0 ? "+" : ""}
        {ret.toFixed(2)}%
      </div>
      <div className="mt-3 font-mono text-[9px] text-[var(--color-muted)]/60">
        Updated {updatedAgo}m ago
      </div>
    </div>
  );
}
