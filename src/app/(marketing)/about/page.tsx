import Link from "next/link";
import { HeroScene } from "@/components/ui/HeroScene";
import { AnchorTOC } from "@/components/AnchorTOC";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { FvgDiagram } from "@/components/visuals/diagrams/FvgDiagram";
import { MsDiagram } from "@/components/visuals/diagrams/MsDiagram";
import { RiskDiagram } from "@/components/visuals/diagrams/RiskDiagram";

export const metadata = {
  title: "About Helix",
  description: "Live forward test of a quantitative trading strategy.",
};

// Realism-patched baseline (2026-05-08). Earlier versions were never
// re-baselined under the engine-realism patches (P1-P4), so their pre-patch
// metrics would be misleading to display.
const evolution = [
  { version: "V1", changes: "Baseline: 1H MS+FVG, no trailing", ret: "—", sharpe: "—", dd: "—", wr: "—" },
  { version: "V2", changes: "Suppress SL 19 bars + breakeven after TP1 + min score 0.60", ret: "—", sharpe: "—", dd: "—", wr: "—" },
  { version: "V3", changes: "TP rebalance + extended SL suppression to 30 bars", ret: "—", sharpe: "—", dd: "—", wr: "—" },
  { version: "V4", changes: "Flat 2% risk + SL suppression to 50 bars + TP1 5% / TP3 65% rebalance", ret: "—", sharpe: "—", dd: "—", wr: "—" },
  { version: "V5", changes: "Tighter 1× ATR SL/TP1 + 3% risk + 80% position cap (realism-patched baseline)", ret: "+87.0%", sharpe: "1.44", dd: "13.3%", wr: "64.6%", highlight: true },
];

