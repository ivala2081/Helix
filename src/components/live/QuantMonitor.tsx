"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

// Backtest reference values, from quant_analysis.py (2026-04-22 run, BTC 1H, 189 trades)
// Source: reports/quant_analysis_20260422_132943.json
const BACKTEST_REF = {
  winRate: 0.778,
  profitFactor: 6.80,
  meanR: 1.54,
  // Estimated from high PF + tp3_close_pct=0.65 in WINNER_PARAMS
  tp3Rate: 0.35,
  tp1Rate: 0.80,
};

// Minimum Track Record Length for SR > 1 annualized at 95% confidence
// Source: quant_analysis.py MTRL calc on BTC 1H (189 trades), = 19 trades
const MTRL_TARGET = 19;

interface TradeStatsPayload {
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancy: number;
  totalPnl: number;
  avgR: number;
  medianR: number;
  tp1Rate: number;
  tp2Rate: number;
  tp3Rate: number;
  earliestEntryTs: number | null;
}

interface ApiResponse {
  stats: TradeStatsPayload;
  total: number;
}

export function QuantMonitor() {
  const [stats, setStats] = useState<TradeStatsPayload | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/live/trades?limit=1&offset=0");
        const j: ApiResponse = await r.json();
        if (!cancelled) {
          setStats(j.stats);
          setTotal(j.total);
        }
      } catch {
        // swallow, panel just shows dashes
      }
    };
    load();
    const i = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  const n = total;
  const mtrlPct = Math.min(100, (n / MTRL_TARGET) * 100);
  const mtrlReached = n >= MTRL_TARGET;

  const daysLive =
    stats?.earliestEntryTs != null
      ? Math.max(0, Math.floor((Date.now() - stats.earliestEntryTs) / 86_400_000))
      : 0;

  const rows: Array<{
    label: string;
    live: string;
    backtest: string;
    delta: number;
    goodIfHigher: boolean;
  }> = stats
    ? [
        {
          label: "Win Rate",
          live: `${(stats.winRate * 100).toFixed(1)}%`,
          backtest: `${(BACKTEST_REF.winRate * 100).toFixed(1)}%`,
          delta: stats.winRate - BACKTEST_REF.winRate,
          goodIfHigher: true,
        },
        {
          label: "Profit Factor",
          live: stats.profitFactor == null ? "—" : stats.profitFactor.toFixed(2),
          backtest: BACKTEST_REF.profitFactor.toFixed(2),
          delta:
            stats.profitFactor == null
              ? -99
              : stats.profitFactor - BACKTEST_REF.profitFactor,
          goodIfHigher: true,
        },
        {
          label: "Avg R",
          live: `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(2)}R`,
          backtest: `+${BACKTEST_REF.meanR.toFixed(2)}R`,
          delta: stats.avgR - BACKTEST_REF.meanR,
          goodIfHigher: true,
        },
        {
          label: "TP3 Hit Rate",
          live: `${(stats.tp3Rate * 100).toFixed(1)}%`,
          backtest: `~${(BACKTEST_REF.tp3Rate * 100).toFixed(0)}%`,
          delta: stats.tp3Rate - BACKTEST_REF.tp3Rate,
          goodIfHigher: true,
        },
        {
          label: "TP1 Hit Rate",
          live: `${(stats.tp1Rate * 100).toFixed(1)}%`,
          backtest: `~${(BACKTEST_REF.tp1Rate * 100).toFixed(0)}%`,
          delta: stats.tp1Rate - BACKTEST_REF.tp1Rate,
          goodIfHigher: true,
        },
      ]
    : [];

  return (
    <section className="mt-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Quant Monitor
        </h2>
        <span className="text-[10px] text-[var(--color-muted)]">
          Day {daysLive} · n = {n}
        </span>
      </div>

      {/* MTRL progress */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="text-[var(--color-muted)]">
            Statistical significance (MTRL for SR &gt; 1 @ 95%)
          </span>
          <span
            className={cn(
              "font-mono tabular-nums",
              mtrlReached ? "text-emerald-400" : "text-amber-400",
            )}
          >
            {n} / {MTRL_TARGET} trades
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn(
              "h-full transition-all",
              mtrlReached ? "bg-emerald-500" : "bg-amber-500",
            )}
            style={{ width: `${mtrlPct}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-[var(--color-muted)]">
          {mtrlReached
            ? "Threshold reached — stats are statistically meaningful at 95% confidence."
            : "Below threshold — early-sample noise expected. Do not over-interpret individual trades."}
        </div>
      </div>

      {/* Live vs backtest table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--color-surface-muted)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Metric</th>
              <th className="px-3 py-2 text-right">Live</th>
              <th className="px-3 py-2 text-right">Backtest</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-zinc-700" />
                  </td>
                  <td className="px-3 py-2 text-right">—</td>
                  <td className="px-3 py-2 text-right">—</td>
                  <td className="px-3 py-2 text-right">—</td>
                </tr>
              ))}
            {rows.map((r) => {
              const isGood = r.goodIfHigher ? r.delta >= 0 : r.delta <= 0;
              return (
                <tr key={r.label} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-muted)]">{r.label}</td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-mono tabular-nums",
                      isGood ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {r.live}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--color-muted)]">
                    {r.backtest}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-mono tabular-nums text-[10px]",
                      isGood ? "text-emerald-400/70" : "text-red-400/70",
                    )}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {r.delta.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-muted)]">
        Backtest reference: BTC 1H, 3.3yr, 189 trades (quant_analysis.py).
        Green = live matches or beats backtest. Red = underperforming —
        most likely engine-fill realism (TP wick, flat slippage) rather than
        strategy failure. Wait for MTRL threshold before drawing conclusions.
      </p>
    </section>
  );
}
