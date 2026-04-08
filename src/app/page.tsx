import Link from "next/link";
import { ArrowRight, BarChart3, Layers, LineChart, Shield, Zap } from "lucide-react";
import { KPICards, type KPI } from "@/components/KPICards";
import { ParityBadge } from "@/components/ParityBadge";
import { SocialProofBar } from "@/components/SocialProofBar";
import { Globe } from "@/components/visuals/Globe";
import { GenerativeArtScene } from "@/components/ui/anomalous-matter-hero";
import { SymbolMarquee } from "@/components/visuals/SymbolMarquee";
import {
  V5_EQUITY_CURVE,
  V5_EQUITY_LAST_THIRD,
  V5_PF_CURVE,
  V5_WINRATE_CURVE,
} from "@/lib/data/v5-reference-curve";
import { V5_REFERENCE_RESULTS } from "@/lib/engine/defaults";
import { getCurrentDictionary } from "@/lib/i18n/getDictionary";

export default async function LandingPage() {
  const { dict } = await getCurrentDictionary();
  const h = dict.landing.hero;
  const k = dict.landing.kpis;
  const g = dict.landing.globe;
  const hiw = dict.landing.howItWorks;
  const strat = dict.landing.strategy;

  const kpis: KPI[] = [
    {
      label: k.totalReturn,
      value: `+${V5_REFERENCE_RESULTS.totalReturnPct.toFixed(1)}%`,
      numericValue: V5_REFERENCE_RESULTS.totalReturnPct,
      numericDecimals: 1,
      numericPrefix: "+",
      numericSuffix: "%",
      tone: "positive",
      sublabel: k.totalReturnSublabel,
      sparkline: V5_EQUITY_CURVE,
    },
    {
      label: k.sharpeRatio,
      value: V5_REFERENCE_RESULTS.sharpeRatio.toFixed(2),
      numericValue: V5_REFERENCE_RESULTS.sharpeRatio,
      numericDecimals: 2,
      tone: "positive",
      sublabel: k.sharpeSublabel,
      sparkline: V5_EQUITY_LAST_THIRD,
    },
    {
      label: k.winRate,
      value: `${V5_REFERENCE_RESULTS.winRatePct.toFixed(1)}%`,
      numericValue: V5_REFERENCE_RESULTS.winRatePct,
      numericDecimals: 1,
      numericSuffix: "%",
      tone: "positive",
      sublabel: k.winRateSublabel,
      sparkline: V5_WINRATE_CURVE,
    },
    {
      label: k.profitFactor,
      value: V5_REFERENCE_RESULTS.profitFactor.toFixed(2),
      numericValue: V5_REFERENCE_RESULTS.profitFactor,
      numericDecimals: 2,
      tone: "positive",
      sublabel: k.profitFactorSublabel,
      sparkline: V5_PF_CURVE,
    },
  ];

  return (
    <>
      {/* Hero — full-bleed with 3D animated background */}
      <section className="relative w-full h-screen overflow-hidden">
        <GenerativeArtScene />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/70 to-transparent z-10" />

        {/* Hero content */}
        <div className="relative z-20 flex flex-col items-center justify-end h-full pb-20 md:pb-32 text-center">
          <div className="max-w-3xl px-4 animate-hero-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {h.badge}
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {h.titleTop}
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-blue-400 bg-clip-text text-transparent">
                {h.titleBottom}
              </span>
            </h1>
            <p className="mt-6 max-w-xl mx-auto text-balance text-lg text-[var(--color-muted)]">
              {h.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/backtest"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-emerald-500 px-6 text-base font-semibold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
              >
                {h.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-6 text-base font-semibold text-white backdrop-blur-md transition-colors hover:border-[var(--color-muted)]"
              >
                {h.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

    <div className="mx-auto max-w-7xl px-4 sm:px-6">

      {/* Social proof */}
      <section className="mt-4">
        <SocialProofBar />
      </section>

      {/* Marquee */}
      <section className="mt-6">
        <div className="text-center text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
          {dict.landing.marqueeLabel}
        </div>
        <SymbolMarquee />
      </section>

      {/* KPIs */}
      <section className="pt-6 pb-6">
        <div className="mb-4 text-center text-xs uppercase tracking-widest text-[var(--color-muted)]">
          {k.sectionLabel}
        </div>
        <KPICards kpis={kpis} columns={4} />
      </section>

      {/* Parity + reproduce */}
      <section className="pb-16">
        <div className="mx-auto max-w-3xl space-y-3">
          <ParityBadge />
          <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs">
            <span className="text-[var(--color-muted)]">
              {dict.landing.reproduce.lead}
            </span>
            <Link
              href="/backtest?symbol=BTCUSDT&interval=1h&start=2023-01-01&end=2026-02-28"
              className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:underline"
            >
              {dict.landing.reproduce.cta}
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
            {g.titleTop}
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              {g.titleBottom}
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[var(--color-muted)] lg:mx-0">
            {g.body}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-left">
            <MiniStat n="500+" l={g.stats.symbols} />
            <MiniStat n="14" l={g.stats.timeframes} />
            <MiniStat n="0" l={g.stats.apiKeys} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">{hiw.title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[var(--color-muted)]">
          {hiw.subtitle}
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <FeatureCard icon={<Layers className="h-5 w-5" />} title={hiw.cards.pick.title} text={hiw.cards.pick.text} />
          <FeatureCard icon={<Zap className="h-5 w-5" />} title={hiw.cards.engine.title} text={hiw.cards.engine.text} />
          <FeatureCard icon={<BarChart3 className="h-5 w-5" />} title={hiw.cards.results.title} text={hiw.cards.results.text} />
        </div>
      </section>

      {/* Strategy */}
      <section className="py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">{strat.title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--color-muted)]">{strat.subtitle}</p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <StrategyCard icon={<LineChart className="h-5 w-5" />} title={strat.cards.ms.title} text={strat.cards.ms.text} />
          <StrategyCard icon={<Shield className="h-5 w-5" />} title={strat.cards.fvg.title} text={strat.cards.fvg.text} />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <MiniCard label={strat.mini.risk.label} value={strat.mini.risk.value} />
          <MiniCard label={strat.mini.sl.label} value={strat.mini.sl.value} />
          <MiniCard label={strat.mini.tps.label} value={strat.mini.tps.value} />
        </div>
      </section>

      {/* Disclaimer */}
      <section className="my-16 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center text-xs text-yellow-200/80 backdrop-blur-md">
        {dict.landing.disclaimer}
      </section>
    </div>
    </>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-6 backdrop-blur-md transition-colors hover:border-emerald-500/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p>
    </div>
  );
}

function StrategyCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)]/80 to-[var(--color-bg)]/80 p-6 backdrop-blur-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">{icon}</div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{text}</p>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4 backdrop-blur-md">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">{label}</div>
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
