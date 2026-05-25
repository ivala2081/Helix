# Helix V6 — R&D Plan

**Status:** FROZEN (development charter)
**Written:** 2026-05-25
**Reference commit:** *to be filled at start of Phase 0*
**Estimated duration:** 14–21 working days
**Parallel constraint:** V5 live forward test continues uninterrupted

---

## 1. Why V6, and why now

### What live data has revealed (2026-04-14 → 2026-05-25, n=31)

| Finding | Source | Implication for V6 |
|---|---|---|
| Live PF = 0.98 vs V5-patched backtest PF = 1.71 | `live_trades` aggregate | Engine realism still optimistic; bias residue |
| BTC z = −2.70 vs same-regime backtest | per-symbol divergence test | Need per-symbol probation gates |
| TP1 hit 61% live (matches BT 65%) | path frequency analysis | Entry signal is sound |
| TP2 hit only 16% live (BT 28%) | path frequency analysis | TP2 is a transit point, not a destination |
| TP2 → TP3 conversion 100% live (5/5) | path frequency analysis | Trades that clear TP2 nearly always reach TP3 |
| 3/5 symbols in bottom 30% RV percentile | regime check | Strategy stalls in low-vol; no adaptation |
| 14 of 31 trades exit "TP1 then BE-stop" | path classification | Half of trades produce ~0R because momentum dies after TP1 |
| 2 hard-stop firings cost −16R combined | realism patch validation | Hard-stop cap is working but expensive |
| BNB / XRP never pre-validated in backtest | process audit | New symbols entered live blind |

### V5 limitations as a product

1. **No regime awareness.** The same params fire in 80%-volatility crypto bull and 20%-volatility chop.
2. **Wasteful TP structure.** TP2 absorbs 30% of position size for the rare 16% of trades that reach it.
3. **Static sizing.** 3% risk regardless of recent edge state.
4. **Single-timeframe.** 1H signal alone with no higher-timeframe direction filter.
5. **Per-symbol blindness.** A broken symbol (BTC) drags portfolio without any auto-detection.
6. **Backtest ≠ live distribution.** Multi-symbol concurrent execution effects not modeled in BT.

### What V6 must achieve

| Goal | Metric | Acceptance threshold |
|---|---|---|
| Edge persistence | Walk-forward 6-fold positive R/day | ≥ 5/6 folds positive |
| Backtest-live parity | Live R/day in BT distribution | Live within ±1σ of BT mean expected |
| Profitability | Realism-patched BT profit factor | ≥ 1.5 |
| Risk-adjusted return | Realism-patched BT Sharpe | ≥ 1.4 |
| Drawdown discipline | Realism-patched BT max DD | ≤ 15% |
| Per-symbol robustness | Symbols passing pre-flight gates | ≥ 4 of 5 |

If V6 fails to clear any of these, **we keep V5 and either iterate to V6.1 or accept V5's lower live confidence.**

---

## 2. Non-goals (what V6 is explicitly NOT)

1. Not a re-optimization of V5 on live data — **no live data touches the development loop**.
2. Not a complete strategy rewrite — same MS/FVG core, refined wrapper.
3. Not a deeper-ML approach — no neural nets, no foundation models.
4. Not a higher-frequency strategy — 1H base timeframe stays.
5. Not a bigger-symbol-universe move — same 5 coins (BTC, ETH, SOL, BNB, XRP) until V6 proves itself.
6. Not a leverage product — spot-equivalent sizing.

---

## 3. Phased plan

Six phases. Each phase has a **gate** — failing the gate means we stop V6 development at that point and document why.

### Phase 0 — Shared infrastructure (Days 1–2)

Build the validation tooling that BOTH V5 retrospective and V6 design will use. These tools are reusable across all future strategy work; even if V6 is shelved the infrastructure is permanent value.

**Deliverables**

