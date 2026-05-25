"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroScene } from "@/components/ui/HeroScene";

interface Phase {
  id: number;
  label: string;
  status: "pending" | "in_progress" | "completed";
  deliverables: string[];
}

interface StatusFile {
  generated_at: string;
  current_phase: number;
  current_phase_label: string;
  current_phase_progress_pct: number;
  phases: Phase[];
}

interface ConcurrentBaseline {
  generated_at: string;
  params_label: string;
  date_range: { start: string; end: string };
  symbols: string[];
  per_symbol: Array<{
    symbol: string;
    n_trades: number;
    win_rate: number;
    profit_factor: number | null;
    total_return_pct: number;
    max_drawdown_pct: number;
    sharpe_ratio: number;
  }>;
  portfolio_aggregate: {
    n_trades_total: number;
    portfolio_return_pct: number;
    portfolio_sharpe_annualized: number;
    portfolio_max_dd_pct: number;
    portfolio_r_per_day: number;
    simul_dd_3plus_days: number;
    simul_dd_3plus_pct: number;
    total_days: number;
  };
}

interface WalkForward {
  generated_at: string;
  params_label: string;
  result: {
    k_folds: number;
    folds_positive: number;
    verdict_5of6: string;
    verdict_4of6: string;
    portfolio_folds: Array<{
      fold: number;
      train_r_per_day: number;
      test_r_per_day: number;
      test_positive: boolean;
    }>;
  };
}

interface StressTests {
  generated_at: string;
  windows: Array<{
    label: string;
    start: string;
    end: string;
    what_to_watch: string;
    n_trades_total: number;
    win_rate_aggregate: number;
    r_total: number;
    r_per_day: number;
  }>;
}

interface V6StrategySummary {
  generated_at: string;
  label: string;
  changes_count: number;
  changes: Record<string, { v5: unknown; v6: unknown }>;
  smoke_test: {
    symbol: string;
    date_range: string;
    v5_n_trades: number;
    v5_win_rate: number;
    v5_profit_factor: number;
    v5_total_return_pct: number;
    v6_n_trades: number;
    v6_win_rate: number;
    v6_profit_factor: number;
    v6_total_return_pct: number;
    verdict: string;
  };
}

interface AblationRow {
  label: string;
  description?: string;
  skipped?: boolean;
  reason?: string;
  per_symbol?: Array<{
    symbol: string;
    n_trades: number;
    win_rate: number;
    profit_factor: number | null;
    total_return_pct: number;
    max_drawdown_pct: number;
    sharpe_ratio: number;
  }>;
  portfolio_aggregate?: {
    n_trades_total: number;
    portfolio_return_pct: number;
    portfolio_sharpe_annualized: number;
    portfolio_max_dd_pct: number;
    portfolio_r_per_day: number;
    portfolio_profit_factor: number | null;
  };
}

interface AblationMatrix {
  generated_at: string;
  constraint_note: string;
  symbols: string[];
  date_range: { start: string; end: string };
  ablations: AblationRow[];
}

interface V6OOSHoldout {
  generated_at: string;
  symbols: string[];
  oos_window: { start: string; end: string };
  result: AblationRow;
}

const COIN_TINT: Record<string, string> = {
  BTCUSDT: "text-orange-400",
  ETHUSDT: "text-blue-400",
  SOLUSDT: "text-violet-400",
  XRPUSDT: "text-emerald-400",
  BNBUSDT: "text-yellow-400",
};

