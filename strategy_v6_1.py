"""
Helix V6.1 — narrow iteration after V6 Phase 3 Gate FAIL (2026-05-25).

V6.1 keeps V6's chassis but applies four targeted changes derived from the
ablation matrix in `docs/v6-gate3-verdict.md`:

  Drop A — MTF agreement OFF (V6's 30M trend bias was the dominant trade-killer
           in ablation 3c: removing it lifted Sharpe 0.51 -> 1.35).
  Drop B — Adaptive sizing OFF (V6's 3e showed no-op at low trade counts).
  Swap C — Regime filter switched from PERCENTILE (relative) to ABSOLUTE
           (annualized RV floor calibrated from BTC+ETH+SOL pooled 2023-2025
           distribution). V6's percentile mode failed to block structurally
           low-vol periods because the trailing 365-day base shifted along
           with the regime.
  Keep   — Trailing-after-TP1 (helped in ablation 3d).
  Keep   — Strict realism (slippage 0.08 / spread 0.05 / hard-stop 6 / 2-bar TP).
  Keep   — Per-symbol probation gates.

Calibration source: `reports/v6_1_rv_floor_calibration.json` -> P30 = 0.492.
"""
from __future__ import annotations

from copy import deepcopy

from strategy_v6 import V6_PARAMS


V6_1_PARAMS = deepcopy(V6_PARAMS)

# Drop A — MTF agreement off (no 30M data required)
V6_1_PARAMS["use_v6_mtf_agreement"] = False

# Drop B — Adaptive sizing off (fixed V5 risk_pct)
V6_1_PARAMS["use_v6_adaptive_sizing"] = False

# Swap C — Regime mode: percentile -> absolute (RV floor 0.492 annualized)
V6_1_PARAMS["use_v6_regime_filter"] = True
V6_1_PARAMS["v6_regime_mode"] = "absolute"
V6_1_PARAMS["v6_regime_rv_floor_absolute"] = 0.492

# Trailing TP, strict realism, and per-symbol gates inherit from V6_PARAMS.


def v6_1_changes_vs_v6() -> dict:
    """Return the V6 -> V6.1 diff for reporting."""
    diffs = {}
    for k, v in V6_1_PARAMS.items():
        if k not in V6_PARAMS:
            diffs[k] = {"v6": None, "v6_1": v}
        elif V6_PARAMS[k] != v:
            diffs[k] = {"v6": V6_PARAMS[k], "v6_1": v}
    return diffs


if __name__ == "__main__":
    import json
    print("V6 -> V6.1 changes:")
    print(json.dumps(v6_1_changes_vs_v6(), indent=2, default=str))
