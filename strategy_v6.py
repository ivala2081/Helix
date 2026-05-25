"""
Helix V6 — strategy parameters.

V6 is V5 with six structural changes (see docs/v6-plan.md Phase 2):
  2.1 Regime filter — skip entries when 1H 24-day RV in bottom 30th pctl
  2.2 Multi-TF agreement — 1H signal must align with 30M trend bias (6+ bars)
  2.3 TP simplified — drop TP2, trailing stop after TP1 at 2× ATR
  2.4 Adaptive sizing — risk_pct scales with trailing-20-trade Sharpe
  2.5 Stricter realism — slippage 0.08, spread 0.05, hard_stop 6, 2-bar TP confirm
  2.6 Per-symbol gates — 90-day rolling PF >= 1.3 for live eligibility

V6 starts from V5's WINNER_PARAMS and applies the six changes.
V5_STRATEGY_PARAMS remains untouched in strategy.py.
"""
from __future__ import annotations

from copy import deepcopy

from strategy import STRATEGY_PARAMS as V5_PARAMS


# ─────────────────────────────────────────────────────────────────────
# V6 PARAMS — applied to base V5 then specifically overridden
# ─────────────────────────────────────────────────────────────────────

V6_PARAMS = deepcopy(V5_PARAMS)

# ── Change 2.3 — TP simplified + trailing ────────────────────────────
# Old V5 mix: 5/30/65 across TP1/TP2/TP3.
# V6: 10% locked at TP1, remaining 90% rides on 2× ATR trailing stop.
# TP2 set to 0 close% (unused). TP3 close% adjusted to 0; trailing fires
# the close. backtester.py V6 mode enables `use_trailing_after_tp1`.
V6_PARAMS["tp1_close_pct"] = 0.10
V6_PARAMS["tp2_close_pct"] = 0.00  # unused in V6 mode
V6_PARAMS["tp3_close_pct"] = 0.00  # unused in V6 mode (trailing fires)
# trail_after_tp2 was V5's separate trailing-after-TP2 toggle; we don't use it.
# A new flag enables V6-style "trail right after TP1":
V6_PARAMS["trail_after_tp1"] = True
V6_PARAMS["trail_after_tp1_atr"] = 2.0

# ── Change 2.5 — Stricter engine realism ────────────────────────────
V6_PARAMS["slippage_atr_frac"] = 0.08  # was 0.05
V6_PARAMS["spread_atr_frac"] = 0.05    # was 0.03
V6_PARAMS["hard_stop_atr_mult"] = 6.0  # was 8.0
V6_PARAMS["tp_require_close"] = True   # already in V5; V6 keeps + adds bar-confirm
# New flag enforces 2-bar close confirmation for TP fills:
V6_PARAMS["tp_require_close_bars"] = 2

# ── Change 2.1 — Regime filter ──────────────────────────────────────
# Computed per-symbol from precomputed RV percentiles. The backtester
# loads this metadata via REGIME_HISTORY_WINDOW lookback. Param names are
# v6_-prefixed in Backtester to avoid collision with V5's regime/ER filter.
V6_PARAMS["use_v6_regime_filter"] = True
V6_PARAMS["v6_regime_rv_lookback_days"] = 24
V6_PARAMS["v6_regime_rv_pctl_floor"] = 0.30  # skip entries when RV24 < pctl_30
V6_PARAMS["v6_regime_history_window_days"] = 365

# ── Change 2.2 — Multi-TF agreement ─────────────────────────────────
# Requires lower-TF data (30M) to be pre-fetched and supplied to the
# backtester via df_30m kwarg. When use_v6_mtf_agreement=True, entry-side
# checks 30M trend bias.
V6_PARAMS["use_v6_mtf_agreement"] = True
V6_PARAMS["v6_mtf_lower_tf"] = "30m"
V6_PARAMS["v6_mtf_min_trend_bars"] = 6

# ── Change 2.4 — Adaptive sizing ────────────────────────────────────
# Replaces fixed risk_pct with a trailing-Sharpe modulated risk.
# Range: [0.005, 0.025]. Baseline during warmup (n<20 trades): 0.015.
V6_PARAMS["use_v6_adaptive_sizing"] = True
V6_PARAMS["v6_adaptive_baseline_risk_pct"] = 0.015
V6_PARAMS["v6_adaptive_min_risk_pct"] = 0.005
V6_PARAMS["v6_adaptive_max_risk_pct"] = 0.025
V6_PARAMS["v6_adaptive_sharpe_window_trades"] = 20
V6_PARAMS["v6_adaptive_sharpe_coef"] = 0.005

# ── Change 2.6 — Per-symbol probation gates ─────────────────────────
# Used by per_symbol_validator.py, not enforced inside backtester.
# Recorded here for documentation:
PER_SYMBOL_PREFLIGHT_THRESHOLDS = {
    "min_n_trades": 80,
    "min_profit_factor": 1.3,
    "min_wf_folds_positive": 4,  # out of 5
    "rolling_days_for_live": 90,
}

PER_SYMBOL_LIVE_THRESHOLDS = {
    "rolling_days_for_suspension": 30,
    "min_rolling_profit_factor": 1.0,
}


# ─────────────────────────────────────────────────────────────────────
# Summary helpers
# ─────────────────────────────────────────────────────────────────────

def v6_changes_vs_v5() -> dict:
    """Return a flat dict of V6-only param differences from V5, for reporting."""
    diffs = {}
    for k, v in V6_PARAMS.items():
        if k not in V5_PARAMS:
            diffs[k] = {"v5": None, "v6": v}
        elif V5_PARAMS[k] != v:
            diffs[k] = {"v5": V5_PARAMS[k], "v6": v}
    return diffs


if __name__ == "__main__":
    import json
    print("V6 changes vs V5:")
    print(json.dumps(v6_changes_vs_v5(), indent=2, default=str))