const TOC_SECTIONS = [
  { id: "evolution", label: "Strategy evolution" },
  { id: "ms", label: "Market Structure" },
  { id: "fvg", label: "Fair Value Gap" },
  { id: "confluence", label: "Confluence scoring" },
  { id: "risk", label: "Risk management" },
  { id: "tps", label: "Progressive TPs" },
  { id: "execution", label: "Execution model" },
  { id: "walk-forward", label: "Walk-forward" },
  { id: "disclaimer", label: "Disclaimer" },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroScene />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/60 via-[var(--color-bg)]/90 to-[var(--color-bg)]" />
      </div>

      <div className="relative z-20 mx-auto max-w-6xl px-6 py-14 sm:py-20">
        {/* Hero */}
        <div className="text-center">
          <SectionLabel>Methodology</SectionLabel>
          <h1 className="mt-6 text-[clamp(2rem,6vw,3.75rem)] font-light leading-tight tracking-tight text-white/95">
            About Helix
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--color-muted)]">
            A research framework for testing price-action concepts on
            cryptocurrency markets. Open-source, version-tracked.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[180px_1fr]">
          <AnchorTOC sections={TOC_SECTIONS} />

          <div className="min-w-0 max-w-3xl">
            {/* ── Evolution ─────────────────────────────────────── */}
            <Section id="evolution" label="01 · Strategy evolution">
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                Each version is a single change against the previous baseline.
                Engine realism patches (2026-05-08) re-baselined the V5
                figures honestly; earlier rows were not re-baselined.
              </p>

              <div className="mt-6">
                <EvolutionChart />
              </div>

              <div className="mt-6 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    <tr>
                      <th className="px-4 py-3 text-left">Version</th>
                      <th className="px-4 py-3 text-left">Key changes</th>
                      <th className="px-4 py-3 text-right">Return</th>
                      <th className="px-4 py-3 text-right">Sharpe</th>
                      <th className="px-4 py-3 text-right">Max DD</th>
                      <th className="px-4 py-3 text-right">Win rate</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {evolution.map((row) => (
                      <tr
                        key={row.version}
                        className={
                          "border-t border-[var(--color-border)]/50 " +
                          (row.highlight ? "bg-emerald-500/5" : "")
                        }
                      >
                        <td className="px-4 py-3 font-semibold">
                          {row.version}
                          {row.highlight && (
                            <span className="ml-2 rounded-sm bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                              current
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-sans text-xs text-[var(--color-muted)]">
                          {row.changes}
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${row.ret === "—" ? "text-[var(--color-muted)]/40" : "text-emerald-400"}`}
                        >
                          {row.ret}
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${row.sharpe === "—" ? "text-[var(--color-muted)]/40" : ""}`}
                        >
                          {row.sharpe}
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${row.dd === "—" ? "text-[var(--color-muted)]/40" : "text-red-400/80"}`}
                        >
                          {row.dd}
                        </td>
                        <td
                          className={`px-4 py-3 text-right ${row.wr === "—" ? "text-[var(--color-muted)]/40" : ""}`}
                        >
                          {row.wr}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ── Market Structure ──────────────────────────────── */}
            <Section id="ms" label="02 · Market Structure">
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                The engine identifies swing highs and lows using a 5-bar
                lookback window on both sides. Each new swing is classified as
                a Higher High (HH), Higher Low (HL), Lower High (LH), or Lower
                Low (LL). The market is in an uptrend when we see HH+HL and a
                downtrend when we see LH+LL. A close that breaks above the
                last swing high in an uptrend produces a{" "}
                <em>Break of Structure (BOS)</em> long signal; a flip from
                uptrend to downtrend produces a{" "}
                <em>Change of Character (CHoCH)</em> reversal signal. Signal
                strength scales with trend maturity (consecutive same-direction
                swings) and the size of the breakout candle relative to ATR.
              </p>
              <div className="mt-6">
                <MsDiagram />
              </div>
            </Section>

            {/* ── Fair Value Gap ────────────────────────────────── */}
            <Section id="fvg" label="03 · Fair Value Gap">
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                A Fair Value Gap is a 3-candle pattern where price leaves an
                unfilled imbalance between candle 1 and candle 3. Each gap
                must be at least 0.3× ATR to count as significant. The engine
                tracks every active FVG and emits a retest entry signal the
                first time price returns to the zone. Signal strength rewards
                larger and fresher gaps.
              </p>
              <div className="mt-6">
                <FvgDiagram />
              </div>
            </Section>

            {/* ── Confluence ────────────────────────────────────── */}
            <Section id="confluence" label="04 · Confluence scoring">
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                The aggregator combines Market Structure and FVG signals into
                a single decision. Each enabled indicator contributes to a
                normalized 0–1 score. A trade only fires when the aggregated
                score is at least <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-mono text-xs">0.50</code> (two confirming sources
                required) AND passes the post-aggregation filter of{" "}
                <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-mono text-xs">0.60</code>.
              </p>
            </Section>

            {/* ── Risk ──────────────────────────────────────────── */}
            <Section id="risk" label="05 · Risk management">
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                V5 risks 3% of equity per trade with an 80% position cap. Stop
                loss is calculated at 1× ATR — but the regular SL is{" "}
                <em>suppressed for the first 50 bars</em> of the trade. During
                the suppression window only an 8× ATR &ldquo;hard stop&rdquo;
                provides catastrophic protection. After 50 bars the regular
                stop is active. This dramatically reduces the early-shakeout
                problem observed in volatile crypto markets.
              </p>
              <div className="mt-6">
                <RiskDiagram />
              </div>
            </Section>

            {/* ── TPs ───────────────────────────────────────────── */}
            <Section id="tps" label="06 · Progressive take-profits">
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                Profits are taken in three tranches:
              </p>
              <ul className="mt-3 space-y-1 pl-5 text-[var(--color-muted)] [list-style-type:'·_'] marker:text-[var(--color-muted)]/40">
                <li>5% of position closed at 1× ATR (TP1)</li>
                <li>30% closed at 4× ATR (TP2) — only after TP1</li>
                <li>65% closed at 6× ATR (TP3) — only after TP2</li>
              </ul>
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                When TP1 is hit, the stop loss is moved to{" "}
                <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-mono text-xs">entry + 0.30 × ATR</code>
                {" "}(breakeven plus a small buffer), locking in protection
                while leaving the remaining 95% of size to capture the larger
                move.
              </p>
            </Section>

            {/* ── Execution ─────────────────────────────────────── */}
            <Section id="execution" label="07 · Execution model">
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                Every entry is filled at the bar open with adverse execution
                cost: 0.02% legacy slippage + ATR-scaled slippage
                (0.05× ATR) + half-spread (0.015× ATR). Stop loss and
                end-of-data exits pay the full cost; take-profit fills pay
                ATR-scaled slippage and spread only (P1 patch requires the
                bar close to confirm the level). Commission is 0.075% of
                notional on both entry and exit, mirroring Binance taker fees.
              </p>
            </Section>

            {/* ── Walk-forward ──────────────────────────────────── */}
            <Section id="walk-forward" label="08 · Walk-forward">
              <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
                The Python research code supports k-fold walk-forward
                validation with configurable train/test splits. Pre-launch
                walk-forward results were generated against a different
                engine model and are not directly comparable to the
                realism-patched baseline.
              </p>
            </Section>

            {/* ── Disclaimer ────────────────────────────────────── */}
            <section
              id="disclaimer"
              className="mt-16 scroll-mt-24 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-5 py-5 text-sm leading-relaxed text-yellow-200/80 backdrop-blur-md"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-200/60">
                09 · Disclaimer
              </div>
              <p className="mt-3">
                Helix is a research and educational tool. Backtested results
                do not predict future performance. Past performance is not
                indicative of future results. Trading cryptocurrency carries
                substantial risk of loss and is not suitable for everyone.
                Nothing on this site constitutes investment, financial,
                trading, or any other form of advice. You are solely
                responsible for any decisions you make based on the
                information presented here.
              </p>
            </section>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16 scroll-mt-24 first:mt-0">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]/70">
      {children}
    </div>
  );
}
