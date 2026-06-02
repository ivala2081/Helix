// Conservative launch sizing cap for the live executor.
//
// (An earlier equity-based per-customer max-DD breaker was REMOVED after review:
// equity on a non-custodial account is contaminated by customer deposits/
// withdrawals and a glitchy equity read could falsely trip a sticky halt. The
// per-customer circuit breaker is now a stateless kill-switch computed from the
// customer's OWN closed user_trades — see customers.ts checkCustomerKillSwitch —
// which is capital-flow-immune and needs no persisted halt state.)

// Regardless of a customer's bot_settings.risk_pct, the executor caps per-trade
// risk here until the live track record earns more — the customer-side analog of
// the capital-staging tranches (docs/capital-staging.md). Percent units.
export const LAUNCH_MAX_RISK_PCT = 1.0;

/** Clamp a customer's configured risk% to the conservative launch ceiling. */
export function cappedRiskPct(configuredPct: number): number {
  return Math.min(configuredPct, LAUNCH_MAX_RISK_PCT);
}
