"""
Optimization V3 — Test 6 improvements individually and in combination.

Improvements (targeting V2 weaknesses):
  A. TP Rebalance — reduce TP1 close%, widen TP3 (payoff ratio fix)
  B. Trail After TP2 — replace fixed TP3 with trailing (capture trend extensions)
  C. Volatility Filter — skip high-ATR entries (regime awareness)
  D. Tiered Sizing — scale risk% by signal score (signal quality)
  E. Edge Decay Monitor — reduce/skip on declining expectancy
  F. Min Hold Period — extend SL suppression (dead-zone elimination)

Baseline: V2 winner (all V2 ON, all V3 OFF).
Tests each individually, then all 2/3-way combos, then fine-tunes best combo.
"""

import time
from itertools import combinations
from copy import deepcopy
from pathlib import Path

import numpy as np
import pandas as pd

from backtester import Backtester, walk_forward_test
from stake_manager import SizingMethod

DATA_DIR = Path(__file__).parent / "data"

# V2 winner baseline (all V3 improvements OFF)
BASELINE = {
    "initial_capital": 10_000,
    "risk_pct": 0.02,
    "sizing_method": SizingMethod.FIXED_FRACTIONAL,
    "use_market_structure": True,
    "use_fvg": True,
    "use_smc": False,
    "use_classic_pa": False,
    "min_confluence": 0.50,
    "sl_atr_mult": 2.0,
    "tp1_atr_mult": 2.0,
    "tp2_atr_mult": 4.0,
    "tp3_atr_mult": 8.0,
    "tp1_close_pct": 0.40,
    "tp2_close_pct": 0.30,
    "tp3_close_pct": 0.30,
    "use_trailing": False,
    "trailing_atr_mult": 0,
    "trailing_activation_atr": 0,
    "warmup_bars": 50,
    "commission_pct": 0.075,
    # V2 improvements (ON)
    "min_bars_before_sl": 19,
    "be_after_tp1": True,
    "be_buffer_atr": 0.30,
    "min_signal_score": 0.60,
    "use_regime_filter": False,
    # V3 improvements (all OFF)
    "trail_after_tp2": False,
    "trail_after_tp2_atr": 2.0,
    "use_vol_filter": False,
    "vol_filter_percentile": 80.0,
    "vol_filter_lookback": 100,
    "use_tiered_sizing": False,
    "tier_thresholds": [0.60, 0.70, 0.80],
    "tier_risks": [0.015, 0.02, 0.025],
    "use_edge_monitor": False,
    "edge_window": 30,
    "edge_reduce_threshold": 15.0,
    "edge_skip_threshold": 5.0,
    "edge_reduced_risk": 0.01,
}


def load_data():
    pattern = "BTCUSDT_1h_*.csv"
    files = list(DATA_DIR.glob(pattern))
    filepath = max(files, key=lambda f: f.stat().st_size)
    df = pd.read_csv(filepath)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    return df


def run_test(df, params, label=""):
    """Run a single backtest and return key metrics."""
    try:
        bt = Backtester(**params)
        result = bt.run(df)
        m = result["metrics"]
        if m.get("total_trades", 0) < 5:
            return None
        return {
            "label": label,
            "trades": m["total_trades"],
            "return_pct": round(m["total_return_pct"], 2),
            "sharpe": round(m["sharpe_ratio"], 2),
            "max_dd": round(m["max_drawdown_pct"], 2),
            "win_rate": round(m["win_rate"] * 100, 1),
            "pf": round(m["profit_factor"], 2),
            "payoff": round(m.get("payoff_ratio", 0), 2),
            "calmar": round(m.get("calmar_ratio", 0), 2),
            "expectancy": round(m.get("expectancy", 0), 2),
            "net_profit": round(m.get("net_profit", 0), 2),
        }
    except Exception as e:
        print(f"    ERROR: {label}: {e}")
        return None


def print_result(r, highlight=False):
    if r is None:
        return
    prefix = ">>>" if highlight else "   "
    print(f"  {prefix} {r['label']:<50} {r['trades']:>4}t  {r['return_pct']:>+7.1f}%  "
          f"Sh {r['sharpe']:>5.2f}  DD {r['max_dd']:>5.1f}%  "
          f"WR {r['win_rate']:>5.1f}%  PF {r['pf']:>5.2f}  "
          f"Pay {r['payoff']:>5.2f}  E$ {r['expectancy']:>6.1f}")


def score(r):
    """Composite score: return * sharpe / max_dd."""
    if r is None:
        return -999
    return r["return_pct"] * max(r["sharpe"], 0.01) / max(r["max_dd"], 0.1)


