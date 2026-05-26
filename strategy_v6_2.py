"""
Helix V6.2 — V6.1 minus regime filter.

V6.1 ablation 3b showed that turning the absolute-RV regime filter OFF
strictly improves Sharpe (1.66 -> 1.95) and PF (1.56 -> 1.63) on the
2024-2025 BTC/ETH/SOL dev set. The filter's only structural benefit was
the low-vol stress window fix, so this iteration tests whether removing
the filter sacrifices that defense or whether the remaining V6.1 changes
(trail-after-TP1, strict realism, per-symbol gates) carry the strategy
on their own.

V6.2 = V5_PARAMS + trail-after-TP1 + strict realism + per-symbol gates.

If V6.2 also passes the low-vol stress window, V6.2 becomes the
recommended candidate. If V6.2 fails low-vol stress, V6.1 wins.
"""
from __future__ import annotations

from copy import deepcopy

from strategy_v6_1 import V6_1_PARAMS


V6_2_PARAMS = deepcopy(V6_1_PARAMS)

# Single change from V6.1: drop the regime filter entirely.
V6_2_PARAMS["use_v6_regime_filter"] = False


def v6_2_changes_vs_v6_1() -> dict:
    diffs = {}
    for k, v in V6_2_PARAMS.items():
        if k not in V6_1_PARAMS:
            diffs[k] = {"v6_1": None, "v6_2": v}
        elif V6_1_PARAMS[k] != v:
            diffs[k] = {"v6_1": V6_1_PARAMS[k], "v6_2": v}
    return diffs


if __name__ == "__main__":
    import json
    print("V6.1 -> V6.2 changes:")
    print(json.dumps(v6_2_changes_vs_v6_1(), indent=2, default=str))