| File | Purpose |
|---|---|
| `scripts/multi_symbol_concurrent_backtest.py` | Run all 5 symbols in parallel with shared bar timing, like live cron. Output: combined trades, equity curve, per-symbol metrics. |
| `scripts/walk_forward_validator.py` | k-fold WF (configurable train/test split). Output: per-fold metrics + summary. |
| `scripts/stress_test_runner.py` | Run backtest on user-specified date windows (low-vol, chop, bull). Output: per-window comparison. |
| `scripts/oos_holdout.py` | Helper to slice 2026-Q1 OOS data and exclude it from all dev runs. |

**Gate 0:** All four scripts execute end-to-end on V5_DEFAULTS without error and produce consistent results vs existing `backtester.py` on the same data slice.

**Risk:** Multi-symbol concurrent BT may reveal V5 itself is worse than thought (correlated-loss clusters). Mitigation: this is information, not failure. We update V5 reference numbers accordingly.

---

### Phase 1 — V5 honest re-baseline (Days 3)

Using the Phase 0 infrastructure, compute the **true V5 baseline** that V6 must beat. Existing reference numbers were generated independent-symbol, which inflates effective n and ignores correlation.

**Deliverables**

| Artifact | Content |
|---|---|
| `reports/v5_concurrent_baseline.json` | Multi-symbol concurrent BT result on 2023-01 → 2025-12 (OOS reserve 2026 Q1) |
| `reports/v5_walk_forward.json` | 6-fold WF on the same range |
| `reports/v5_stress_tests.json` | Low-vol Apr-Aug 2024, chop Sep-Oct 2023, bull Dec 2024 |
| `docs/v6-plan.md` updated with V5 baseline table | Reference numbers V6 must clear |

**Gate 1:** V5 baseline computed and documented. No subjective interpretation — V6 will be measured against these numbers exactly.

**Expected V5 honest baseline (best guess):**

