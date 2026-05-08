# Helix Launch Gates

**Status:** FROZEN
**Written:** 2026-05-08
**Reference commit:** `bd4ea52`
**Target launch:** 2026-06-15
**Author:** ivala

---

## Purpose

This document defines the **numerical, mechanical** criteria that must be satisfied before the Helix forward-test goes public. It is written **before** the gates are evaluated to remove subjectivity from the launch decision.

Goalpost shifting is forbidden. If a gate is changed after this document is committed, a new gates document with a new commit hash and explicit justification must be produced — the old document remains the historical record.

---

## Gates

All five gates use AND logic. A gate either passes or fails — there is no partial credit.

| ID  | Gate                              | Threshold                                                | Source                                                                  |
|-----|-----------------------------------|----------------------------------------------------------|-------------------------------------------------------------------------|
| G1  | Live trade count                  | n ≥ 35 (sum across all 5 symbols)                        | `live_trades` row count                                                 |
| G2  | Live Deflated Sharpe              | DSR ≥ 0.5                                                | `live_quant.py` aggregate output                                        |
| G3  | 30-day max drawdown (R-based)     | DD ≤ 12% on synthetic R-based equity curve               | `live_trades.r_multiple` summed chronologically, equity = 1 + cum_R/100 |
| G4  | Engine parity                     | 4/4 PASS                                                 | `npx vitest run src/lib/engine/__tests__/paper-engine.parity.test.ts`   |
| G5  | Per-symbol health                 | For each symbol with n ≥ 5: WR ≥ 40%                     | `live_trades` grouped by symbol                                         |

### Why R-based DD in G3
During the launch evaluation window, `live_risk_pct` is reduced from 3% to 1.5% (Phase 1.1 of the launch plan). Mid-window sizing changes invalidate absolute USD drawdown comparisons. R-multiples are scale-invariant; the synthetic R-equity curve is the honest measure of trade-quality drawdown.

### Why DSR ≥ 0.5
The pre-launch backtest DSR was 1.00. Live DSR on n=18 (2026-05-08) was 0.04. A live DSR ≥ 0.5 represents convincing convergence toward the backtest claim while remaining achievable on n≈35. DSR ≥ 0.95 (matching backtest) would require n > 70 trades and is reserved for the post-launch promotion criteria in `capital-staging.md`.

### Why per-symbol G5
The 2026-05-08 live snapshot showed BTC (0/4 winners) and XRP (0/4 winners) as cluster outliers. G5 ensures no single symbol is silently sabotaging the aggregate; if a symbol has accumulated ≥ 5 trades and still cannot achieve 40% WR, that is a sign of regime mismatch for that symbol specifically and must be addressed before launch (either drop the symbol with explicit justification or delay).

---

## Decision matrix

| Gates passed | Action                                                                  |
|--------------|-------------------------------------------------------------------------|
| 5 / 5        | LAUNCH on 2026-06-15                                                    |
| 4 / 5        | DEFER 7 days, re-evaluate. Maximum two consecutive deferrals.            |
| ≤ 3 / 5      | KILL: do not launch. Trigger strategy review (do NOT re-optimize on live data). |

If after two 7-day deferrals (i.e., 2026-06-29) gates are still 4/5, treat as ≤ 3/5 outcome.

---

## Evaluation procedure

To be run on 2026-06-14 (and weekly during the silent run for visibility):

1. Run `python live_quant.py` — produces aggregate DSR, n, per-symbol breakdown.
2. Run `npx vitest run src/lib/engine/__tests__/paper-engine.parity.test.ts` — must show 4 passed.
3. Compute G3 R-based 30-day rolling DD from `live_trades` (script TBD in Phase 3.1).
4. Tabulate G1 — G5, AND them.
5. Apply the decision matrix.
6. If LAUNCH: execute capital-staging.md T1 (Seed) tranche.

---

## Forbidden actions during evaluation window (2026-05-08 → 2026-06-15)

The following are explicitly excluded from the launch path. Each is a known anti-pattern.

1. **No re-optimization of strategy parameters on live data.** WINNER_PARAMS is frozen. This is curve-fitting to noise.
2. **No symbol additions to dilute small-sample variance.** Adding symbols does not increase n_eff because of cross-asset correlation.
3. **No SL/TP/sizing tweaks "to fix" the current run.** The strategy mechanics are frozen except for `riskPct` (Phase 1.1) and the engine realism patches (Phase 2.1, applied once).
4. **No timeframe changes.** 1H stays 1H.
5. **No removal of inconvenient gates.** Gates are immutable from this commit forward.

The single permitted parameter change during the window is the engine realism patch in Phase 2 of the launch plan (TP wick-fill, slippage, spread, hard-stop). After that patch is applied and a new backtest baseline is recorded, the strategy is again frozen.

---

## Sign-off

By committing this document, the author acknowledges:

- The gates above are sufficient to distinguish a launchable strategy from a non-launchable one.
- The author will not modify gates between this commit and 2026-06-15 without producing a new dated gates document.
- A 4/5 or ≤3/5 outcome is an acceptable result of disciplined evaluation, not a failure of the evaluator.

Signed: ivala — 2026-05-08
