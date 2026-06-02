// Go-live safety gates for the executor. PURE (unit-testable). These decide
// whether the bot may OPEN new customer positions right now — managing/closing
// an existing position is never blocked (a customer must always be able to exit).
//
// Two independent gates, both must pass to allow a new entry:
//   1. Signal freshness — the V5 target must come from a recent cron tick. If the
//      forward-test cron stalled (a known incident), live_portfolios.open_trade
//      goes stale; opening on a frozen signal could be flat-out wrong, so we
//      freeze entries and surface it loudly until the cron recovers.
//   2. Kill-switch — the V5 strategy must not be in a paused (risk-tripped)
//      state for this symbol (drawdown / consecutive SL / daily loss / parity).

import type { KillSwitchResult } from "../engine/kill-switch";

/** Default: a signal older than 30 min is stale (cron ticks ~4×/hour). */
export const DEFAULT_MAX_SIGNAL_AGE_MS = 30 * 60_000;

export function isSignalFresh(
  updatedAtMs: number | null,
  now: number,
  maxAgeMs: number = DEFAULT_MAX_SIGNAL_AGE_MS,
): boolean {
  if (updatedAtMs == null || !Number.isFinite(updatedAtMs)) return false;
  return now - updatedAtMs <= maxAgeMs;
}

export type OpenGate = { allowOpen: boolean; reason: string };

/** Combine freshness + kill-switch into a single "may we open?" decision. */
export function buildOpenGate(fresh: boolean, ks: KillSwitchResult | null): OpenGate {
  if (!fresh) return { allowOpen: false, reason: "stale signal (cron may be stalled)" };
  if (ks?.paused) {
    return { allowOpen: false, reason: `kill-switch ${ks.state.rule ?? "paused"}` };
  }
  return { allowOpen: true, reason: "ok" };
}
