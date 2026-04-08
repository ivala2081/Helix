import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnchorTOC } from "@/components/AnchorTOC";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { FvgDiagram } from "@/components/visuals/diagrams/FvgDiagram";
import { MsDiagram } from "@/components/visuals/diagrams/MsDiagram";
import { RiskDiagram } from "@/components/visuals/diagrams/RiskDiagram";

export const metadata = {
  title: "About Helix · Methodology & Strategy Evolution",
  description:
    "How Helix evolved from V1 to V5 — Market Structure, Fair Value Gap, SL suppression, progressive take-profits, and walk-forward validation.",
};

const evolution = [
  { version: "V1", changes: "Baseline: 1H MS+FVG, no trailing", ret: "+49.7%", sharpe: "1.81", dd: "10.3%", wr: "—" },
  { version: "V2", changes: "Suppress SL 19 bars + breakeven after TP1 + min score 0.60", ret: "+95.5%", sharpe: "3.36", dd: "5.9%", wr: "71.1%" },
  { version: "V3", changes: "TP rebalance + extended SL suppression to 30 bars", ret: "+173.2%", sharpe: "4.66", dd: "4.1%", wr: "75.9%" },
  { version: "V4", changes: "Flat 2% risk + SL suppression to 50 bars + TP1 5% / TP3 65% rebalance", ret: "+250.5%", sharpe: "4.29", dd: "6.6%", wr: "75.8%" },
  { version: "V5", changes: "Tighter 1× ATR SL/TP1 + 3% risk + 80% position cap", ret: "+949.7%", sharpe: "5.40", dd: "8.55%", wr: "84.3%", highlight: true },
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
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_1fr]">
        <AnchorTOC sections={TOC_SECTIONS} />

        <div className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            About Helix
          </h1>
          <p className="mt-3 text-lg text-[var(--color-muted)]">
            A research framework for testing institutional price-action concepts on
            cryptocurrency markets.
          </p>

          {/* Evolution */}
          <section id="evolution" className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Strategy evolution</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Each version is a single, validated improvement over the previous baseline. No
              curve-fitting — every change was retested with walk-forward validation.
            </p>

            <div className="mt-6">
              <EvolutionChart />
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-md">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-bg)]/60 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Version</th>
                    <th className="px-4 py-3 text-left">Key changes</th>
                    <th className="px-4 py-3 text-right">Return</th>
                    <th className="px-4 py-3 text-right">Sharpe</th>
                    <th className="px-4 py-3 text-right">Max DD</th>
                    <th className="px-4 py-3 text-right">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {evolution.map((row) => (
                    <tr
                      key={row.version}
                      className={
                        "border-t border-[var(--color-border)]/50 " +
                        (row.highlight ? "bg-emerald-500/5" : "")
                      }
                    >
                      <td className="px-4 py-3 font-mono font-semibold">
                        {row.version}
                        {row.highlight && (
                          <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
                            current
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)]">{row.changes}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-400">{row.ret}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{row.sharpe}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-red-400">{row.dd}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{row.wr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Methodology */}
          <section id="ms" className="mt-16 scroll-mt-24">
            <h3 className="text-lg font-semibold text-emerald-400">Market Structure</h3>
            <div className="mt-2 leading-relaxed text-[var(--color-muted)]">
              The engine identifies swing highs and lows using a 5-bar lookback window on
              both sides. Each new swing is classified as a Higher High (HH), Higher Low
              (HL), Lower High (LH), or Lower Low (LL). The market is in an uptrend when
              we see HH+HL and a downtrend when we see LH+LL. A close that breaks above
              the last swing high in an uptrend produces a <em>Break of Structure (BOS)</em>{" "}
              long signal; a flip from uptrend to downtrend produces a{" "}
              <em>Change of Character (CHoCH)</em> reversal signal. Signal strength scales
              with trend maturity (consecutive same-direction swings) and the size of the
              breakout candle relative to ATR.
            </div>
            <div className="mt-4">
              <MsDiagram />
            </div>
          </section>

          <section id="fvg" className="mt-16 scroll-mt-24">
            <h3 className="text-lg font-semibold text-emerald-400">Fair Value Gap</h3>
            <div className="mt-2 leading-relaxed text-[var(--color-muted)]">
              A Fair Value Gap is a 3-candle pattern where price leaves an unfilled
              imbalance between candle 1 and candle 3. Each gap must be at least 0.3× ATR
              to count as significant. The engine tracks every active FVG and emits a
              retest entry signal the first time price returns to the zone. Signal
              strength rewards larger and fresher gaps.
            </div>
            <div className="mt-4">
              <FvgDiagram />
            </div>
          </section>

          <section id="confluence" className="mt-16 scroll-mt-24">
            <h3 className="text-lg font-semibold text-emerald-400">Confluence scoring</h3>
            <div className="mt-2 leading-relaxed text-[var(--color-muted)]">
              The aggregator combines Market Structure and FVG signals into a single
              decision. Each enabled indicator contributes to a normalized 0–1 score. A
              trade only fires when the aggregated score is at least <code>0.50</code> (two
              confirming sources required) AND passes the post-aggregation filter of{" "}
              <code>0.60</code>.
            </div>
          </section>

          <section id="risk" className="mt-16 scroll-mt-24">
            <h3 className="text-lg font-semibold text-emerald-400">Risk management</h3>
            <div className="mt-2 leading-relaxed text-[var(--color-muted)]">
              V5 risks 3% of equity per trade with an 80% position cap. Stop loss is
              calculated at 1× ATR — but the regular SL is <em>suppressed for the first
              50 bars</em> of the trade. During the suppression window only a 15× ATR
              &ldquo;hard stop&rdquo; provides catastrophic protection. After 50 bars the
              regular stop is active. This dramatically reduces the early-shakeout problem
              observed in volatile crypto markets.
            </div>
            <div className="mt-4">
              <RiskDiagram />
            </div>
          </section>

          <section id="tps" className="mt-16 scroll-mt-24">
            <h3 className="text-lg font-semibold text-emerald-400">Progressive take-profits</h3>
            <div className="mt-2 leading-relaxed text-[var(--color-muted)]">
              Profits are taken in three tranches:
              <ul className="mt-2 list-disc pl-5">
                <li>5% of position closed at 1× ATR (TP1)</li>
                <li>30% closed at 4× ATR (TP2) — only after TP1</li>
                <li>65% closed at 6× ATR (TP3) — only after TP2</li>
              </ul>
              When TP1 is hit, the stop loss is moved to <code>entry + 0.30 × ATR</code>{" "}
              (breakeven plus a small buffer), locking in protection while leaving the
              remaining 95% of size to capture the larger move.
            </div>
          </section>

          <section id="execution" className="mt-16 scroll-mt-24">
            <h3 className="text-lg font-semibold text-emerald-400">Execution model</h3>
            <div className="mt-2 leading-relaxed text-[var(--color-muted)]">
              Every entry is filled at the bar close with 0.02% adverse slippage. Stop
              loss and end-of-data exits also pay slippage; take-profit fills do not
              (they are limit orders). Each partial close is charged 0.075% commission on
              both the entry and exit notional, mirroring Binance taker fees realistically.
            </div>
          </section>

          <section id="walk-forward" className="mt-16 scroll-mt-24">
            <h3 className="text-lg font-semibold text-emerald-400">Walk-forward validation</h3>
            <div className="mt-2 leading-relaxed text-[var(--color-muted)]">
              The Python research code runs 5-fold walk-forward validation with a 60/40
              train/test split per fold. V5 produces 5/5 profitable test folds with an
              average out-of-sample return of +48.72%. The web app shows the in-sample
              backtest only — for full validation, see the research repository.
            </div>
          </section>

          {/* Disclaimer */}
          <section
            id="disclaimer"
            className="mt-16 scroll-mt-24 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-sm leading-relaxed text-yellow-200/80 backdrop-blur-md"
          >
            <h3 className="mb-2 font-semibold text-yellow-200">Disclaimer</h3>
            <p>
              Helix is a research and educational tool. Backtested results do not predict
              future performance. Past performance is not indicative of future results.
              Trading cryptocurrency carries substantial risk of loss and is not suitable
              for everyone. Nothing on this site constitutes investment, financial,
              trading, or any other form of advice. You are solely responsible for any
              decisions you make based on the information presented here.
            </p>
          </section>

          <div className="mt-12 text-center">
            <Link
              href="/backtest"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-emerald-500 px-6 text-base font-semibold text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
            >
              Try it yourself
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
