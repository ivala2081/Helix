import { describe, it, expect } from "vitest";
import { cappedRiskPct, LAUNCH_MAX_RISK_PCT } from "../account-risk";

describe("cappedRiskPct — conservative launch ceiling", () => {
  it("caps values above the ceiling", () => {
    expect(cappedRiskPct(5)).toBe(LAUNCH_MAX_RISK_PCT);
    expect(cappedRiskPct(3)).toBe(LAUNCH_MAX_RISK_PCT);
  });
  it("leaves values at/below the ceiling untouched", () => {
    expect(cappedRiskPct(0.5)).toBe(0.5);
    expect(cappedRiskPct(LAUNCH_MAX_RISK_PCT)).toBe(LAUNCH_MAX_RISK_PCT);
  });
  it("ceiling is a sane conservative percent", () => {
    expect(LAUNCH_MAX_RISK_PCT).toBeGreaterThan(0);
    expect(LAUNCH_MAX_RISK_PCT).toBeLessThanOrEqual(2);
  });
});

// The per-customer circuit breaker now reuses evaluateKillSwitch over the
// customer's own user_trades (see customers.ts checkCustomerKillSwitch). Its
// logic is covered by src/lib/engine/__tests__/kill-switch.test.ts; the mapping
// (pnl_pct → rMultiple, stateless eval) is a thin DB adapter exercised in the
// testnet integration path.
