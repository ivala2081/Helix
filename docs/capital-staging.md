# Helix Capital Staging Plan

**Status:** ACTIVE
**Written:** 2026-05-08
**Reference commit:** `bd4ea52`
**Related document:** [`launch-gates.md`](./launch-gates.md)

---

## Purpose

Defines the capital deployment path **after** the launch gates pass. Paper money does not test capital risk-of-ruin or operational discipline at scale. Real money is deployed in tranches with KPI-driven progression.

This document is read at every tranche boundary. KPI evaluation is mechanical — meet the threshold, advance; miss it, downgrade.

---

## Tranches

| ID | Stage    | Capital      | Duration | Promotion KPI (must hold across the duration window)                                  |
|----|----------|--------------|----------|---------------------------------------------------------------------------------------|
| T0 | Paper    | $0           | Open     | Launch gates G1–G5 in `launch-gates.md` all PASS                                     |
| T1 | Seed     | $1,000       | 4 weeks  | Live DSR ≥ 0.4 trailing 30-day **AND** kill-switch never triggered                   |
| T2 | Validate | $5,000       | 4 weeks  | T1 KPI hold **AND** 30-day max DD ≤ 10%                                              |
| T3 | Scale    | $25,000      | 8 weeks  | T2 KPI hold **AND** annualized Sharpe ≥ 1.5                                          |
| T4 | Full     | unrestricted | —        | T3 KPI hold **AND** ≥ 100 cumulative live trades                                     |

---

## Downgrade rule

If at any tranche evaluation point the KPI fails:

1. Downgrade to the **previous tranche** immediately.
2. Hold there for a full 4-week reset period before re-attempting promotion.
3. Three consecutive downgrades from the same tranche → mandatory strategy review (kill-or-rebuild decision).

---

## KPI definitions

- **DSR (trailing 30-day):** Run `live_quant.py` over only the last 30 days of `live_trades`. Use the aggregate Deflated Sharpe value.
- **Max DD (30-day):** R-based synthetic equity curve drawdown across the last 30 days; same methodology as launch-gates.md G3.
- **Annualized Sharpe:** Per-trade Sharpe × √(trades_per_year). Computed by `live_quant.py` aggregate `sharpe_annualized_trade`.
- **Kill-switch trigger:** Any K1–K4 trip recorded in `live_portfolios.kill_switch_state`.

---

## Evaluation cadence

- **T1, T2:** Weekly check, formal promotion check at week 4.
- **T3:** Bi-weekly check, formal promotion check at week 8.
- **T4:** Monthly review.

Every evaluation produces a one-line entry in `docs/capital-staging-log.md` (created at first T1 promotion). Format: `YYYY-MM-DD | tranche | KPI snapshot | decision`.

---

## Operational notes

- Each tranche promotion / downgrade requires an explicit code or config change to the live engine — never a silent drift.
- Capital additions are deposited at the start of the tranche; not staggered within the window.
- The strategy parameters (V5_DEFAULTS post-realism-patch) are frozen across all tranches. Tranche progression is a **capital decision**, not a strategy decision.
- A tranche may be skipped upward only with explicit written justification referencing why the lower tranche's KPI evaluation is not informative for the next.

---

## Forbidden actions during staging

1. No mid-tranche sizing changes outside the planned tranche capital.
2. No "I'll just add $5k informally to test" — capital additions go through tranches.
3. No changes to KPI thresholds without writing a new dated capital-staging document.
4. No skipping the downgrade rule. Three downgrades from the same tranche means the strategy is dead at that scale; rebuild.