export default function V6Page() {
  const [status, setStatus] = useState<StatusFile | null>(null);
  const [v5Baseline, setV5Baseline] = useState<ConcurrentBaseline | null>(null);
  const [v5WF, setV5WF] = useState<WalkForward | null>(null);
  const [v5Stress, setV5Stress] = useState<StressTests | null>(null);
  const [v6Strategy, setV6Strategy] = useState<V6StrategySummary | null>(null);
  const [v6Ablations, setV6Ablations] = useState<AblationMatrix | null>(null);
  const [v6WF, setV6WF] = useState<WalkForward | null>(null);
  const [v6Stress, setV6Stress] = useState<StressTests | null>(null);
  const [v6OOS, setV6OOS] = useState<V6OOSHoldout | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/v6/status.json").then((r) => (r.ok ? r.json() : null)),
      fetch("/data/v6/v5_concurrent_baseline.json").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/data/v6/v5_walk_forward.json").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/data/v6/v5_stress_tests.json").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/data/v6/v6_strategy_summary.json").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/data/v6/v6_validation_run.json").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/data/v6/v6_walk_forward.json").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/data/v6/v6_stress_tests.json").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/data/v6/v6_oos_holdout.json").then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([s, b, wf, st, v6s, v6ab, v6wf, v6st, v6oos]) => {
      setStatus(s);
      setV5Baseline(b);
      setV5WF(wf);
      setV5Stress(st);
      setV6Strategy(v6s);
      setV6Ablations(v6ab);
      setV6WF(v6wf);
      setV6Stress(v6st);
      setV6OOS(v6oos);
    });
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroScene />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg)]/60 via-[var(--color-bg)]/90 to-[var(--color-bg)]" />
      </div>

      <div className="relative z-20 mx-auto flex max-w-6xl flex-col gap-14 px-6 py-14 sm:py-20">
        {/* Hero */}
        <div className="text-center">
          <SectionLabel>R&amp;D</SectionLabel>
          <h1 className="mt-6 text-[clamp(2rem,6vw,3.75rem)] font-light leading-tight tracking-tight text-white/95">
            V6 development
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-muted)]">
            Walk-forward validated strategy iteration with regime awareness,
            multi-TF agreement, and live-parity engine realism.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]/60">
            See <a href="https://github.com/ivala2081" className="underline">docs/v6-plan.md</a> for the full charter.
          </p>
        </div>

        {/* Phase status */}
        {status && <PhaseStatus status={status} />}

        {/* Phase 1 — V5 baseline */}
        {v5Baseline ? (
          <V5BaselineSection data={v5Baseline} />
        ) : (
          <PendingSection label="Phase 1 · V5 honest baseline" note="awaiting reports/v5_concurrent_baseline.json" />
        )}

        {/* Phase 1 — Walk-forward */}
        {v5WF ? (
          <WalkForwardSection data={v5WF} />
        ) : (
          <PendingSection label="Phase 1 · Walk-forward (6 folds)" note="awaiting reports/v5_walk_forward.json" />
        )}

        {/* Phase 1 — Stress */}
        {v5Stress ? (
          <StressSection data={v5Stress} />
        ) : (
          <PendingSection label="Phase 1 · Stress tests" note="awaiting reports/v5_stress_tests.json" />
        )}

        {/* Phase 2 — V6 strategy summary */}
        {v6Strategy ? (
          <V6StrategySection data={v6Strategy} />
        ) : (
          <PendingSection
            label="Phase 2 · V6 strategy summary"
            note="filled when strategy_v6.py is complete (Day 4-8)"
          />
        )}

        {/* Phase 3 — V6 ablation matrix */}
        {v6Ablations ? (
          <V6AblationSection data={v6Ablations} />
        ) : (
          <PendingSection
            label="Phase 3 · V6 ablation matrix"
            note="awaiting reports/v6_validation_run.json"
          />
        )}

        {/* Phase 3 — V6 walk-forward */}
        {v6WF ? (
          <V6WalkForwardSection data={v6WF} />
        ) : (
          <PendingSection
            label="Phase 3 · V6 walk-forward (6 folds)"
            note="awaiting reports/v6_walk_forward.json"
          />
        )}

        {/* Phase 3 — V6 stress */}
        {v6Stress ? (
          <V6StressSection data={v6Stress} />
        ) : (
          <PendingSection
            label="Phase 3 · V6 stress tests"
            note="awaiting reports/v6_stress_tests.json"
          />
        )}

        {/* Phase 3 — V6 OOS holdout */}
        {v6OOS ? (
          <V6OOSSection data={v6OOS} />
        ) : (
          <PendingSection
            label="Phase 3g · V6 OOS holdout · 2026-Q1"
            note="awaiting reports/v6_oos_holdout.json"
          />
        )}

        {/* Phase 4 — Head-to-head */}
        <PendingSection
          label="Phase 4 · V5 vs V6 head-to-head"
          note="filled when decision is made (Day 13)"
        />

        {/* Phase 5 — Deployment */}
        <PendingSection
          label="Phase 5 · Live deployment status"
          note="only filled if Gate 4 is LAUNCH (Day 14-16)"
        />

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-6 text-sm">
          <Link href="/" className="font-medium text-[var(--color-muted)] transition-colors hover:text-white">
            ← Home
          </Link>
          <Link href="/live" className="font-medium text-[var(--color-muted)] transition-colors hover:text-white">
            Live (V5)
          </Link>
          <Link href="/about" className="font-medium text-[var(--color-muted)] transition-colors hover:text-white">
            Methodology
          </Link>
        </div>
      </div>
    </div>
  );
}

