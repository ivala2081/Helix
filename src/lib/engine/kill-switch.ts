// Kill-switch — pre-flight checks that pause a live portfolio when risk
// thresholds are exceeded. Pure, side-effect-free; the cron worker is
// responsible for persisting decisions to live_portfolios.
//
// Rules (all evaluated each tick; first trigger wins):
//   K1  rolling 30-day R-based drawdown > 15%        — auto-resume when DD < 10%
//   K2  10 consecutive losing trades                  — manual resume only
//   K3  24h cumulative loss > 4% of starting equity   — auto-resume after 24h
//   K4  parity test failed in last 7 days             — manual resume only
//
// See docs/launch-gates.md for the broader discipline framework.

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

export type KillSwitchRule =
  | "K1_rolling_dd"
  | "K2_consecutive_sl"
  | "K3_daily_loss"
  | "K4_parity_fail";

export interface KillSwitchState {
  triggered: boolean;
  rule?: KillSwitchRule;
  triggeredAt?: number;
  resumeAt?: number | null;
  details?: {
    metricValue: number;
    threshold: number;
  };
}

export interface KillSwitchResult {
  paused: boolean;
  state: KillSwitchState;
  resumeNow: boolean; // true if a previously-paused portfolio should auto-resume
}

export interface MinimalTrade {
  exitTs: number;
  pnl: number;
  rMultiple: number | null;
}

export interface KillSwitchInputs {
  now: number;
  initialCapital: number;
  recentTrades: MinimalTrade[]; // chronological, oldest first
  parityLastPassedAt?: number | null;
  currentState?: KillSwitchState | null;
}

export const K1_DD_TRIGGER = 0.15;
export const K1_DD_RESUME = 0.10;
export const K2_CONSECUTIVE_SL = 10;
export const K3_DAILY_LOSS_PCT = 0.04;
export const K3_PAUSE_MS = DAY_MS;
export const K1_PAUSE_MS = 7 * DAY_MS;

export function evaluateKillSwitch(input: KillSwitchInputs): KillSwitchResult {
  const { now, recentTrades, currentState } = input;

  // If currently paused, decide whether to auto-resume.
  if (currentState?.triggered) {
    const resumeNow = shouldAutoResume(input);
    if (resumeNow) {
      return {
        paused: false,
        resumeNow: true,
        state: { triggered: false },
      };
    }
    // Stay paused; no re-evaluation while still in cooldown.
    return { paused: true, resumeNow: false, state: currentState };
  }

  // Not currently paused — evaluate fresh.
  const trade30d = recentTrades.filter((t) => t.exitTs >= now - MONTH_MS);
  const trade24h = recentTrades.filter((t) => t.exitTs >= now - DAY_MS);

  // K1 — rolling 30-day R-based drawdown
  const dd = computeRollingDrawdown(trade30d);
  if (dd > K1_DD_TRIGGER) {
    return mkPause("K1_rolling_dd", now, K1_PAUSE_MS, dd, K1_DD_TRIGGER);
  }

  // K2 — consecutive stop-losses
  const consec = countConsecutiveLosses(recentTrades);
  if (consec >= K2_CONSECUTIVE_SL) {
    return mkPause("K2_consecutive_sl", now, null, consec, K2_CONSECUTIVE_SL);
  }

  // K3 — 24h cumulative loss as fraction of initial equity
  const sum24h = trade24h.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const lossFrac = -sum24h / Math.max(input.initialCapital, 1);
  if (lossFrac > K3_DAILY_LOSS_PCT) {
    return mkPause("K3_daily_loss", now, K3_PAUSE_MS, lossFrac, K3_DAILY_LOSS_PCT);
  }

  // K4 — parity must have passed within last 7 days
  if (input.parityLastPassedAt != null) {
    const age = now - input.parityLastPassedAt;
    if (age > WEEK_MS) {
      return mkPause("K4_parity_fail", now, null, age, WEEK_MS);
    }
  }

  return { paused: false, resumeNow: false, state: { triggered: false } };
}

// ── helpers ──────────────────────────────────────────────────────────

function mkPause(
  rule: KillSwitchRule,
  now: number,
  pauseMs: number | null,
  metricValue: number,
  threshold: number,
): KillSwitchResult {
  return {
    paused: true,
    resumeNow: false,
    state: {
      triggered: true,
      rule,
      triggeredAt: now,
      resumeAt: pauseMs == null ? null : now + pauseMs,
      details: { metricValue, threshold },
    },
  };
}

function shouldAutoResume(input: KillSwitchInputs): boolean {
  const s = input.currentState;
  if (!s?.triggered) return true;

  // Manual-only rules never auto-resume.
  if (s.rule === "K2_consecutive_sl" || s.rule === "K4_parity_fail") {
    return false;
  }

  // Time-based resume window must have passed.
  if (s.resumeAt != null && input.now < s.resumeAt) return false;

  // For K1, also require DD to recover below the resume threshold.
  if (s.rule === "K1_rolling_dd") {
    const dd = computeRollingDrawdown(
      input.recentTrades.filter((t) => t.exitTs >= input.now - MONTH_MS),
    );
    return dd < K1_DD_RESUME;
  }

  // K3 just needs the cooldown window to elapse.
  return true;
}

// R-based drawdown across a chronological trade list. Equity curve is
// synthetic: starts at 1.0, each trade contributes its R-multiple / 100
// (capped to 0 if r_multiple is null). The peak-to-trough drop is the DD.
export function computeRollingDrawdown(trades: MinimalTrade[]): number {
  if (trades.length === 0) return 0;
  const sorted = [...trades].sort((a, b) => a.exitTs - b.exitTs);
  let equity = 1.0;
  let peak = 1.0;
  let maxDd = 0;
  for (const t of sorted) {
    const r = t.rMultiple ?? 0;
    equity += r / 100;
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function countConsecutiveLosses(trades: MinimalTrade[]): number {
  if (trades.length === 0) return 0;
  const sorted = [...trades].sort((a, b) => b.exitTs - a.exitTs); // newest first
  let n = 0;
  for (const t of sorted) {
    if ((t.pnl ?? 0) <= 0) n++;
    else break;
  }
  return n;
}
