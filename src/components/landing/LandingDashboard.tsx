"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface OpenTrade {
  direction: "LONG" | "SHORT";
  entryPrice: number;
}

interface Portfolio {
  symbol: string;
  equity: number;
  initial_capital: number;
  open_trade: OpenTrade | null;
  started_at: string;
}

interface CronRun {
  ran_at: string;
  status: string;
}

interface LiveResponse {
  portfolios: Portfolio[];
  totalTradeCount: number;
  lastCronRun: CronRun | null;
}

interface Trade {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry_price: number;
  exit_price: number;
  pnl: number;
  r_multiple: number | null;
  exit_reason: string;
  exit_ts: number;
}

interface TradesResponse {
  trades: Trade[];
  total: number;
  stats: {
    winCount: number;
    lossCount: number;
    winRate: number;
    profitFactor: number | null;
    avgR: number;
    totalPnl: number;
    earliestEntryTs: number | null;
  };
}

const COIN_TINT: Record<string, string> = {
  BTCUSDT: "text-orange-400",
  ETHUSDT: "text-blue-400",
  SOLUSDT: "text-violet-400",
  XRPUSDT: "text-emerald-400",
  BNBUSDT: "text-yellow-400",
};

export function LandingDashboard() {
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [trades, setTrades] = useState<TradesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/live"),
          fetch("/api/live/trades?limit=8&offset=0"),
        ]);
        if (!r1.ok || !r2.ok) return;
        const liveJ = (await r1.json()) as LiveResponse;
        const tradesJ = (await r2.json()) as TradesResponse;
        if (!cancelled) {
          setLive(liveJ);
          setTrades(tradesJ);
        }
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

  const totalEquity = live?.portfolios.reduce((s, p) => s + p.equity, 0) ?? 0;
  const totalInitial =
    live?.portfolios.reduce((s, p) => s + p.initial_capital, 0) ?? 0;
  const totalReturn =
    totalInitial > 0 ? ((totalEquity - totalInitial) / totalInitial) * 100 : 0;
  const positive = totalReturn >= 0;
  const daysLive =
    trades?.stats.earliestEntryTs != null
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - trades.stats.earliestEntryTs) / 86_400_000,
          ),
        )
      : 0;

  return (
    <div className="relative z-20 mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 sm:gap-20 sm:py-24">
      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live forward test
        </div>
        <h1 className="mt-8 text-[clamp(3.5rem,13vw,9rem)] font-light leading-[0.95] tracking-tight text-white/95">
          Helix
        </h1>

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-3">
          <Stat
            label="Total return"
            value={
              live
                ? `${positive ? "+" : ""}${totalReturn.toFixed(2)}%`
                : "—"
            }
            tone={positive ? "emerald" : "red"}
          />
          <Stat
            label="Trades"
            value={live ? String(live.totalTradeCount) : "—"}
          />
          <Stat label="Days live" value={trades ? String(daysLive) : "—"} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
          <Link
            href="/live"
            className="font-medium text-white underline decoration-emerald-400/60 decoration-2 underline-offset-[6px] transition-colors hover:decoration-emerald-400"
          >
            Watch live
          </Link>
          <Link
            href="/about"
            className="font-medium text-[var(--color-muted)] transition-colors hover:text-white"
          >
            Methodology
          </Link>
        </div>
      </div>

      {/* ── PORTFOLIO STRIP — 5 coins ─────────────────────────────── */}
      {live && (
        <section>
          <SectionLabel>Portfolios</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[...live.portfolios]
              .sort((a, b) => a.symbol.localeCompare(b.symbol))
              .map((p) => {
                const ret =
                  ((p.equity - p.initial_capital) / p.initial_capital) * 100;
                const tint =
                  COIN_TINT[p.symbol] ?? "text-[var(--color-muted)]";
                return (
                  <div
                    key={p.symbol}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-3 py-3 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      <span className={`font-semibold ${tint}`}>
                        {p.symbol.replace("USDT", "")}
                      </span>
                      {p.open_trade && (
                        <span className="rounded-sm bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                          {p.open_trade.direction}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 font-mono text-base font-medium tabular-nums">
                      ${Math.round(p.equity).toLocaleString()}
                    </div>
                    <div
                      className={`mt-0.5 font-mono text-xs tabular-nums ${ret >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {ret >= 0 ? "+" : ""}
                      {ret.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* ── STATS GRID ────────────────────────────────────────────── */}
      {trades && (
        <section>
          <SectionLabel>Live stats</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
            <Cell
              label="Win rate"
              value={`${(trades.stats.winRate * 100).toFixed(1)}%`}
            />
            <Cell
              label="Profit factor"
              value={
                trades.stats.profitFactor == null
                  ? "—"
                  : trades.stats.profitFactor.toFixed(2)
              }
            />
            <Cell
              label="Avg R"
              value={`${trades.stats.avgR >= 0 ? "+" : ""}${trades.stats.avgR.toFixed(2)}R`}
              tone={trades.stats.avgR >= 0 ? "emerald" : "red"}
            />
            <Cell
              label="Net P/L"
              value={`${trades.stats.totalPnl >= 0 ? "+" : ""}$${Math.round(trades.stats.totalPnl).toLocaleString()}`}
              tone={trades.stats.totalPnl >= 0 ? "emerald" : "red"}
            />
          </div>
        </section>
      )}

      {/* ── RECENT TRADES ─────────────────────────────────────────── */}
      {trades && trades.trades.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <SectionLabel>Recent trades</SectionLabel>
            <Link
              href="/live"
              className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-white"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left">Symbol</th>
                  <th className="px-3 py-2 text-left">Side</th>
                  <th className="px-3 py-2 text-right">R</th>
                  <th className="px-3 py-2 text-right">P/L</th>
                  <th className="hidden px-3 py-2 text-right sm:table-cell">
                    Exit
                  </th>
                  <th className="hidden px-3 py-2 text-right sm:table-cell">
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {trades.trades.slice(0, 8).map((t, i) => {
                  const tint =
                    COIN_TINT[t.symbol] ?? "text-[var(--color-muted)]";
                  const r = t.r_multiple ?? 0;
                  const ago = Math.max(
                    0,
                    Math.floor((Date.now() - t.exit_ts) / 3_600_000),
                  );
                  return (
                    <tr
                      key={i}
                      className="border-t border-[var(--color-border)]/50 transition-colors hover:bg-[var(--color-surface)]/30"
                    >
                      <td className={`px-3 py-2 font-semibold ${tint}`}>
                        {t.symbol.replace("USDT", "")}
                      </td>
                      <td className="px-3 py-2 text-xs uppercase text-[var(--color-muted)]">
                        {t.direction}
                      </td>
                      <td
                        className={`px-3 py-2 text-right ${r >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {r >= 0 ? "+" : ""}
                        {r.toFixed(2)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(0)}
                      </td>
                      <td className="hidden px-3 py-2 text-right text-[var(--color-muted)] sm:table-cell">
                        {t.exit_reason}
                      </td>
                      <td className="hidden px-3 py-2 text-right text-[var(--color-muted)]/70 sm:table-cell">
                        {ago < 1
                          ? "<1h"
                          : ago < 24
                            ? `${ago}h`
                            : `${Math.floor(ago / 24)}d`}{" "}
                        ago
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── METHODOLOGY teaser ───────────────────────────────────── */}
      <section>
        <SectionLabel>How it works</SectionLabel>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Method
            n="01"
            title="Market Structure"
            body="HH/HL/LH/LL swing classification. Trades fire on BOS or CHoCH at validated levels."
          />
          <Method
            n="02"
            title="Fair Value Gap"
            body="Tracks imbalance zones and enters on retest. ATR-scaled significance filter."
          />
          <Method
            n="03"
            title="Disciplined risk"
            body="ATR-based stops, 50-bar SL suppression, hard-stop floor, progressive TP exits."
          />
        </div>
      </section>

      {/* ── DISCLAIMER ───────────────────────────────────────────── */}
      <p className="mx-auto max-w-2xl text-center text-[10px] leading-relaxed text-[var(--color-muted)]/60">
        Helix is a live forward test of a quantitative trading strategy.
        Not financial advice. Past performance does not guarantee future
        results. Trading carries substantial risk of loss.
      </p>
    </div>
  );
}

function Stat({
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
        : "text-white/90";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)]/70">
        {label}
      </div>
      <div className={`mt-2 font-mono text-3xl font-light tabular-nums sm:text-4xl ${cls}`}>
        {value}
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

function Method({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-5 py-5 backdrop-blur-md">
      <div className="font-mono text-[10px] text-[var(--color-muted)]/60">
        {n}
      </div>
      <div className="mt-3 text-base font-medium text-white/90">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}
