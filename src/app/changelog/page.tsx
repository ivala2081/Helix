import Link from "next/link";
import { ArrowRight, CircleDot, Sparkles } from "lucide-react";

export const metadata = {
  title: "Changelog & Roadmap",
  description:
    "Helix release notes from V1 to V5, plus what's coming in V6 and the live trading research.",
};

interface Release {
  version: string;
  date: string;
  status: "current" | "shipped" | "planned" | "research";
  headline: string;
  changes: string[];
  metrics?: { label: string; value: string }[];
}

const RELEASES: Release[] = [
  {
    version: "V5",
    date: "March 2026",
    status: "current",
    headline: "Return maximization — tighter stops, unlocked sizing",
    changes: [
      "Stop loss tightened from 2× ATR → 1× ATR",
      "TP1 lowered from 2× ATR → 1× ATR (locks profits sooner; pushed win rate from 75.8% → 84.3%)",
      "Risk increased from 2% → 3% per trade",
      "Position cap raised from 50% → 80% of equity",
      "Walk-forward: 5/5 folds profitable, average OOS return +48.72%",
    ],
    metrics: [
      { label: "Total return", value: "+949.7%" },
      { label: "Sharpe", value: "5.40" },
      { label: "Max DD", value: "8.55%" },
      { label: "Win rate", value: "84.3%" },
      { label: "Profit factor", value: "12.46" },
    ],
  },
  {
    version: "V4",
    date: "January 2026",
    status: "shipped",
    headline: "Fix broken tiered sizing, extend SL suppression",
    changes: [
      "Disabled the broken tiered sizing logic (was capping risk at 1% effective)",
      "Extended SL suppression window from 30 → 50 bars",
      "TP1 close % rebalanced: 20% → 5% (let TP3 capture more of the move)",
      "TP3 close % raised from 50% → 65%",
    ],
    metrics: [
      { label: "Total return", value: "+250.5%" },
      { label: "Sharpe", value: "4.29" },
      { label: "Max DD", value: "6.6%" },
      { label: "Win rate", value: "75.8%" },
    ],
  },
  {
    version: "V3",
    date: "December 2025",
    status: "shipped",
    headline: "TP rebalance + extended SL suppression",
    changes: [
      "TP rebalance: tp1_close 40% → 20%, tp3_atr 8x → 6x",
      "Extended SL suppression: 19 → 30 bars",
    ],
    metrics: [
      { label: "Total return", value: "+173.2%" },
      { label: "Sharpe", value: "4.66" },
      { label: "Max DD", value: "4.1%" },
      { label: "Win rate", value: "75.9%" },
    ],
  },
  {
    version: "V2",
    date: "November 2025",
    status: "shipped",
    headline: "Risk management improvements",
    changes: [
      "Suppress SL for first 19 bars after entry (kills early shakeouts)",
      "Move stop to breakeven + 0.3 ATR after TP1",
      "Filter weak signals: minimum aggregated score 0.60",
    ],
    metrics: [
      { label: "Total return", value: "+95.5%" },
      { label: "Sharpe", value: "3.36" },
      { label: "Max DD", value: "5.9%" },
      { label: "Win rate", value: "71.1%" },
    ],
  },
  {
    version: "V1",
    date: "October 2025",
    status: "shipped",
    headline: "Baseline — Market Structure + FVG, no trailing",
    changes: [
      "Initial system: 1H BTCUSDT, MS+FVG confluence required",
      "ATR-based stops and progressive TPs",
      "Trailing stops disabled (counterintuitive but the right call)",
    ],
    metrics: [
      { label: "Total return", value: "+49.7%" },
      { label: "Sharpe", value: "1.81" },
      { label: "Max DD", value: "10.3%" },
    ],
  },
];

