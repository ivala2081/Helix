# V6 Gate 3 verdict — FAIL

**Date:** 2026-05-25
**Phase:** 3 (V6 validation) → complete
**Decision:** V6 fails Gate 3. Recommendation: **SHELVE V6 as currently designed; consider a narrow V6.1 iteration.**

V5 live stays untouched. No cron changes. This document is the artifact required by `docs/v6-plan.md` §3 Gate 3.

---

## Headline

V6 underperforms the V5 honest baseline on every Gate 3 criterion except max drawdown. On the same 3-symbol/2024-2026 constrained dev set, V5 made +102.11% with PF 1.82 / Sharpe 2.54; V6 full made +7.96% with PF 1.24 / Sharpe 0.51. V6 also lost 78% of its trades (379 → 80), failed walk-forward (3/6 vs V5's 4/6), and lost −28.21R in the stress window that V5 won at +44R. The OOS held-back window (2026-Q1) looks great in isolation but the sample is too small (n=10) to overturn the in-sample picture.

The frozen acceptance gate from `docs/v6-plan.md` requires V6 to beat V5 by +20% PF and +0.2 Sharpe. V6 does the opposite: −32% PF, −2.03 Sharpe. This is not a margin call. It is a directional failure.

---

## Gate 3 acceptance criteria — checklist

| Criterion | Threshold | V6 full result | Verdict |
|---|---|---|---|
| Concurrent BT profit factor | ≥ 1.5 | 1.24 | **FAIL** |
| Concurrent BT Sharpe (annualized) | ≥ 1.4 | 0.51 | **FAIL** |
| Concurrent BT max drawdown | ≤ 15% | 9.24% | PASS |
| WF 6-fold positive R/day | ≥ 5/6 | 3/6 | **FAIL** |
| OOS 2026-Q1 R/day | within ±1σ of in-sample | +0.397 vs in-sample +0.029 (huge) but n=10 | inconclusive |
| Stress low-vol Apr–Aug 2024 | breakeven+ | −28.21R | **FAIL** |
| Beats V5 honest baseline | +20% PF AND +0.2 Sharpe | −32% PF AND −2.03 Sharpe | **CATASTROPHIC FAIL** |

**5 fails, 1 pass, 1 inconclusive.** Gate 3 is not close.

---

## Ablation matrix — what is V6 doing wrong

3-symbol concurrent BT, 2024-01-01 → 2025-12-31, V5_fair baseline rerun on the SAME set:

| Config | Trades | Return | PF | Sharpe | DD | R/day |
|---|---|---|---|---|---|---|
| V5_fair (baseline) | **379** | **+102.11%** | **1.82** | **2.54** | 10.14% | **+0.425** |
| 3a V6 full (all 6 changes) | 80 | +7.96% | 1.24 | 0.51 | 9.24% | +0.029 |
| 3b V6 – regime filter | 109 | +18.23% | 1.47 | 0.97 | 10.77% | +0.079 |
| 3c V6 – MTF agreement | **260** | **+46.99%** | 1.39 | **1.35** | 13.18% | **+0.215** |
| 3d V6 – trail TP (V5 TP mix back) | 81 | +0.91% | 1.03 | 0.10 | 9.89% | −0.006 |
| 3e V6 – adaptive sizing | 80 | +8.08% | 1.24 | 0.51 | 9.55% | +0.029 |
| 3f V6 – strict realism | 79 | +11.95% | 1.38 | 0.72 | 8.16% | +0.078 |

### What the ablations tell us

1. **MTF agreement is the dominant trade-killer.** Removing it (3c) restores 180 trades (80 → 260) and lifts Sharpe from 0.51 to 1.35 and return from +8% to +47%. The 30M trend bias filter is too restrictive on a 1H entry signal — it spends most of the time in NEUTRAL and blocks roughly 70% of V5's edge.

2. **Regime filter is moderately too tight.** Removing it (3b) adds 29 trades (+36%) and recovers some PF and Sharpe, but still leaves V6 well below V5. Worth tuning, not the headline problem.

3. **Trailing TP is neutral-to-negative.** 3d (V5 TP mix swapped back in) drops to +0.91%, worse than 3a's +7.96%. So trailing-after-TP1 is actually helping the V6 trade pool that survives — it's not the bug. Don't remove it.

4. **Adaptive sizing is a no-op.** 3e ≈ 3a within noise. With only 80 trades over 2 years, the trailing-Sharpe window of 20 trades never gets exercise. Removable for simplicity in V6.1.

5. **Strict realism is a marginal drag.** 3f without realism patches recovers ~4% return. Real but small. Realism stays.

6. **Even the best ablation (3c, no MTF) cannot beat V5_fair.** +47% vs +102%, PF 1.39 vs 1.82, Sharpe 1.35 vs 2.54. So MTF isn't the only problem — the regime filter is also taking real edge. The combined filter stack is the issue, not any single component.

---

## Walk-forward — 6 folds (V6 full)

| Fold | Train R/day | Test R/day | Test positive? |
|---|---|---|---|
| 1 | +0.072 | **−0.452** | NO |
| 2 | −0.013 | **−0.235** | NO |
| 3 | +0.388 | +0.126 | YES |
| 4 | −0.081 | +0.068 | YES |
| 5 | +0.280 | +0.083 | YES |
| 6 | +0.193 | **−0.155** | NO |

**3/6 positive.** V5 was 4/6 on the original (2023-1H+5sym) set. V6 is worse out-of-sample. Folds 1, 2, 6 are clear losers; fold 3 looks like a regime tailwind that V6 happens to align with.

---

## Stress tests — V6 full

| Window | Trades | WR | R/day | R total |
|---|---|---|---|---|
| low_vol_apr_aug_2024 | 15 | 40.0% | **−0.186** | **−28.21** |
| bull_dec_2024 | 5 | 80.0% | +0.228 | +6.84 |
| chop_jan_feb_2025 | 8 | 50.0% | −0.097 | −4.27 |
| summer_drift_2025 | 18 | 61.1% | +0.141 | +12.88 |

The low-volatility window was the explicit V6 design target ("regime filter should keep us out / minimize damage"). V6 instead **lost −28R** there. V5 had **+44R** in the same window (Phase 1 stress). This is the most damning single number in this validation: the change V6 was specifically engineered to fix is the change it made WORSE.

Why this happened (most likely): the percentile-based regime filter compares current 24-day RV against a trailing 365-day distribution. In a structurally lower-vol 2024 vs the 2023 reference, "low" relative to the rolling history is still high enough to permit entries, then the trailing-TP gives back gains as momentum dies. The filter doesn't actually block; it just delays.

---

## OOS holdout 2026-Q1 — n=10

| Metric | V6 full on OOS |
|---|---|
| Trades | **10** |
| Return | +11.42% |
| PF | 38.76 |
| Sharpe | 3.20 |
| Max DD | 0.30% |
| R/day | +0.397 |

In isolation: spectacular. In context: meaningless. n=10 over 102 days is well below the Minimum Track Record Length required to assert any PF claim (Bailey & López de Prado). 10 trades is also too few to expect the filter stack to demonstrate either edge or failure. The most this tells us is "V6 did not blow up out-of-sample over 3.5 months." It does not redeem the in-sample numbers.

If V6 were a candidate to launch, this OOS result would be a green flag. It is not, because V6 fails 4 of the 6 measurable Gate 3 criteria before OOS even enters the conversation.

---

## Why V6 failed — diagnosis

1. **The filter stack over-fires.** Regime filter + MTF agreement together produce 80 trades where V5 produced 379. That's not selectivity, that's starvation.
2. **MTF agreement is the wrong tool at this timeframe.** A 30M trend bias on a 1H signal forces alignment at a TF where chop dominates. Most of the time 30M is NEUTRAL; NEUTRAL blocks. The asymmetry kills trade count without improving win rate (V6 WR 57% vs V5 WR ~63%).
3. **Regime filter measures the wrong thing.** Trailing-365-day percentile of RV is a *relative* measure. In a structurally lower-vol period, the 30th percentile is still "low vol" in absolute terms. The strategy needs an absolute floor, not a relative one — or to not block at all and instead size down in low vol.
4. **Stricter realism + tighter hard stop compound the filter effect.** When you trade less and each trade gets clipped harder, you don't get the variance reduction you wanted; you just get smaller expected value.

---

## Recommendation

**Primary: SHELVE V6 as currently designed.** V5 stays live, V5 continues to be the production engine. The Phase 0 infrastructure (concurrent BT, walk-forward, stress, OOS holdout) is permanent value regardless.

**Secondary option: V6.1 narrow iteration.** If owner wants to try once more, the smallest sensible change is:

1. **Drop MTF agreement entirely** (3c result suggests this is most of the gain).
2. **Replace percentile-based regime filter with absolute-RV floor** (e.g., skip entries when RV24 < X annualized, calibrated against 2023-2024 actuals).
3. **Keep trailing-after-TP1** (3d shows it's net positive when the rest of V6 is on).
4. **Drop adaptive sizing** (no-op on this trade count).
5. **Keep strict realism** (small drag, real defense).

This is a 1–2 day code change. After V6.1, re-run the same Phase 3 battery. Same gates. No threshold relaxation.

**Tertiary option: STOP.** V5 is live with a 14+ day silent-run track record and known parity behavior. The launch is gated by `docs/launch-gates.md`, not by "we shipped V6." Accepting that V6 R&D produced infrastructure value but no usable strategy is a legitimate outcome (success state C in `docs/v6-plan.md` §7).

---

## What does NOT happen now

- Cron is not touched. V5 live continues.
- TS engine port is not started. Phase 5 prerequisites are not met.
- V6 code is not deleted. Phase 0–2 deliverables remain in repo for V6.1 if owner chooses.
- Live data is not used. The dev/live boundary stays intact.

---

## Owner decision required

Please indicate:

- **(A) Shelve V6, V5 continues** — close Phase 3–5, archive V6 status as "shelved 2026-05-25". This is the recommended path.
- **(B) V6.1 iteration** — drop MTF, swap regime filter for absolute floor, drop adaptive sizing, re-run Phase 3. Estimated 1–2 days work + same validation run.
- **(C) Accept marginal V6 anyway** — only if you have a reason I don't see. Note this requires explicit relaxation of Gate 3 thresholds, which the frozen plan does not permit without a new dated charter.

Default if no decision in 7 days: (A) shelve.
