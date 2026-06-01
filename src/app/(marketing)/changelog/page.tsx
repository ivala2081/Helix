import Link from "next/link";
import { HeroScene } from "@/components/ui/HeroScene";

export const metadata = {
  title: "Changelog & Roadmap",
  description: "Helix release notes and research roadmap.",
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
      "TP1 lowered from 2× ATR → 1× ATR (locks profits sooner)",
      "Risk increased from 2% → 3% per trade",
      "Position cap raised from 50% → 80% of equity",
      "Engine realism patches (2026-05-08): TP wick-fill correction, ATR-scaled slippage, bid/ask spread, hard stop tightened 15× → 8× ATR",
    ],
    metrics: [
      { label: "Total return", value: "+87.0%" },
      { label: "Sharpe", value: "1.44" },
      { label: "Max DD", value: "13.3%" },
      { label: "Win rate", value: "64.6%" },
      { label: "Profit factor", value: "1.71" },
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
    metrics: [],
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
    metrics: [],
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
    metrics: [],
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
    metrics: [],
  },
];

const ROADMAP: {
  title: string;
  status: "in-progress" | "planned" | "research";
  description: string;
}[] = [
  {
    title: "Walk-forward visualization in browser",
    status: "in-progress",
    description:
      "Show k-fold train/test fold windows on the candlestick chart with per-fold metrics. The Python code already has it; bringing it to the web app is the next major credibility builder.",
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
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroScene />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/60 via-[var(--color-bg)]/90 to-[var(--color-bg)]" />
      </div>

      <div className="relative z-20 mx-auto max-w-4xl px-6 py-14 sm:py-20">
        {/* Hero */}
        <div className="text-center">
          <SectionLabel>Changelog</SectionLabel>
          <h1 className="mt-6 text-[clamp(2rem,6vw,3.75rem)] font-light leading-tight tracking-tight text-white/95">
            Releases &amp; roadmap
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--color-muted)]">
            Every version is a single, focused change against the previous one.
            Engine realism patches re-baselined the metrics on 2026-05-08.
          </p>
        </div>

        {/* Releases */}
        <section className="mt-14">
          <SectionLabel>Releases</SectionLabel>
          <div className="mt-4 space-y-3">
            {RELEASES.map((r) => (
              <ReleaseCard key={r.version} release={r} />
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="mt-14">
          <SectionLabel>Roadmap</SectionLabel>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            What we&apos;re working on next. None of this is committed — these
            are research directions, ranked roughly by likelihood.
          </p>
          <div className="mt-6 space-y-2">
            {ROADMAP.map((item) => (
              <RoadmapRow key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Footer nav */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
          <Link
            href="/"
            className="font-medium text-[var(--color-muted)] transition-colors hover:text-white"
          >
            ← Home
          </Link>
          <Link
            href="/live"
            className="font-medium text-white underline decoration-emerald-400/60 decoration-2 underline-offset-[6px] transition-colors hover:decoration-emerald-400"
          >
            Watch live
          </Link>
          <Link
            href="/backtest"
            className="font-medium text-[var(--color-muted)] transition-colors hover:text-white"
          >
            Run backtest
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

function ReleaseCard({ release }: { release: Release }) {
  const isCurrent = release.status === "current";
  return (
    <div
      className={
        "rounded-md border bg-[var(--color-surface)]/40 px-5 py-5 backdrop-blur-md transition-colors " +
        (isCurrent
          ? "border-emerald-500/30"
          : "border-[var(--color-border)] hover:border-[var(--color-muted)]/40")
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-2xl font-light tracking-tight text-white/95">
            {release.version}
          </span>
          {isCurrent && (
            <span className="rounded-sm bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
              Current
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]/70">
          {release.date}
        </span>
      </div>
      <div className="mt-2 text-sm font-medium text-white/90">
        {release.headline}
      </div>
      <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
        {release.changes.map((c) => (
          <li key={c} className="flex gap-2">
            <span className="text-[var(--color-muted)]/40">·</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
      {release.metrics && release.metrics.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-5">
          {release.metrics.map((m) => (
            <div
              key={m.label}
              className="bg-[var(--color-bg)] px-3 py-2.5"
            >
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-muted)]/70">
                {m.label}
              </div>
              <div className="mt-0.5 font-mono text-sm font-medium tabular-nums text-emerald-400">
                {m.value}
              </div>
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
    <div className="flex items-start gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-5 py-4 backdrop-blur-md">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${tone.dot}`} />
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-white/90">{item.title}</h3>
          <span
            className={`text-[10px] uppercase tracking-[0.2em] ${tone.color}`}
          >
            {tone.label}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
          {item.description}
        </p>
      </div>
    </div>
  );
}