def main():
    print("=" * 100)
    print("  OPTIMIZATION V3 — Testing All Improvements")
    print("=" * 100)

    df = load_data()
    print(f"  Data: {len(df)} bars\n")
    t0 = time.time()

    all_results = []

    # ── BASELINE ──
    print("  BASELINE (V2 winner, no V3 improvements):")
    base = run_test(df, BASELINE, "BASELINE (V2)")
    print_result(base, highlight=True)
    all_results.append(base)

    # Track best per category for combo phase
    cats = {"A": [], "B": [], "C": [], "D": [], "E": [], "F": []}

    # ═══════════════════════════════════════════════════════════
    # A. TP REBALANCE (payoff ratio fix)
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*100}")
    print("  A. TP REBALANCE — Reduce TP1 close%, widen TP3")
    for tp1_pct in [0.20, 0.25, 0.30, 0.35]:
        for tp3_mult in [6.0, 8.0, 10.0, 12.0]:
            p = deepcopy(BASELINE)
            p["tp1_close_pct"] = tp1_pct
            # Split remainder evenly between TP2 and TP3
            remain = 1.0 - tp1_pct
            p["tp2_close_pct"] = remain / 2
            p["tp3_close_pct"] = remain / 2
            p["tp3_atr_mult"] = tp3_mult
            r = run_test(df, p, f"A: tp1={tp1_pct:.0%} tp3={tp3_mult}x")
            print_result(r)
            if r:
                r["_score"] = score(r)
                r["_params"] = {"tp1_pct": tp1_pct, "tp3_mult": tp3_mult}
                cats["A"].append(r)
                all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # B. TRAIL AFTER TP2
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*100}")
    print("  B. TRAIL AFTER TP2 — Replace fixed TP3 with trailing")
    for trail_atr in [1.5, 2.0, 2.5, 3.0, 3.5]:
        p = deepcopy(BASELINE)
        p["trail_after_tp2"] = True
        p["trail_after_tp2_atr"] = trail_atr
        r = run_test(df, p, f"B: trail_tp2 atr={trail_atr}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_params"] = {"trail_atr": trail_atr}
            cats["B"].append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # C. VOLATILITY FILTER
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*100}")
    print("  C. VOLATILITY FILTER — Skip high-ATR entries")
    for pctile in [70, 75, 80, 85, 90]:
        for lb in [50, 100]:
            p = deepcopy(BASELINE)
            p["use_vol_filter"] = True
            p["vol_filter_percentile"] = pctile
            p["vol_filter_lookback"] = lb
            r = run_test(df, p, f"C: vol>{pctile}pct lb={lb}")
            print_result(r)
            if r:
                r["_score"] = score(r)
                r["_params"] = {"pctile": pctile, "lb": lb}
                cats["C"].append(r)
                all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # D. TIERED SIZING
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*100}")
    print("  D. TIERED SIZING — Scale risk by signal score")
    tier_configs = [
        ("conservative", [0.60, 0.70, 0.80], [0.015, 0.020, 0.025]),
        ("aggressive_top", [0.60, 0.70, 0.80], [0.015, 0.020, 0.030]),
        ("wide_spread", [0.60, 0.70, 0.80], [0.010, 0.020, 0.030]),
        ("lower_thresh", [0.55, 0.65, 0.75], [0.015, 0.020, 0.025]),
        ("flat_boost", [0.60, 0.70, 0.80], [0.020, 0.025, 0.030]),
    ]
    for name, thresholds, risks in tier_configs:
        p = deepcopy(BASELINE)
        p["use_tiered_sizing"] = True
        p["tier_thresholds"] = thresholds
        p["tier_risks"] = risks
        r = run_test(df, p, f"D: {name} {risks}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_params"] = {"name": name, "thresholds": thresholds, "risks": risks}
            cats["D"].append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # E. EDGE DECAY MONITOR
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*100}")
    print("  E. EDGE DECAY MONITOR — Reduce/skip on declining expectancy")
    for window in [20, 30, 40]:
        for reduce_thresh in [10, 15, 20]:
            for skip_thresh in [0, 5]:
                p = deepcopy(BASELINE)
                p["use_edge_monitor"] = True
                p["edge_window"] = window
                p["edge_reduce_threshold"] = reduce_thresh
                p["edge_skip_threshold"] = skip_thresh
                r = run_test(df, p, f"E: w={window} red={reduce_thresh} skip={skip_thresh}")
                print_result(r)
                if r:
                    r["_score"] = score(r)
                    r["_params"] = {"window": window, "reduce": reduce_thresh, "skip": skip_thresh}
                    cats["E"].append(r)
                    all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # F. MIN HOLD PERIOD
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*100}")
    print("  F. MIN HOLD PERIOD — Extend SL suppression")
    for min_bars in [19, 22, 25, 28, 30]:
        p = deepcopy(BASELINE)
        p["min_bars_before_sl"] = min_bars
        r = run_test(df, p, f"F: min_bars={min_bars}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_params"] = {"min_bars": min_bars}
            cats["F"].append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # BEST SINGLES
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*100}")
    print("  BEST INDIVIDUAL IMPROVEMENTS")
    print(f"{'='*100}")

    best_singles = {}
    for cat, results in sorted(cats.items()):
        if results:
            best = max(results, key=lambda x: x["_score"])
            best_singles[cat] = best
            print(f"  Best {cat}: {best['label']}")
            print_result(best, highlight=True)

    # ═══════════════════════════════════════════════════════════
    # COMBINATIONS — 2-way and 3-way
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*100}")
    print("  COMBINATIONS")
    print(f"{'='*100}")

    def build_override(cat, best_r):
        """Build param overrides for a given feature from its best result."""
        bp = best_r["_params"]
        if cat == "A":
            tp1_pct = bp["tp1_pct"]
            remain = 1.0 - tp1_pct
            return {"tp1_close_pct": tp1_pct, "tp2_close_pct": remain / 2,
                    "tp3_close_pct": remain / 2, "tp3_atr_mult": bp["tp3_mult"]}
        elif cat == "B":
            return {"trail_after_tp2": True, "trail_after_tp2_atr": bp["trail_atr"]}
        elif cat == "C":
            return {"use_vol_filter": True, "vol_filter_percentile": bp["pctile"],
                    "vol_filter_lookback": bp["lb"]}
        elif cat == "D":
            return {"use_tiered_sizing": True, "tier_thresholds": bp["thresholds"],
                    "tier_risks": bp["risks"]}
        elif cat == "E":
            return {"use_edge_monitor": True, "edge_window": bp["window"],
                    "edge_reduce_threshold": bp["reduce"], "edge_skip_threshold": bp["skip"]}
        elif cat == "F":
            return {"min_bars_before_sl": bp["min_bars"]}
        return {}

    # Build per-feature overrides
    overrides = {}
    for cat in best_singles:
        overrides[cat] = build_override(cat, best_singles[cat])

    combo_results = []
    active_cats = sorted(best_singles.keys())

    # All 2-way combinations
    print(f"\n  2-WAY COMBOS:")
    for c1, c2 in combinations(active_cats, 2):
        # Skip A+B conflict: if trail_after_tp2=True, tp3_atr_mult is irrelevant
        p = deepcopy(BASELINE)
        p.update(overrides[c1])
        p.update(overrides[c2])
        name = f"{c1}+{c2}"
        r = run_test(df, p, f"COMBO: {name}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_combo"] = name
            combo_results.append(r)
            all_results.append(r)

    # All 3-way combinations
    print(f"\n  3-WAY COMBOS:")
    for combo in combinations(active_cats, 3):
        p = deepcopy(BASELINE)
        for c in combo:
            p.update(overrides[c])
        name = "+".join(combo)
        r = run_test(df, p, f"COMBO: {name}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_combo"] = name
            combo_results.append(r)
            all_results.append(r)

    # 4-way and full combo (only best ones)
    if len(active_cats) >= 4:
        print(f"\n  4+ WAY COMBOS:")
        for combo in combinations(active_cats, 4):
            p = deepcopy(BASELINE)
            for c in combo:
                p.update(overrides[c])
            name = "+".join(combo)
            r = run_test(df, p, f"COMBO: {name}")
            print_result(r)
            if r:
                r["_score"] = score(r)
                r["_combo"] = name
                combo_results.append(r)
                all_results.append(r)

    # Full combo (all features)
    if len(active_cats) >= 5:
        for combo in combinations(active_cats, 5):
            p = deepcopy(BASELINE)
            for c in combo:
                p.update(overrides[c])
            name = "+".join(combo)
            r = run_test(df, p, f"COMBO: {name}")
            print_result(r)
            if r:
                r["_score"] = score(r)
                r["_combo"] = name
                combo_results.append(r)
                all_results.append(r)

    if len(active_cats) == 6:
        p = deepcopy(BASELINE)
        for c in active_cats:
            p.update(overrides[c])
        r = run_test(df, p, "COMBO: ALL (A+B+C+D+E+F)")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_combo"] = "ALL"
            combo_results.append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # OVERALL RANKING
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*100}")
    print("  OVERALL TOP 15 (all configurations)")
    print(f"{'='*100}")

    valid = [r for r in all_results if r]
    for r in valid:
        r["_score"] = score(r)
    valid.sort(key=lambda x: -x["_score"])

    for r in valid[:15]:
        is_baseline = r["label"] == "BASELINE (V2)"
        print_result(r, highlight=is_baseline)

    # ═══════════════════════════════════════════════════════════
    # WALK-FORWARD VALIDATION — Top 3
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*100}")
    print("  WALK-FORWARD VALIDATION — Top 3 Configs")
    print(f"{'='*100}")

    for rank, r in enumerate(valid[:3], 1):
        label = r["label"]
        print(f"\n  #{rank}: {label}")

        # Reconstruct params from the result
        p = deepcopy(BASELINE)

        if "COMBO:" in label:
            combo_name = label.replace("COMBO: ", "").replace("ALL (A+B+C+D+E+F)", "ALL")
            if combo_name == "ALL":
                for c in active_cats:
                    p.update(overrides[c])
            else:
                for c in combo_name.split("+"):
                    c = c.strip()
                    if c in overrides:
                        p.update(overrides[c])
        else:
            # Single feature
            cat = label[0] if label[0] in "ABCDEF" else None
            if cat and cat in overrides:
                p.update(overrides[cat])
            # Apply specific params from _params if available
            bp = r.get("_params", {})
            if cat == "A" and bp:
                tp1_pct = bp.get("tp1_pct", 0.40)
                remain = 1.0 - tp1_pct
                p["tp1_close_pct"] = tp1_pct
                p["tp2_close_pct"] = remain / 2
                p["tp3_close_pct"] = remain / 2
                p["tp3_atr_mult"] = bp.get("tp3_mult", 8.0)
            elif cat == "B" and bp:
                p["trail_after_tp2"] = True
                p["trail_after_tp2_atr"] = bp.get("trail_atr", 2.0)
            elif cat == "C" and bp:
                p["use_vol_filter"] = True
                p["vol_filter_percentile"] = bp.get("pctile", 80)
                p["vol_filter_lookback"] = bp.get("lb", 100)
            elif cat == "D" and bp:
                p["use_tiered_sizing"] = True
                p["tier_thresholds"] = bp.get("thresholds", [0.60, 0.70, 0.80])
                p["tier_risks"] = bp.get("risks", [0.015, 0.02, 0.025])
            elif cat == "E" and bp:
                p["use_edge_monitor"] = True
                p["edge_window"] = bp.get("window", 30)
                p["edge_reduce_threshold"] = bp.get("reduce", 15)
                p["edge_skip_threshold"] = bp.get("skip", 5)
            elif cat == "F" and bp:
                p["min_bars_before_sl"] = bp.get("min_bars", 19)

        try:
            wf = walk_forward_test(df, p, n_folds=5, train_pct=0.6)
            for fold in wf["folds"]:
                status = "PASS" if fold["test_profitable"] else "FAIL"
                print(f"    Fold {fold['fold']}: "
                      f"train {fold['train_trades']}t ({fold['train_return_pct']:+.1f}%) | "
                      f"test {fold['test_trades']}t ({fold['test_return_pct']:+.1f}%) [{status}]")
            print(f"    Pass rate: {wf['passing_folds']}/{wf['total_folds']} "
                  f"| Avg OOS: {wf['avg_test_return_pct']:+.2f}%")
        except Exception as e:
            print(f"    WF ERROR: {e}")

    # ═══════════════════════════════════════════════════════════
    # V2 vs V3 COMPARISON
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*100}")
    print("  V2 vs V3 COMPARISON")
    print(f"{'='*100}")

    v3_winner = valid[0] if valid else None
    if base and v3_winner:
        print(f"\n  {'Metric':<20} {'V2':>12} {'V3':>12} {'Delta':>12}")
        print(f"  {'─'*56}")
        for key, label in [
            ("return_pct", "Return %"),
            ("sharpe", "Sharpe"),
            ("max_dd", "Max DD %"),
            ("win_rate", "Win Rate %"),
            ("pf", "Profit Factor"),
            ("payoff", "Payoff Ratio"),
            ("expectancy", "Expectancy $"),
            ("trades", "Trades"),
        ]:
            v2_val = base[key]
            v3_val = v3_winner[key]
            delta = v3_val - v2_val
            print(f"  {label:<20} {v2_val:>12.2f} {v3_val:>12.2f} {delta:>+12.2f}")

        print(f"\n  V3 Winner: {v3_winner['label']}")

    elapsed = time.time() - t0
    print(f"\n  Total time: {elapsed:.0f}s")


if __name__ == "__main__":
    main()
