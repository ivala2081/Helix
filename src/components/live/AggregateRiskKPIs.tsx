"use client";

import { cn } from "@/lib/utils/cn";
import { fmtUsd, fmtPct } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface Aggregate {
  totalReturnPct: number;
  totalRealizedPnl: number;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  portfolioMaxDrawdownPct: number;
  overallWinRate: number | null;
}

interface Props {
  aggregate: Aggregate | null;
  dict: Dictionary["live"]["portfolioAnalytics"]["risk"];
}

export function AggregateRiskKPIs({ aggregate, dict }: Props) {
  if (!aggregate) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-[var(--color-surface)]/80"
          />
        ))}
      </div>
    );
  }

  const cards: {
    label: string;
    value: string;
    tone: "positive" | "negative" | "neutral";
  }[] = [
    {
      label: dict.totalReturn,
      value: fmtPct(aggregate.totalReturnPct),
      tone: aggregate.totalReturnPct >= 0 ? "positive" : "negative",
    },
    {
      label: dict.realizedPnl,
      value: fmtUsd(aggregate.totalRealizedPnl),
      tone: aggregate.totalRealizedPnl >= 0 ? "positive" : "negative",
    },
    {
      label: dict.sharpe,
      value: aggregate.sharpeRatio?.toFixed(2) ?? "—",
      tone:
        aggregate.sharpeRatio !== null && aggregate.sharpeRatio > 1
          ? "positive"
          : "neutral",
    },
    {
      label: dict.sortino,
      value: aggregate.sortinoRatio?.toFixed(2) ?? "—",
      tone:
        aggregate.sortinoRatio !== null && aggregate.sortinoRatio > 1
          ? "positive"
          : "neutral",
    },
    {
      label: dict.maxDD,
      value:
        aggregate.portfolioMaxDrawdownPct > 0
          ? `-${aggregate.portfolioMaxDrawdownPct.toFixed(2)}%`
          : "0.00%",
      tone: "negative",
    },
    {
      label: dict.winRate,
      value:
        aggregate.overallWinRate !== null
          ? fmtPct(aggregate.overallWinRate * 100)
          : "—",
      tone:
        aggregate.overallWinRate !== null && aggregate.overallWinRate >= 0.5
          ? "positive"
          : "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
            {card.label}
          </div>
          <div
            className={cn(
              "mt-1 font-mono text-lg font-bold tabular-nums",
              card.tone === "positive" && "text-emerald-400",
              card.tone === "negative" && "text-red-400",
            )}
          >
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
