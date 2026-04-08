import Link from "next/link";
import { ArrowRight, BarChart3, Layers, LineChart, Shield, Zap } from "lucide-react";
import { KPICards, type KPI } from "@/components/KPICards";
import { ParityBadge } from "@/components/ParityBadge";
import { SocialProofBar } from "@/components/SocialProofBar";
import { Globe } from "@/components/visuals/Globe";
import { HeroVisual } from "@/components/visuals/HeroVisual";
import { SymbolMarquee } from "@/components/visuals/SymbolMarquee";
import {
  V5_EQUITY_CURVE,
  V5_EQUITY_LAST_THIRD,
  V5_PF_CURVE,
  V5_WINRATE_CURVE,
} from "@/lib/data/v5-reference-curve";
import { V5_REFERENCE_RESULTS } from "@/lib/engine/defaults";

export default function LandingPage() {
  const kpis: KPI[] = [
    {
      label: "Total return",
      value: `+${V5_REFERENCE_RESULTS.totalReturnPct.toFixed(1)}%`,
      numericValue: V5_REFERENCE_RESULTS.totalReturnPct,
      numericDecimals: 1,
      numericPrefix: "+",
      numericSuffix: "%",
      tone: "positive",
      sublabel: "BTCUSDT 1H · Jan 2023 → Feb 2026",
      sparkline: V5_EQUITY_CURVE,
    },
    {
      label: "Sharpe ratio",
      value: V5_REFERENCE_RESULTS.sharpeRatio.toFixed(2),
      numericValue: V5_REFERENCE_RESULTS.sharpeRatio,
      numericDecimals: 2,
      tone: "positive",
      sublabel: "Annualized risk-adjusted",
      sparkline: V5_EQUITY_LAST_THIRD,
    },
    {
      label: "Win rate",
      value: `${V5_REFERENCE_RESULTS.winRatePct.toFixed(1)}%`,
      numericValue: V5_REFERENCE_RESULTS.winRatePct,
      numericDecimals: 1,
      numericSuffix: "%",
      tone: "positive",
      sublabel: "Across all closed trades",
      sparkline: V5_WINRATE_CURVE,
    },
    {
      label: "Profit factor",
      value: V5_REFERENCE_RESULTS.profitFactor.toFixed(2),
      numericValue: V5_REFERENCE_RESULTS.profitFactor,
      numericDecimals: 2,
      tone: "positive",
      sublabel: "Gross profit / gross loss",
      sparkline: V5_PF_CURVE,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero — 2-column on lg, centered single-column on mobile */}
      <section className="grid grid-cols-1 items-center gap-8 pt-16 pb-10 sm:pt-24 sm:pb-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            V5 strategy · walk-forward validated
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Institutional-grade
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-blue-400 bg-clip-text text-transparent">
              price action backtesting
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-[var(--color-muted)] lg:max-w-none">
            Test Market Structure + Fair Value Gap strategies on any
            Binance-listed pair. Powered by walk-forward validated algorithms —
            no Python required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="/backtest"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-emerald-500 px-6 text-base font-semibold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
            >
              Run a backtest
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-6 text-base font-semibold text-white backdrop-blur-md transition-colors hover:border-[var(--color-muted)]"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Right side — minimal 3D candlestick lattice (desktop only) */}
        <div className="hidden lg:block">
          <HeroVisual className="h-[480px] w-full" />
        </div>
      </section>

      {/* Social proof bar — GitHub stars + license */}
      <section className="mt-4">
        <SocialProofBar />
      </section>

      {/* Symbol marquee */}
      <section className="mt-6">
        <div className="text-center text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
          Tested on
        </div>
        <SymbolMarquee />
      </section>

      {/* KPIs */}
      <section className="pt-6 pb-6">
        <div className="mb-4 text-center text-xs uppercase tracking-widest text-[var(--color-muted)]">
          BTCUSDT 1H · in-sample reference results
        </div>
        <KPICards kpis={kpis} columns={4} />
      </section>

      {/* Parity badge + reproduce CTA */}
      <section className="pb-16">
        <div className="mx-auto max-w-3xl space-y-3">
          <ParityBadge />
          <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs">
            <span className="text-[var(--color-muted)]">
              Don&apos;t take our word for it.
            </span>
            <Link
              href="/backtest?symbol=BTCUSDT&interval=1h&start=2023-01-01&end=2026-02-28"
              className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:underline"
            >
              Reproduce these numbers yourself
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Globe section */}
      <section className="grid grid-cols-1 items-center gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex justify-center lg:justify-start">
          <Globe size={360} />
        </div>
        <div className="text-center lg:text-left">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Any market.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Any timeframe.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[var(--color-muted)] lg:mx-0">
            Helix streams data directly from the public Binance API and runs
            the entire V5 backtester locally in your browser. Test BTCUSDT or
            an obscure altcoin — same engine, same metrics, no servers, no
            limits.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-left">
            <MiniStat n="500+" l="symbols" />
            <MiniStat n="14" l="timeframes" />
            <MiniStat n="0" l="API keys" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">How it works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[var(--color-muted)]">
          Three steps. No credit card. No Python. The full engine runs in your browser.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <FeatureCard
            icon={<Layers className="h-5 w-5" />}
            title="1. Pick your market"
            text="Select any Binance spot pair, timeframe, and date range. Data streams directly from the public Binance API."
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="2. Engine runs in browser"
            text="The V5 backtester analyses every bar — Market Structure, FVG zones, confluence scoring, partial take-profits."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="3. Read the results"
            text="Equity curve, drawdown, trade log, exit-reason breakdown, monthly returns, 30+ professional metrics."
          />
        </div>
      </section>

      {/* Strategy overview */}
      <section className="py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          The Helix V5 strategy
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--color-muted)]">
          Two confluent edges, one disciplined risk model.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <StrategyCard
            icon={<LineChart className="h-5 w-5" />}
            title="Market Structure"
            text="Detects swing highs and lows, classifies HH/HL/LH/LL, infers trend, then enters on Break of Structure (BOS) and Change of Character (CHoCH) confirmations. Signal strength scales with trend maturity."
          />
          <StrategyCard
            icon={<Shield className="h-5 w-5" />}
            title="Fair Value Gap"
            text="Tracks 3-candle imbalance zones where price left a gap. Generates retest entries when price returns to the unfilled gap. Strength weighted by gap size and freshness."
          />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <MiniCard label="Risk per trade" value="3% of equity" />
          <MiniCard label="Stop loss" value="1× ATR (after 50-bar suppression)" />
          <MiniCard label="Take profits" value="Progressive: 5% / 30% / 65%" />
        </div>
      </section>

      {/* Disclaimer */}
      <section className="my-16 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center text-xs text-yellow-200/80 backdrop-blur-md">
        Past performance does not guarantee future results. Helix is a research tool
        for educational purposes only. Nothing on this site constitutes financial
        advice. Trading cryptocurrency involves substantial risk of loss.
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-6 backdrop-blur-md transition-colors hover:border-emerald-500/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p>
    </div>
  );
}

function StrategyCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)]/80 to-[var(--color-bg)]/80 p-6 backdrop-blur-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{text}</p>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4 backdrop-blur-md">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function MiniStat({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-3 backdrop-blur-md">
      <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">{n}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">{l}</div>
    </div>
  );
}