const ROADMAP: { title: string; status: "in-progress" | "planned" | "research"; description: string }[] = [
  {
    title: "Walk-forward visualization in browser",
    status: "in-progress",
    description:
      "Show 5 train/test fold windows on the candlestick chart with per-fold metrics. The Python code already has it; bringing it to the web app is the next major credibility builder.",
  },
  {
    title: "Parameter heatmap",
    status: "planned",
    description:
      "Pick one or two parameters (e.g. SL multiplier, min signal score), sweep them, render a 2D heatmap of resulting Sharpe / Total Return.",
  },
  {
    title: "Multi-symbol batch run",
    status: "planned",
    description:
      "Backtest the V5 strategy on BTC, ETH, SOL, AVAX simultaneously and show aggregate stats. Already trivial — just needs UI.",
  },
  {
    title: "Custom indicator builder",
    status: "research",
    description:
      "Let users define custom signal sources via a small DSL or block-based UI, then plug them into the existing aggregator.",
  },
  {
    title: "Live trading bridge",
    status: "research",
    description:
      "Wire the engine to a paper-trading account on Binance testnet. Pure research — no commitment yet.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md">
          <Sparkles className="h-3 w-3" />
          Research progress · open source
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Changelog &amp; Roadmap
        </h1>
        <p className="mt-3 text-lg text-[var(--color-muted)]">
          Every version of Helix is a single, validated improvement over the
          previous one. No curve-fitting — every change ran through walk-forward
          validation before being committed.
        </p>
      </div>

      {/* Releases timeline */}
      <section className="mt-12">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Releases
        </h2>
        <div className="mt-6 space-y-4">
          {RELEASES.map((r) => (
            <ReleaseCard key={r.version} release={r} />
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="mt-16">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Roadmap
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          What we&apos;re working on next. None of this is committed — these
          are research directions, ranked roughly by likelihood.
        </p>
        <div className="mt-6 space-y-3">
          {ROADMAP.map((item) => (
            <RoadmapRow key={item.title} item={item} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="mt-16 text-center">
        <Link
          href="/backtest"
          className="inline-flex h-12 items-center gap-2 rounded-md bg-emerald-500 px-6 text-base font-semibold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
        >
          Try V5 on any pair
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function ReleaseCard({ release }: { release: Release }) {
  const isCurrent = release.status === "current";
  return (
    <div
      className={
        "rounded-xl border bg-[var(--color-surface)]/70 p-5 backdrop-blur-md " +
        (isCurrent
          ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5"
          : "border-[var(--color-border)]")
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xl font-bold tracking-tight">{release.version}</span>
          {isCurrent && (
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              Current
            </span>
          )}
          <span className="text-xs text-[var(--color-muted)]">{release.date}</span>
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold">{release.headline}</div>
      <ul className="mt-3 space-y-1 text-xs text-[var(--color-muted)]">
        {release.changes.map((c) => (
          <li key={c} className="flex gap-2">
            <span className="text-emerald-400">·</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
      {release.metrics && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border)]/50 pt-3">
          {release.metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-md bg-[var(--color-bg)]/60 px-2 py-1 text-[10px]"
            >
              <span className="text-[var(--color-muted)]">{m.label} </span>
              <span className="font-mono font-semibold text-emerald-400">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoadmapRow({
  item,
}: {
  item: { title: string; status: "in-progress" | "planned" | "research"; description: string };
}) {
  const tone = {
    "in-progress": { dot: "bg-emerald-500", label: "In progress", color: "text-emerald-400" },
    planned: { dot: "bg-blue-500", label: "Planned", color: "text-blue-400" },
    research: { dot: "bg-zinc-500", label: "Researching", color: "text-zinc-400" },
  }[item.status];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-md">
      <CircleDot className={"mt-0.5 h-4 w-4 " + tone.color} />
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-sm font-semibold">{item.title}</h3>
          <span className={"text-[10px] uppercase tracking-wider " + tone.color}>
            {tone.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{item.description}</p>
      </div>
    </div>
  );
}
