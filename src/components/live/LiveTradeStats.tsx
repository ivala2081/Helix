"use client";

import { cn } from "@/lib/utils/cn";
import { fmtUsd, fmtPct, fmtNum } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export interface TradeStats {
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancy: number;
  totalPnl: number;
}

type Dict = Dictionary["live"]["tradeAnalytics"]["stats"];

export function LiveTradeStats({
  stats,
  dict,
}: {
  stats: TradeStats | null;
  dict: Dict;
}) {
  const cards: {
    label: string;
    value: string;
    tone: "positive" | "negative" | undefined;
  }[] = stats
    ? [
        {
          label: dict.winRate,
          value: fmtPct(stats.winRate * 100),
          tone: stats.winRate >= 0.5 ? "positive" : "negative",
        },
        {
          label: dict.avgWin,
          value: fmtUsd(stats.avgWin),
          tone: "positive",
        },
        {
          label: dict.avgLoss,
          value: fmtUsd(stats.avgLoss),
          tone: "negative",
        },
        {
          label: dict.profitFactor,
          value: stats.profitFactor != null ? fmtNum(stats.profitFactor) : "—",
          tone:
            stats.profitFactor != null && stats.profitFactor > 1
              ? "positive"
              : stats.profitFactor != null
              ? "negative"
              : undefined,
        },
        {
          label: dict.expectancy,
          value: fmtUsd(stats.expectancy),
          tone: stats.expectancy >= 0 ? "positive" : "negative",
        },
        {
          label: dict.totalPnl,
          value: fmtUsd(stats.totalPnl),
          tone: stats.totalPnl >= 0 ? "positive" : "negative",
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats
        ? cards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3"
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                {c.label}
              </div>
              <div
                className={cn(
                  "mt-1 font-mono text-lg font-bold tabular-nums",
                  c.tone === "positive" && "text-emerald-400",
                  c.tone === "negative" && "text-red-400",
                )}
              >
                {c.value}
              </div>
            </div>
          ))
        : Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-700" />
              <div className="mt-2 h-6 w-20 animate-pulse rounded bg-zinc-700" />
            </div>
          ))}
    </div>
  );
}
