"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroScene } from "@/components/ui/HeroScene";
import { LiveV62EquityChart } from "@/components/live/LiveV62EquityChart";

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

interface V62LivePortfolio {
  symbol: string;
  status: string;
  initial_capital: number;
  equity: number;
  realized_pnl: number;
  open_trade: unknown | null;
  bar_index: number;
  warmup_complete: boolean;
  started_at: string;
  updated_at: string;
}

interface V62LiveTrade {
  id: number;
  symbol: string;
  trade_id: number;
  direction: string;
  entry_ts: number;
  entry_price: number;
  exit_ts: number;
  exit_price: number;
  size: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
  r_multiple: number | null;
}

interface V62LiveResponse {
  initialized: boolean;
  reason?: string;
  portfolios?: V62LivePortfolio[];
  recentTrades?: V62LiveTrade[];
  totalTradeCount?: number;
  updatedAt?: string;
}

interface V5LiveResponse {
  portfolios: Array<{
    symbol: string;
    initial_capital: number;
    equity: number;
    realized_pnl: number;
  }>;
  recentTrades: Array<{
    symbol: string;
    pnl: number;
    r_multiple: number | null;
  }>;
  totalTradeCount: number;
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
  const [v62Live, setV62Live] = useState<V62LiveResponse | null>(null);
  const [v5Live, setV5Live] = useState<V5LiveResponse | null>(null);

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
      fetch("/api/live-v6-2").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/live").then((r) => (r.ok ? r.json() : null)),
    ]).then(([s, b, wf, st, v6s, v6ab, v6wf, v6st, v6oos, v62live, v5live]) => {
      setStatus(s);
      setV5Baseline(b);
      setV5WF(wf);
      setV5Stress(st);
      setV6Strategy(v6s);
      setV6Ablations(v6ab);
      setV6WF(v6wf);
      setV6Stress(v6st);
      setV6OOS(v6oos);
      setV62Live(v62live);
      setV5Live(v5live);
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

        {/* Phase 5 — V6.2 live paper-test */}
        {v62Live ? (
          <V62LiveSection data={v62Live} v5Live={v5Live} />
        ) : (
          <PendingSection
            label="Phase 5 · V6.2 live paper-test"
            note="awaiting /api/live-v6-2 response (Supabase migration + cron + warmup pending)"
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

function V62LiveSection({
  data,
  v5Live,
}: {
  data: V62LiveResponse;
  v5Live: V5LiveResponse | null;
}) {
  if (!data.initialized) {
    return (
      <section>
        <SectionLabel>Phase 5 · V6.2 live paper-test</SectionLabel>
        <div className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          Not initialized · {data.reason ?? "V6.2 tables not migrated yet"} ·
          run the SQL migration and <code>npx tsx scripts/warmup_v6_2.ts</code> to start.
        </div>
      </section>
    );
  }

  const portfolios = data.portfolios ?? [];
  const trades = data.recentTrades ?? [];
  const n = data.totalTradeCount ?? 0;
  const totalInitial = portfolios.reduce((s, p) => s + Number(p.initial_capital ?? 0), 0);
  const totalEquity = portfolios.reduce((s, p) => s + Number(p.equity ?? 0), 0);
  const totalPnl = portfolios.reduce((s, p) => s + Number(p.realized_pnl ?? 0), 0);
  const aggReturnPct = totalInitial > 0 ? (totalEquity - totalInitial) / totalInitial * 100 : 0;
  const wins = trades.filter((t) => Number(t.pnl) > 0).length;
  const losses = trades.filter((t) => Number(t.pnl) <= 0).length;
  const wr = (wins + losses) > 0 ? wins / (wins + losses) : 0;
  const sumWin = trades.filter((t) => Number(t.pnl) > 0).reduce((s, t) => s + Number(t.pnl), 0);
  const sumLoss = -trades.filter((t) => Number(t.pnl) <= 0).reduce((s, t) => s + Number(t.pnl), 0);
  const pf = sumLoss > 0 ? sumWin / sumLoss : null;

  // V5 vs V6.2 head-to-head numbers (live)
  const v5Portfolios = v5Live?.portfolios ?? [];
  const v5TotalInitial = v5Portfolios.reduce((s, p) => s + Number(p.initial_capital ?? 0), 0);
  const v5TotalEquity = v5Portfolios.reduce((s, p) => s + Number(p.equity ?? 0), 0);
  const v5TotalPnl = v5Portfolios.reduce((s, p) => s + Number(p.realized_pnl ?? 0), 0);
  const v5ReturnPct = v5TotalInitial > 0 ? (v5TotalEquity - v5TotalInitial) / v5TotalInitial * 100 : 0;
  const v5N = v5Live?.totalTradeCount ?? 0;
  const v5Trades = v5Live?.recentTrades ?? [];
  const v5SumWin = v5Trades.filter((t) => Number(t.pnl) > 0).reduce((s, t) => s + Number(t.pnl), 0);
  const v5SumLoss = -v5Trades.filter((t) => Number(t.pnl) <= 0).reduce((s, t) => s + Number(t.pnl), 0);
  const v5Pf = v5SumLoss > 0 ? v5SumWin / v5SumLoss : null;

  return (
    <section>
      <SectionLabel>Phase 5 · V6.2 live paper-test · Supabase</SectionLabel>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Real-time V6.2 portfolios running alongside V5 in the cron. Paper-test only, no capital. {n} trades closed so far.
      </p>

      {/* V5 vs V6.2 head-to-head (live numbers) */}
      {v5Live && (
        <div className="mt-4 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Live head-to-head</th>
                <th className="px-3 py-2 text-right">V5</th>
                <th className="px-3 py-2 text-right">V6.2</th>
                <th className="px-3 py-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <CompareRow
                label="Aggregate return"
                v5={`${v5ReturnPct >= 0 ? "+" : ""}${v5ReturnPct.toFixed(2)}%`}
                v6={`${aggReturnPct >= 0 ? "+" : ""}${aggReturnPct.toFixed(2)}%`}
                delta={aggReturnPct - v5ReturnPct}
                deltaSuffix="pp"
              />
              <CompareRow
                label="Realized PnL"
                v5={`${v5TotalPnl >= 0 ? "+" : ""}$${v5TotalPnl.toFixed(0)}`}
                v6={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(0)}`}
                delta={totalPnl - v5TotalPnl}
                deltaSuffix="$"
              />
              <CompareRow
                label="Trades closed"
                v5={String(v5N)}
                v6={String(n)}
                delta={n - v5N}
                deltaSuffix=""
              />
              <CompareRow
                label="Recent PF (last 50)"
                v5={v5Pf == null ? "—" : v5Pf.toFixed(2)}
                v6={pf == null ? "—" : pf.toFixed(2)}
                delta={pf != null && v5Pf != null ? pf - v5Pf : null}
                deltaSuffix=""
              />
            </tbody>
          </table>
          <div className="border-t border-[var(--color-border)]/40 bg-[var(--color-bg)]/20 px-3 py-2 text-[10px] text-[var(--color-muted)]/70">
            Both engines run on the same candles in the same cron tick. V6.2 = V5 + trail-after-TP1 + strict realism.
            Backtest claim: V6.2 OOS PF 2.03 / Sharpe 2.56. Live numbers update each cron tick.
          </div>
        </div>
      )}

      <SectionLabel>V6.2 aggregate</SectionLabel>
      <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Cell
          label="Aggregate return"
          value={`${aggReturnPct >= 0 ? "+" : ""}${aggReturnPct.toFixed(2)}%`}
          tone={aggReturnPct >= 0 ? "emerald" : "red"}
        />
        <Cell
          label="Realized PnL"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(0)}`}
          tone={totalPnl >= 0 ? "emerald" : "red"}
        />
        <Cell label="Trades closed" value={String(n)} />
        <Cell
          label="Recent PF (last 50)"
          value={pf == null ? "—" : pf.toFixed(2)}
          tone={pf != null && pf >= 1.5 ? "emerald" : pf != null && pf >= 1 ? "amber" : "red"}
        />
      </div>

      {/* V6.2 equity curve */}
      <LiveV62EquityChart title="V6.2 per-symbol equity (1h)" />

      {/* V6.2 per-symbol portfolios */}
      <SectionLabel>V6.2 portfolios</SectionLabel>
      <div className="mt-2 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-right">Equity</th>
              <th className="px-3 py-2 text-right">Realized PnL</th>
              <th className="px-3 py-2 text-right">Return%</th>
              <th className="px-3 py-2 text-right">Bar #</th>
              <th className="px-3 py-2 text-right">Open?</th>
              <th className="px-3 py-2 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {portfolios.map((p) => {
              const tint = COIN_TINT[p.symbol] ?? "text-[var(--color-muted)]";
              const ret = p.initial_capital > 0 ? (p.equity - p.initial_capital) / p.initial_capital * 100 : 0;
              return (
                <tr key={p.symbol} className="border-t border-[var(--color-border)]/50">
                  <td className={`px-3 py-2 font-semibold ${tint}`}>
                    {p.symbol.replace("USDT", "")}
                  </td>
                  <td className="px-3 py-2 text-right">${Number(p.equity).toFixed(0)}</td>
                  <td className={`px-3 py-2 text-right ${Number(p.realized_pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {Number(p.realized_pnl) >= 0 ? "+" : ""}${Number(p.realized_pnl).toFixed(0)}
                  </td>
                  <td className={`px-3 py-2 text-right ${ret >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-muted)]">{p.bar_index}</td>
                  <td className="px-3 py-2 text-right text-[10px] uppercase">
                    {p.open_trade ? <span className="text-amber-400">yes</span> : <span className="text-[var(--color-muted)]/60">no</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] text-[var(--color-muted)]/60">
                    {new Date(p.updated_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* V6.2 recent trades */}
      {trades.length > 0 && (
        <>
          <SectionLabel>V6.2 recent trades · last {trades.length}</SectionLabel>
          <div className="mt-2 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left">Symbol</th>
                  <th className="px-3 py-2 text-left">Dir</th>
                  <th className="px-3 py-2 text-right">Entry</th>
                  <th className="px-3 py-2 text-right">Exit</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                  <th className="px-3 py-2 text-right">PnL</th>
                  <th className="px-3 py-2 text-right">R</th>
                  <th className="px-3 py-2 text-right">Closed</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {trades.slice(0, 20).map((t) => {
                  const tint = COIN_TINT[t.symbol] ?? "text-[var(--color-muted)]";
                  return (
                    <tr key={t.id} className="border-t border-[var(--color-border)]/50">
                      <td className={`px-3 py-2 font-semibold ${tint}`}>
                        {t.symbol.replace("USDT", "")}
                      </td>
                      <td className={`px-3 py-2 text-[10px] uppercase ${t.direction === "LONG" ? "text-emerald-400" : "text-red-400"}`}>
                        {t.direction}
                      </td>
                      <td className="px-3 py-2 text-right">${Number(t.entry_price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${Number(t.exit_price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-[10px] text-[var(--color-muted)]">
                        {t.exit_reason}
                      </td>
                      <td className={`px-3 py-2 text-right ${Number(t.pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {Number(t.pnl) >= 0 ? "+" : ""}${Number(t.pnl).toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-right ${t.r_multiple != null && Number(t.r_multiple) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {t.r_multiple != null ? (Number(t.r_multiple) >= 0 ? "+" : "") + Number(t.r_multiple).toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-[10px] text-[var(--color-muted)]/60">
                        {new Date(Number(t.exit_ts)).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[10px] text-[var(--color-muted)]/60">
            Summary across last {trades.length}: WR {(wr * 100).toFixed(1)}% ({wins}W / {losses}L), PF {pf == null ? "—" : pf.toFixed(2)}
          </div>
        </>
      )}

      {trades.length === 0 && (
        <div className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/30 px-4 py-3 text-xs text-[var(--color-muted)]">
          No V6.2 trades closed yet. Trade table populates after the first V6.2 trade exits via TP1, Trailing Stop, Stop Loss, or Hard Stop.
        </div>
      )}
    </section>
  );
}

function CompareRow({
  label,
  v5,
  v6,
  delta,
  deltaSuffix,
}: {
  label: string;
  v5: string;
  v6: string;
  delta: number | null;
  deltaSuffix: string;
}) {
  let deltaCls = "text-[var(--color-muted)]";
  let deltaStr = "—";
  if (delta != null) {
    deltaCls = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-[var(--color-muted)]";
    const formatted =
      Math.abs(delta) >= 100
        ? delta.toFixed(0)
        : Math.abs(delta) >= 10
        ? delta.toFixed(1)
        : delta.toFixed(2);
    deltaStr = `${delta > 0 ? "+" : ""}${formatted}${deltaSuffix ? " " + deltaSuffix : ""}`;
  }
  return (
    <tr className="border-t border-[var(--color-border)]/50">
      <td className="px-3 py-2 text-xs text-white/90">{label}</td>
      <td className="px-3 py-2 text-right text-[var(--color-muted)]">{v5}</td>
      <td className="px-3 py-2 text-right text-white/95">{v6}</td>
      <td className={`px-3 py-2 text-right ${deltaCls}`}>{deltaStr}</td>
    </tr>
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
