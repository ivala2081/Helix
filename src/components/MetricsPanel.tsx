"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { fmtNum, fmtPct, fmtUsd } from "@/lib/utils/format";
import { METRIC_EXPLANATIONS } from "@/lib/metricExplanations";
import type { Metrics } from "@/lib/engine/types";

export function MetricsPanel({ metrics }: { metrics: Metrics }) {
  const [open, setOpen] = useState(true);

  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: "Returns",
      rows: [
        ["Total return", fmtPct(metrics.totalReturnPct)],
        ["Annualized return", fmtPct(metrics.annualizedReturnPct)],
        ["Net profit", fmtUsd(metrics.netProfit)],
        ["Final equity", fmtUsd(metrics.finalEquity)],
        ["Years tested", fmtNum(metrics.years, 2)],
      ],
    },
    {
      title: "Risk",
      rows: [
        ["Max drawdown", fmtPct(-metrics.maxDrawdownPct)],
        ["Max DD duration", `${metrics.maxDdDurationBars} bars`],
        ["Avg DD duration", `${Math.round(metrics.avgDdDurationBars)} bars`],
        ["Sharpe ratio", fmtNum(metrics.sharpeRatio)],
        ["Sortino ratio", fmtNum(metrics.sortinoRatio)],
        ["Calmar ratio", fmtNum(metrics.calmarRatio)],
      ],
    },
    {
      title: "Trade summary",
      rows: [
        ["Total trades", String(metrics.totalTrades)],
        ["Win rate", fmtPct(metrics.winRate * 100, 1)],
        ["Wins / Losses", `${metrics.winCount} / ${metrics.lossCount}`],
        ["Long trades", `${metrics.longTrades} (${fmtPct(metrics.longWinRate * 100, 0)} WR)`],
        ["Short trades", `${metrics.shortTrades} (${fmtPct(metrics.shortWinRate * 100, 0)} WR)`],
        ["Avg bars held", String(Math.round(metrics.avgBarsHeld))],
      ],
    },
    {
      title: "Trade quality",
      rows: [
        ["Profit factor", fmtNum(metrics.profitFactor)],
        ["Payoff ratio", fmtNum(metrics.payoffRatio)],
        ["Expectancy", fmtUsd(metrics.expectancy)],
        ["Avg win", fmtUsd(metrics.avgWin)],
        ["Avg loss", fmtUsd(metrics.avgLoss)],
        ["Largest win", fmtUsd(metrics.largestWin)],
        ["Largest loss", fmtUsd(metrics.largestLoss)],
        ["Avg R-multiple", `${metrics.avgRMultiple.toFixed(2)}R`],
        ["Best R-multiple", `${metrics.maxRMultiple.toFixed(2)}R`],
        ["Worst R-multiple", `${metrics.minRMultiple.toFixed(2)}R`],
        ["Max consecutive wins", String(metrics.maxConsecWins)],
        ["Max consecutive losses", String(metrics.maxConsecLosses)],
      ],
    },
    {
      title: "Costs",
      rows: [
        ["Total commission", fmtUsd(metrics.totalCommission)],
        ["Avg commission per trade", fmtUsd(metrics.avgCommissionPerTrade)],
        ["Commission as % of gross", fmtPct(metrics.commissionPctOfGross)],
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Full metrics breakdown
        </h3>
        {open ? <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />}
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-px border-t border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title} className="bg-[var(--color-surface)]/80 p-4">
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                {section.title}
              </h4>
              <dl className="space-y-1.5">
                {section.rows.map(([label, value]) => (
                  <MetricRow key={label} label={label} value={value} />
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  const explanation = METRIC_EXPLANATIONS[label];
  return (
    <div className="group flex items-baseline justify-between gap-2 text-xs">
      <dt className="flex items-center gap-1 text-[var(--color-muted)]">
        <span>{label}</span>
        {explanation && (
          <ExplanationTrigger label={label} explanation={explanation} />
        )}
      </dt>
      <dd className="font-mono tabular-nums text-white">{value}</dd>
    </div>
  );
}

function ExplanationTrigger({
  label,
  explanation,
}: {
  label: string;
  explanation: { formula: string; description: string; anchor?: string };
}) {
  return (
    <span className="relative inline-flex items-center">
      <span
        className="invisible inline-flex group-hover:visible"
        aria-hidden
      >
        <HelpCircle className="h-3 w-3 text-[var(--color-muted)]/60 transition-colors hover:text-emerald-400" />
      </span>
      {/* Hover popover */}
      <span
        role="tooltip"
        aria-label={`${label} explanation`}
        className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[10px] leading-relaxed text-[var(--color-muted)] shadow-2xl group-hover:block"
      >
        <div className="text-emerald-400">{label}</div>
        <code className="mt-1 block break-all font-mono text-[9px] text-white/80">
          {explanation.formula}
        </code>
        <div className="mt-2 text-[var(--color-muted)]/90">{explanation.description}</div>
        {explanation.anchor && (
          <Link
            href={explanation.anchor}
            className="pointer-events-auto mt-2 inline-block text-emerald-400 hover:underline"
          >
            Learn more →
          </Link>
        )}
      </span>
    </span>
  );
}