function PhaseStatus({ status }: { status: StatusFile }) {
  return (
    <section>
      <SectionLabel>Plan progress</SectionLabel>
      <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-2 text-left">Phase</th>
              <th className="px-4 py-2 text-left">Label</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Deliverables</th>
            </tr>
          </thead>
          <tbody>
            {status.phases.map((p) => {
              const tone =
                p.status === "completed"
                  ? "text-emerald-400"
                  : p.status === "in_progress"
                    ? "text-amber-400"
                    : "text-[var(--color-muted)]/60";
              return (
                <tr
                  key={p.id}
                  className="border-t border-[var(--color-border)]/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)]">
                    {String(p.id).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3 font-medium text-white/90">
                    {p.label}
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs uppercase tracking-wider ${tone}`}>
                    {p.status.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[var(--color-muted)]/70">
                    {p.deliverables.slice(0, 2).join(", ")}
                    {p.deliverables.length > 2 &&
                      ` · +${p.deliverables.length - 2} more`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)]/60">
        Last updated {new Date(status.generated_at).toLocaleString()}
      </p>
    </section>
  );
}

function V5BaselineSection({ data }: { data: ConcurrentBaseline }) {
  const agg = data.portfolio_aggregate;
  return (
    <section>
      <SectionLabel>Phase 1 · V5 honest baseline · multi-symbol concurrent</SectionLabel>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {data.date_range.start} → {data.date_range.end} · OOS held back
      </p>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Cell
          label="Portfolio return"
          value={`${agg.portfolio_return_pct >= 0 ? "+" : ""}${agg.portfolio_return_pct.toFixed(2)}%`}
          tone={agg.portfolio_return_pct >= 0 ? "emerald" : "red"}
        />
        <Cell
          label="Sharpe (ann.)"
          value={agg.portfolio_sharpe_annualized.toFixed(2)}
          tone={agg.portfolio_sharpe_annualized >= 1 ? "emerald" : "red"}
        />
        <Cell label="Max DD" value={`${agg.portfolio_max_dd_pct.toFixed(2)}%`} tone="red" />
        <Cell label="R / day" value={`${agg.portfolio_r_per_day >= 0 ? "+" : ""}${agg.portfolio_r_per_day.toFixed(3)}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
        <Cell label="Total trades" value={String(agg.n_trades_total)} />
        <Cell
          label="Simult. DD (≥3 sym)"
          value={`${agg.simul_dd_3plus_pct.toFixed(1)}%`}
          tone="red"
        />
        <Cell label="Days span" value={String(agg.total_days)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-right">n</th>
              <th className="px-3 py-2 text-right">WR</th>
              <th className="px-3 py-2 text-right">PF</th>
              <th className="px-3 py-2 text-right">Return</th>
              <th className="px-3 py-2 text-right">Max DD</th>
              <th className="px-3 py-2 text-right">Sharpe</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {data.per_symbol.map((r) => {
              const tint = COIN_TINT[r.symbol] ?? "text-[var(--color-muted)]";
              return (
                <tr key={r.symbol} className="border-t border-[var(--color-border)]/50">
                  <td className={`px-3 py-2 font-semibold ${tint}`}>
                    {r.symbol.replace("USDT", "")}
                  </td>
                  <td className="px-3 py-2 text-right">{r.n_trades}</td>
                  <td className="px-3 py-2 text-right">{(r.win_rate * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right">
                    {r.profit_factor == null ? "∞" : r.profit_factor.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${r.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {r.total_return_pct >= 0 ? "+" : ""}
                    {r.total_return_pct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-red-400/80">
                    {r.max_drawdown_pct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right">{r.sharpe_ratio.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WalkForwardSection({ data }: { data: WalkForward }) {
  const r = data.result;
  const passTone = r.folds_positive >= 5 ? "emerald" : r.folds_positive >= 4 ? "amber" : "red";
  return (
    <section>
      <SectionLabel>Phase 1 · Walk-forward · {r.k_folds} folds</SectionLabel>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
        <Cell
          label="Positive folds"
          value={`${r.folds_positive} / ${r.k_folds}`}
          tone={passTone === "emerald" ? "emerald" : passTone === "red" ? "red" : undefined}
        />
        <Cell label="Gate 5/6" value={r.verdict_5of6} tone={r.verdict_5of6 === "PASS" ? "emerald" : "red"} />
        <Cell label="Gate 4/6" value={r.verdict_4of6} tone={r.verdict_4of6 === "PASS" ? "emerald" : "red"} />
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Fold</th>
              <th className="px-3 py-2 text-right">Train R/day</th>
              <th className="px-3 py-2 text-right">Test R/day</th>
              <th className="px-3 py-2 text-right">Test pos?</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {r.portfolio_folds.map((f) => (
              <tr key={f.fold} className="border-t border-[var(--color-border)]/50">
                <td className="px-3 py-2">{f.fold}</td>
                <td
                  className={`px-3 py-2 text-right ${f.train_r_per_day >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {f.train_r_per_day >= 0 ? "+" : ""}
                  {f.train_r_per_day.toFixed(3)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${f.test_r_per_day >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {f.test_r_per_day >= 0 ? "+" : ""}
                  {f.test_r_per_day.toFixed(3)}
                </td>
                <td
                  className={`px-3 py-2 text-right text-xs uppercase ${f.test_positive ? "text-emerald-400" : "text-red-400"}`}
                >
                  {f.test_positive ? "YES" : "NO"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StressSection({ data }: { data: StressTests }) {
  return (
    <section>
      <SectionLabel>Phase 1 · Stress tests</SectionLabel>
      <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Window</th>
              <th className="px-3 py-2 text-right">n</th>
              <th className="px-3 py-2 text-right">WR</th>
              <th className="px-3 py-2 text-right">R/day</th>
              <th className="px-3 py-2 text-right">R total</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {data.windows.map((w) => (
              <tr key={w.label} className="border-t border-[var(--color-border)]/50">
                <td className="px-3 py-2 text-xs">{w.label}</td>
                <td className="px-3 py-2 text-right">{w.n_trades_total}</td>
                <td className="px-3 py-2 text-right">
                  {(w.win_rate_aggregate * 100).toFixed(1)}%
                </td>
                <td
                  className={`px-3 py-2 text-right ${w.r_per_day >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {w.r_per_day >= 0 ? "+" : ""}
                  {w.r_per_day.toFixed(3)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${w.r_total >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {w.r_total >= 0 ? "+" : ""}
                  {w.r_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function V6StrategySection({ data }: { data: V6StrategySummary }) {
  const s = data.smoke_test;
  return (
    <section>
      <SectionLabel>Phase 2 · V6 strategy summary · BTC smoke test</SectionLabel>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {data.changes_count} params changed from V5 · Smoke range: {s.date_range}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Cell label="V5 trades" value={String(s.v5_n_trades)} />
        <Cell
          label="V5 PF"
          value={s.v5_profit_factor.toFixed(2)}
          tone={s.v5_profit_factor >= 1.5 ? "emerald" : "amber"}
        />
        <Cell label="V6 trades" value={String(s.v6_n_trades)} />
        <Cell
          label="V6 PF"
          value={s.v6_profit_factor.toFixed(2)}
          tone={s.v6_profit_factor >= 1.5 ? "emerald" : s.v6_profit_factor >= 1.0 ? "amber" : "red"}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
        <Cell
          label="V5 return"
          value={`${s.v5_total_return_pct >= 0 ? "+" : ""}${s.v5_total_return_pct.toFixed(1)}%`}
          tone={s.v5_total_return_pct >= 0 ? "emerald" : "red"}
        />
        <Cell
          label="V6 return"
          value={`${s.v6_total_return_pct >= 0 ? "+" : ""}${s.v6_total_return_pct.toFixed(1)}%`}
          tone={s.v6_total_return_pct >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
        <span className="font-mono uppercase tracking-wider text-[10px] text-amber-200/70">verdict</span>
        <p className="mt-1">{s.verdict}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-2 text-left">Param</th>
              <th className="px-4 py-2 text-right">V5</th>
              <th className="px-4 py-2 text-right">V6</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {Object.entries(data.changes).map(([key, val]) => (
              <tr key={key} className="border-t border-[var(--color-border)]/50">
                <td className="px-4 py-2 text-xs text-white/85">{key}</td>
                <td className="px-4 py-2 text-right text-[var(--color-muted)]/70">
                  {val.v5 == null ? "—" : String(val.v5)}
                </td>
                <td className="px-4 py-2 text-right text-emerald-400/90">
                  {val.v6 == null ? "—" : String(val.v6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function V6AblationSection({ data }: { data: AblationMatrix }) {
  return (
    <section>
      <SectionLabel>Phase 3 · V6 ablation matrix · {data.symbols.length}-symbol concurrent</SectionLabel>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {data.date_range.start} → {data.date_range.end} · {data.constraint_note}
      </p>
      <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Config</th>
              <th className="px-3 py-2 text-right">n</th>
              <th className="px-3 py-2 text-right">Return</th>
              <th className="px-3 py-2 text-right">PF</th>
              <th className="px-3 py-2 text-right">Sharpe</th>
              <th className="px-3 py-2 text-right">Max DD</th>
              <th className="px-3 py-2 text-right">R/day</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {data.ablations.map((ab) => {
              if (ab.skipped || !ab.portfolio_aggregate) {
                return (
                  <tr key={ab.label} className="border-t border-[var(--color-border)]/50">
                    <td className="px-3 py-2 text-xs text-white/85">{ab.label}</td>
                    <td colSpan={6} className="px-3 py-2 text-right text-[10px] uppercase text-[var(--color-muted)]/60">
                      skipped · {ab.reason}
                    </td>
                  </tr>
                );
              }
              const agg = ab.portfolio_aggregate;
              const isV5 = ab.label === "V5_fair";
              return (
                <tr
                  key={ab.label}
                  className={`border-t border-[var(--color-border)]/50 ${isV5 ? "bg-[var(--color-bg)]/30" : ""}`}
                >
                  <td className="px-3 py-2 text-xs">
                    <div className={`font-semibold ${isV5 ? "text-[var(--color-muted)]" : "text-white/90"}`}>
                      {ab.label}
                    </div>
                    {ab.description && (
                      <div className="mt-0.5 text-[10px] font-normal text-[var(--color-muted)]/60">
                        {ab.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{agg.n_trades_total}</td>
                  <td
                    className={`px-3 py-2 text-right ${agg.portfolio_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {agg.portfolio_return_pct >= 0 ? "+" : ""}
                    {agg.portfolio_return_pct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right">
                    {agg.portfolio_profit_factor == null ? "∞" : agg.portfolio_profit_factor.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${agg.portfolio_sharpe_annualized >= 1 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {agg.portfolio_sharpe_annualized.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-red-400/80">
                    {agg.portfolio_max_dd_pct.toFixed(2)}%
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${agg.portfolio_r_per_day >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {agg.portfolio_r_per_day >= 0 ? "+" : ""}
                    {agg.portfolio_r_per_day.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function V6WalkForwardSection({ data }: { data: WalkForward }) {
  const r = data.result;
  const passTone = r.folds_positive >= 5 ? "emerald" : r.folds_positive >= 4 ? "amber" : "red";
  return (
    <section>
      <SectionLabel>Phase 3 · V6 walk-forward · {r.k_folds} folds</SectionLabel>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
        <Cell
          label="Positive folds"
          value={`${r.folds_positive} / ${r.k_folds}`}
          tone={passTone === "emerald" ? "emerald" : passTone === "red" ? "red" : "amber"}
        />
        <Cell label="Gate 5/6" value={r.verdict_5of6} tone={r.verdict_5of6 === "PASS" ? "emerald" : "red"} />
        <Cell label="Gate 4/6" value={r.verdict_4of6} tone={r.verdict_4of6 === "PASS" ? "emerald" : "red"} />
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Fold</th>
              <th className="px-3 py-2 text-right">Train R/day</th>
              <th className="px-3 py-2 text-right">Test R/day</th>
              <th className="px-3 py-2 text-right">Test pos?</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {r.portfolio_folds.map((f) => (
              <tr key={f.fold} className="border-t border-[var(--color-border)]/50">
                <td className="px-3 py-2">{f.fold}</td>
                <td
                  className={`px-3 py-2 text-right ${f.train_r_per_day >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {f.train_r_per_day >= 0 ? "+" : ""}
                  {f.train_r_per_day.toFixed(3)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${f.test_r_per_day >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {f.test_r_per_day >= 0 ? "+" : ""}
                  {f.test_r_per_day.toFixed(3)}
                </td>
                <td
                  className={`px-3 py-2 text-right text-xs uppercase ${f.test_positive ? "text-emerald-400" : "text-red-400"}`}
                >
                  {f.test_positive ? "YES" : "NO"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function V6StressSection({ data }: { data: StressTests }) {
  return (
    <section>
      <SectionLabel>Phase 3 · V6 stress tests</SectionLabel>
      <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Window</th>
              <th className="px-3 py-2 text-right">n</th>
              <th className="px-3 py-2 text-right">WR</th>
              <th className="px-3 py-2 text-right">R/day</th>
              <th className="px-3 py-2 text-right">R total</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {data.windows.map((w) => (
              <tr key={w.label} className="border-t border-[var(--color-border)]/50">
                <td className="px-3 py-2 text-xs">
                  <div>{w.label}</div>
                  <div className="mt-0.5 text-[10px] font-normal text-[var(--color-muted)]/60">
                    {w.what_to_watch}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">{w.n_trades_total}</td>
                <td className="px-3 py-2 text-right">
                  {(w.win_rate_aggregate * 100).toFixed(1)}%
                </td>
                <td
                  className={`px-3 py-2 text-right ${w.r_per_day >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {w.r_per_day >= 0 ? "+" : ""}
                  {w.r_per_day.toFixed(3)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${w.r_total >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {w.r_total >= 0 ? "+" : ""}
                  {w.r_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function V6OOSSection({ data }: { data: V6OOSHoldout }) {
  const res = data.result;
  if (res.skipped || !res.portfolio_aggregate) {
    return (
      <section>
        <SectionLabel>Phase 3g · V6 OOS holdout · 2026-Q1</SectionLabel>
        <div className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          OOS skipped · {res.reason}
        </div>
      </section>
    );
  }
  const agg = res.portfolio_aggregate;
  return (
    <section>
      <SectionLabel>Phase 3g · V6 OOS holdout · {data.oos_window.start} → {data.oos_window.end}</SectionLabel>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Held-back data, never touched during dev. Symbols: {data.symbols.join(", ")}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Cell
          label="Return"
          value={`${agg.portfolio_return_pct >= 0 ? "+" : ""}${agg.portfolio_return_pct.toFixed(2)}%`}
          tone={agg.portfolio_return_pct >= 0 ? "emerald" : "red"}
        />
        <Cell
          label="PF"
          value={agg.portfolio_profit_factor == null ? "∞" : agg.portfolio_profit_factor.toFixed(2)}
          tone={
            agg.portfolio_profit_factor != null && agg.portfolio_profit_factor >= 1.5
              ? "emerald"
              : agg.portfolio_profit_factor != null && agg.portfolio_profit_factor >= 1.0
                ? "amber"
                : "red"
          }
        />
        <Cell
          label="Sharpe"
          value={agg.portfolio_sharpe_annualized.toFixed(2)}
          tone={agg.portfolio_sharpe_annualized >= 1.0 ? "emerald" : "red"}
        />
        <Cell label="Max DD" value={`${agg.portfolio_max_dd_pct.toFixed(2)}%`} tone="red" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
        <Cell label="Trades" value={String(agg.n_trades_total)} />
        <Cell
          label="R / day"
          value={`${agg.portfolio_r_per_day >= 0 ? "+" : ""}${agg.portfolio_r_per_day.toFixed(3)}`}
        />
      </div>
    </section>
  );
}

function PendingSection({ label, note }: { label: string; note: string }) {
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-4 rounded-md border border-dashed border-[var(--color-border)]/60 bg-[var(--color-surface)]/20 px-5 py-8 text-center text-xs text-[var(--color-muted)]/70 backdrop-blur-md">
        Pending · {note}
      </div>
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

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red" | "amber";
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "red"
        ? "text-red-400"
        : tone === "amber"
          ? "text-amber-400"
          : "text-white/95";
  return (
    <div className="bg-[var(--color-bg)] px-4 py-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl font-medium tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}