- Multi-symbol concurrent: PF 1.4–1.6, Sharpe 1.2–1.4, max DD 15–20%
- WF 6-fold: 4/6 or 5/6 folds positive (we don't know yet)
- Stress: low-vol may be the weak spot

If V5 already passes V6 acceptance thresholds (PF ≥ 1.5, WF 5/6, DD ≤ 15%), **V6 has to be materially better, not just different.**

---

### Phase 2 — V6 strategy implementation (Days 4–8)

Implement the six V6 changes against the existing engine. Strategy file is separate (`strategy_v6.py`) so V5 keeps running untouched.

**Change 2.1 — Regime filter (entry-side)**

- **Signal:** Skip entries when 1H rolling 24-day realized volatility is below 30th percentile of trailing 1-year RV distribution
- **Why:** Live data shows trades in low-vol regimes stall at TP1
- **Implementation:** `regime_filter.py` module. `RegimeState` class precomputes per-symbol RV percentiles; called before every entry decision.
- **Tunables (V6 defaults, will be WF-validated):**
  - `regime_lookback_days`: 24
  - `regime_percentile_floor`: 0.30
  - `regime_history_window`: 365 (days)

**Change 2.2 — Multi-TF agreement (entry-side)**

- **Signal:** 1H entry signal must align with 30M trend bias (HH+HL for LONG, LH+LL for SHORT, sustained ≥ 6 bars)
- **Why:** Reduces false positives; memory notes 30M had higher Sharpe historically
- **Implementation:** `mtf_agreement.py`. Pre-fetched 30M data for each symbol; trend classifier reused from existing MS module.
- **Tunables:**
  - `mtf_lower_tf`: "30m"
  - `mtf_min_trend_bars`: 6
  - `mtf_required`: true (boolean — switch off for ablation)

**Change 2.3 — TP simplified + trailing**

- **Old (V5):** TP1 5% @ 1×ATR, TP2 30% @ 4×ATR, TP3 65% @ 6×ATR
- **New (V6):** TP1 10% @ 1×ATR, then 90% on trailing stop 2×ATR after TP1
- **Why:** TP2 is a transit point; trailing captures both stops-out and tail momentum
- **Implementation:** Modify `backtester.py` (and TS engine) to add `use_trailing_after_tp1` mode. Initial trailing distance: 2×ATR from recent extreme.
- **Tunables:**
  - `tp1_close_pct_v6`: 0.10
  - `trail_atr_mult_v6`: 2.0
  - `trail_anchor`: "highest_close" (vs raw high)

**Change 2.4 — Adaptive sizing**

- **Formula:** `risk_pct = clamp(0.015 + (trailing_20_sharpe × 0.005), 0.005, 0.025)`
- **Why:** Auto-recovery from streaks without manual intervention
- **Implementation:** `adaptive_sizing.py`. Stake manager wraps the static risk_pct calc.
- **Constraints:** Min 0.5%, max 2.5%, default 1.5% during warmup (< 20 trades).

**Change 2.5 — Stricter engine realism**

- `slippage_atr_frac`: 0.05 → 0.08
- `spread_atr_frac`: 0.03 → 0.05
- `hard_stop_atr_mult`: 8 → 6
- `tp_require_close`: true + **require 2-bar confirmation** (close beyond TP for two consecutive bars)
- **Why:** Live PF 0.98 vs BT 1.71 gap suggests engine still optimistic

**Change 2.6 — Per-symbol probation gates**

- **Pre-live:** Each symbol must pass 90-day rolling BT (PF ≥ 1.3) before live deployment
- **In-live:** 30-day rolling PF < 1.0 → auto-suspend symbol; manual review to re-enable
- **Implementation:** `per_symbol_validator.py`. Runs once for pre-flight, runs per cron-tick for in-live monitoring (separate from kill-switch).

**Deliverables**

| File | Purpose |
|---|---|
| `strategy_v6.py` | V6 params + meta-config |
| `regime_filter.py` | Entry-side regime gate |
| `mtf_agreement.py` | 30M trend bias filter |
| `adaptive_sizing.py` | Trailing-Sharpe sized risk |
| `per_symbol_validator.py` | Pre-flight and rolling validation |
| `backtester.py` additions | V6 mode flag, trailing TP logic, realism param updates |
| Unit tests for each module | `tests/test_regime_filter.py`, etc. |

**Gate 2:** Single-symbol smoke test on BTC 2023 → 2025 produces non-NaN trades with the new logic active. All four ablation modes (regime on/off, MTF on/off) compile and run.

---

### Phase 3 — V6 validation (Days 9–12)

Run V6 through every validation Phase 0 built. Multiple separate runs to catch overfitting and isolate each change's contribution.

**Validation matrix**

| Run | Config | Purpose |
|---|---|---|
| 3a | V6 full (all 6 changes) | Primary benchmark |
| 3b | V6 without regime filter | Isolate regime contribution |
| 3c | V6 without MTF | Isolate MTF contribution |
| 3d | V6 without trailing TP (back to TP1/TP2/TP3) | Isolate TP-redesign contribution |
| 3e | V6 without adaptive sizing | Isolate sizing contribution |
| 3f | V6 without stricter realism | Show realism-only effect |
| 3g | V6 OOS test on 2026-Q1 (held-back data) | OOS reality check |

**Stress tests for V6 full config:**

- Low-vol Apr-Aug 2024: trade count, win rate, max DD
- Chop Sep-Oct 2023: should produce few-no entries (regime filter working)
- Bull Dec 2024: should NOT miss opportunities (regime filter not too restrictive)

**Walk-forward:**

- 6-fold WF on 2023-01 → 2025-12
- Per-fold: train (no optimization — V6_DEFAULTS), test (forward 90 days)
- Output: 6 test-fold metrics, aggregate WF Sharpe

**Deliverables**

| Artifact | Content |
|---|---|
| `reports/v6_validation_run.json` | All 7 ablation runs side-by-side |
| `reports/v6_walk_forward.json` | 6-fold WF results |
| `reports/v6_stress_tests.json` | Stress window comparison vs V5 |
| `reports/v6_oos_holdout.json` | 2026-Q1 OOS run |
| `docs/v6-plan.md` updated with results section | Numeric verdict |

**Gate 3 — V6 acceptance criteria (ALL must pass):**

| Criterion | Threshold | Notes |
|---|---|---|
| Concurrent BT profit factor | ≥ 1.5 | vs V5 baseline at same metric |
| Concurrent BT Sharpe | ≥ 1.4 | annualized |
| Concurrent BT max DD | ≤ 15% | hard ceiling |
| WF 6-fold positive R/day | ≥ 5/6 folds | robustness |
| OOS 2026-Q1 R/day | within ±1σ of in-sample mean | non-overfit |
| Stress low-vol Apr-Aug 2024 | breakeven or better | regime filter must work |
| Beats V5 honest baseline | ≥ +20% on PF AND ≥ +0.2 on Sharpe | material improvement |

If V6 fails any gate → **V6 shelved.** Document which gate failed and why. V5 continues live.

---

### Phase 4 — V5 vs V6 head-to-head (Day 13)

If Gate 3 passes, produce the decision document.

**Deliverables**

| Artifact | Content |
|---|---|
| `reports/v5_vs_v6_head_to_head.json` | Side-by-side metrics on identical data |
| `reports/v5_vs_v6_per_symbol.json` | Per-symbol breakdown for both |
| `reports/v5_vs_v6_per_year.json` | Annual performance comparison |
| `docs/v6-deployment-decision.md` | LAUNCH / DELAY / SHELVE recommendation with numeric rationale |

**Gate 4:** Independent reviewer (you) reads the decision doc. If LAUNCH: proceed to Phase 5. If DELAY: V6.1 iteration. If SHELVE: V5 stays.

---

### Phase 5 — V6 deployment (Days 14–16, only if Gate 4 = LAUNCH)

Port Python V6 to TypeScript live engine, verify parity, deploy to live cron.

**Deliverables**

| File | Purpose |
|---|---|
| `src/lib/engine/defaults_v6.ts` | V6_DEFAULTS mirroring `strategy_v6.py` |
| `src/lib/engine/regime-filter.ts` | TS port of regime filter |
| `src/lib/engine/mtf-agreement.ts` | TS port of MTF filter |
| `src/lib/engine/adaptive-sizing.ts` | TS port of adaptive sizing |
| `src/lib/engine/paper-engine.ts` additions | V6 mode in step function |
| `src/lib/engine/backtester.ts` additions | V6 batch mode |
| `src/lib/engine/__tests__/v6-parity.test.ts` | TS batch vs Python parity, 4/4 required |
| `scripts/per-symbol-preflight.ts` | Live pre-deployment validator |
| Updated `docs/launch-gates.md` v2 | V6-specific gates if relevant |
| Cron-tick swap commit | One commit, V5_DEFAULTS → V6_DEFAULTS in cron-tick.ts |

**Deployment sequence:**

1. Per-symbol pre-flight gate runs for all 5 symbols against V6
2. Each symbol that passes is marked v6-eligible in Supabase
3. Cron-tick reads symbol's eligibility; uses V6 logic for v6-eligible, V5 logic for legacy
4. Run for 14 days with both engines active (warm comparison)
5. After 14 days, if V6-side outperforms V5-side: swap all symbols; archive V5
6. After swap, V5 engine code stays in repo (revertable) but not active

**Gate 5:** Parity tests 4/4 PASS; pre-flight passes for ≥ 4 of 5 symbols; manual smoke test on one paper portfolio for 24 hours.

---

### Phase 6 — Post-deployment monitoring (Ongoing)

Once V6 is live:

- Daily R/day check against V6 expected distribution
- Weekly `verify_v6_readiness.py` (analog of `verify_launch_readiness.py`)
- Monthly walk-forward re-validation on rolling 90-day windows
- Quarterly full re-evaluation with possible V6.1 iteration

If V6 live R/day drifts ≥ 2σ below V6 backtest expected, **rollback to V5** and trigger V6.1 investigation.

---

## 4. Timeline (working days)

| Day | Phase | Activity |
|---|---|---|
| 1 | 0 | Multi-symbol concurrent BT + WF infrastructure |
| 2 | 0 | Stress test runner + OOS holdout helper |
| 3 | 1 | V5 honest re-baseline (single run with 3 outputs) |
| 4 | 2 | V6 strategy file + regime filter |
| 5 | 2 | MTF agreement module |
| 6 | 2 | Adaptive sizing + per-symbol validator |
| 7 | 2 | Backtester V6 mode + realism updates |
| 8 | 2 | Unit tests, single-symbol smoke run |
| 9 | 3 | V6 ablation runs (3a–3f) |
| 10 | 3 | V6 walk-forward |
| 11 | 3 | Stress tests + OOS holdout |
| 12 | 3 | Compile validation report |
| 13 | 4 | Head-to-head V5 vs V6 + decision doc |
| 14 | 5 | TS port — regime + MTF |
| 15 | 5 | TS port — adaptive sizing + V6 paper-engine integration |
| 16 | 5 | Parity tests, pre-flight, deployment commit |

**Total: 16 working days (~3 calendar weeks)**

Realistic buffer: +30% → **21 working days, ~4 calendar weeks**.

**Parallel constraint:** Throughout the entire 4-week window, V5 live continues running. V5 cron is **untouched**. No live data feeds back into V6 dev under any condition.

---

## 5. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 1 reveals V5 baseline worse than expected | High | Low | Information is value. Update V5 reference numbers. |
| V6 fails Gate 3 acceptance | Medium | Medium | Phases 0–3 infrastructure is reused; V6.1 iteration starts from Phase 2 |
| Multi-symbol concurrent BT exposes correlation problems | Medium | Medium | Build adaptive_sizing with correlation awareness in V6.1 |
| WF reveals overfit to specific regime | Medium | High | OOS holdout in Phase 3g catches this; if it fails, V6 shelved |
| Realism stricter than reality (V6 BT too conservative) | Low | Low | Calibrate slippage to actual fill data from live trades |
| TS port introduces parity drift | Low | High | Strict parity tests gate Phase 5; can't deploy without 4/4 |
| Pre-flight rejects ≥ 2 symbols | Medium | Medium | Run V6 with 3-4 symbols; document why others rejected |
| V6 deployment underperforms V5 live | Low | High | 14-day warm comparison in Phase 5; rollback path always open |
| Engine realism updates break V5 backtest reference | High | Low | V6 uses separate `V6_REALISM_DEFAULTS`; V5 numbers re-baselined in Phase 1 with V5 settings |
| Scope creep mid-development | Medium | High | This document is FROZEN. New ideas → V7 backlog |

---

## 6. Frozen constraints (anti-creep)

These rules are immutable from commit of this plan onward. Violations require a new dated `v6-plan-v2.md` document with explicit reasoning.

1. **No live data in V6 development.** Live `live_trades` table is reference-only and only for divergence analysis, not parameter selection.
2. **Phase gates are hard.** Failing a gate stops V6 at that point; no "let's see if Phase 3 fixes it" hand-waving.
3. **V5 live runs untouched.** No cron-tick changes, no param touches, until Phase 5 deploys V6.
4. **Engine realism patches stay or get stricter, never looser.** P1-P4 are minimum; V6 adds 2-bar confirm to TP.
5. **Out-of-sample 2026-Q1 data is held back.** Never touched during dev. Only at Phase 3g for honest OOS test.
6. **Acceptance thresholds (Gate 3) cannot be lowered.** If V6 produces PF 1.4 instead of 1.5, V6 is shelved or iterated — not approved.
7. **Per-symbol gates apply to every symbol.** No "we know BTC will pass, skip the check."

---

## 7. Success definition

**Three success states:**

### State A — Full success (~30% probability)
- All Gate 3 criteria pass
- Gate 4 LAUNCH
- V6 deploys, 14-day warm comparison shows ≥ +20% PF vs V5 live
- V6 becomes default engine; V5 archived

### State B — Partial success (~40% probability)
- Some Gate 3 criteria pass, others marginal
- V6.1 iteration with specific module changes (e.g. regime filter too restrictive)
- 1-2 more weeks of focused work
- Then re-evaluate at Phase 3 again

### State C — V6 shelved (~30% probability)
- Gate 3 fails materially
- V5 continues as live engine
- V6 learnings documented for future V7 work
- Phase 0 infrastructure remains permanent value

**All three are acceptable outcomes.** The plan is success-oriented but not success-required. Disciplined failure is better than undisciplined launch.

---

## 8. What I commit to as engineer

- Daily progress in commits referencing this doc
- Per-phase end-of-day summary with metrics
- Honest "this isn't working" calls at gates (no sunk cost rationalization)
- No live data touches in dev environment
- All artifacts archived to `reports/` so the work is auditable

## 9. What I need from you as owner

- Approval to start (one word: "go")
- Hands-off the cron until Phase 5 (V5 stays running)
- Decision authority at Gates 1, 3, 4 (LAUNCH / DELAY / SHELVE)
- Acceptance that this is a 3-4 week effort and V6 might not ship
- No mid-development scope changes — new ideas go to V7 backlog

---

## 9.5. Visibility — `/research/v6` dashboard

Real-time visibility into V6 R&D progress. New public page that reflects the contents of `reports/` as the work happens. Same design language as `/live` and `/`.

### Sections (filled phase-by-phase)

| Section | Phase fills it | Source |
|---|---|---|
| Status banner | Phase 0 | Current phase + progress (manually-maintained `public/data/v6/status.json`) |
| V5 honest baseline | Phase 1 | `public/data/v6/v5_baseline.json` (copied from `reports/`) |
| V6 strategy summary | Phase 2 | Static — pulled from `strategy_v6.py` constants |
| Ablation matrix | Phase 3 | `public/data/v6/v6_validation_run.json` |
| Walk-forward folds chart | Phase 3 | `public/data/v6/v6_walk_forward.json` |
| Stress tests table | Phase 3 | `public/data/v6/v6_stress_tests.json` |
| OOS holdout result | Phase 3g | `public/data/v6/v6_oos_holdout.json` |
| V5 vs V6 head-to-head | Phase 4 | `public/data/v6/v5_vs_v6.json` |
| Decision recommendation | Phase 4 | Inline in dashboard from decision doc |
| Live deployment status | Phase 5 | Live status (V5 / V6 / both) |

### Deliverables added to Phase 0

| File | Purpose |
|---|---|
| `src/app/research/v6/page.tsx` | Dashboard page, hairline-grid aesthetic |
| `src/components/research/V6StatusBanner.tsx` | Current phase + progress |
| `src/components/research/V6BaselineCard.tsx` | V5 reference numbers (Phase 1) |
| `src/components/research/V6AblationMatrix.tsx` | Per-config metric grid (Phase 3) |
| `src/components/research/V6WalkForwardChart.tsx` | Per-fold R/day visualization |
| `src/components/research/V6StressTable.tsx` | Stress windows comparison |
| `src/components/research/V6HeadToHead.tsx` | V5 vs V6 side-by-side |
| `public/data/v6/status.json` | Static seed file with Phase 0 status |
| Nav entry: `/research/v6` linked from top nav (or just `/`) | Discoverability |

### Discipline rules

1. Dashboard reads ONLY from `public/data/v6/*.json`. No live API calls.
2. Each phase, the report-producing script also writes the corresponding JSON to `public/data/v6/`.
3. Empty / TBD sections render a clean "Phase X — pending" placeholder. Not hidden.
4. JSON files are git-tracked so the dashboard works after every commit, no DB.

### Cost

- Phase 0 + ~1 day for scaffolding (added to original 2 days)
- ~2 hours per subsequent phase to copy report → dashboard component
- Total overhead: **~+2 days across the whole project**

### Visibility benefit

- Owner can watch V6 progress without reading commit logs or JSON files
- Public can see the R&D process (showing-the-work, builds trust)
- Future strategy iterations have a template

---

## 10. Sign-off

By committing this document, both parties acknowledge:

- The phased structure is the contract
- The acceptance thresholds are the contract
- The success definition (A/B/C) is the contract
- Modifications require a new dated charter

Signed: ivala (owner) + Helix engineering — 2026-05-25
