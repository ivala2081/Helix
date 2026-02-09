"""
Optimization V4 — Fix Risk Calibration + Extend Parameters

Critical finding: V3's tiered sizing is a NO-OP.
  - Only MS+FVG enabled → total_weight=2.0
  - BOS+FVG score = (0.7+0.6)/2.0 = 0.65 (every trade)
  - CHoCH+FVG score = (0.5+0.6)/2.0 = 0.55 (filtered by min_signal_score=0.60)
  - All 232 trades score 0.65, tier[0.60]→1% risk (lowest tier, half intended base)

Tests:
  A. Flat Risk Calibration — find optimal risk% with tiered OFF
  B. Recalibrated Tiered Sizing — lower min_signal_score, differentiate BOS vs CHoCH
  C. Extended Parameter Ranges — min_bars 30-50, tp1_close 5-20%
  D. Slippage Stress Test — profit durability under execution friction

Baseline: V3 winner (effective 1% risk on all trades).
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

# V3 winner baseline
V3_BASELINE = {
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
    "tp3_atr_mult": 6.0,              # V3-A
    "tp1_close_pct": 0.20,            # V3-A
    "tp2_close_pct": 0.30,
    "tp3_close_pct": 0.50,
    "use_trailing": False,
    "trailing_atr_mult": 0,
    "trailing_activation_atr": 0,
    "warmup_bars": 50,
    "commission_pct": 0.075,
    "slippage_pct": 0.0,
    # V2 improvements
    "min_bars_before_sl": 30,          # V3-F
    "be_after_tp1": True,
    "be_buffer_atr": 0.30,
    "min_signal_score": 0.60,
    "use_regime_filter": False,
    # V3 tiered sizing (currently a no-op — all trades get 1%)
    "use_tiered_sizing": True,
    "tier_thresholds": [0.60, 0.70, 0.80],
    "tier_risks": [0.010, 0.020, 0.030],
    # V3 features OFF
    "trail_after_tp2": False,
    "trail_after_tp2_atr": 2.0,
    "use_vol_filter": False,
    "vol_filter_percentile": 80.0,
    "vol_filter_lookback": 100,
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
    print(f"  {prefix} {r['label']:<55} {r['trades']:>4}t  {r['return_pct']:>+8.1f}%  "
          f"Sh {r['sharpe']:>5.2f}  DD {r['max_dd']:>5.1f}%  "
          f"WR {r['win_rate']:>5.1f}%  PF {r['pf']:>5.2f}  "
          f"Pay {r['payoff']:>5.2f}  E$ {r['expectancy']:>7.1f}")


def score(r):
    """Composite score: return * sharpe / max_dd."""
    if r is None:
        return -999
    return r["return_pct"] * max(r["sharpe"], 0.01) / max(r["max_dd"], 0.1)


def main():
    print("=" * 110)
    print("  OPTIMIZATION V4 — Fix Risk Calibration + Extend Parameters")
    print("=" * 110)

    df = load_data()
    print(f"  Data: {len(df)} bars\n")
    t0 = time.time()

    all_results = []

    # ── BASELINE (V3 as-is: effective 1% flat risk) ──
    print("  BASELINE (V3 winner — tiered sizing maps all trades to 1%):")
    base = run_test(df, V3_BASELINE, "BASELINE (V3)")
    print_result(base, highlight=True)
    all_results.append(base)

    # Track best per category
    cats = {"A": [], "B": [], "C1": [], "C2": []}

    # ═══════════════════════════════════════════════════════════
    # A. FLAT RISK CALIBRATION (tiered sizing OFF)
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*110}")
    print("  A. FLAT RISK CALIBRATION — Find optimal risk% (tiered sizing OFF)")
    print("     V3 effectively ran at 1% flat. Testing 1-3% range.")
    for risk in [0.010, 0.015, 0.020, 0.025, 0.030]:
        p = deepcopy(V3_BASELINE)
        p["use_tiered_sizing"] = False
        p["risk_pct"] = risk
        r = run_test(df, p, f"A: flat risk={risk:.1%}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_params"] = {"risk_pct": risk}
            cats["A"].append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # B. RECALIBRATED TIERED SIZING
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*110}")
    print("  B. RECALIBRATED TIERED SIZING — Lower min_signal_score, differentiate BOS vs CHoCH")
    print("     BOS+FVG=0.65 (continuation), CHoCH+FVG=0.55 (reversal)")

    tier_configs = [
        # (name, min_signal_score, thresholds, risks)
        ("B1: conservative",    0.50, [0.50, 0.55, 0.65], [0.010, 0.015, 0.025]),
        ("B2: wide spread",     0.50, [0.50, 0.55, 0.65], [0.010, 0.020, 0.030]),
        ("B3: aggressive floor",0.50, [0.50, 0.55, 0.65], [0.015, 0.020, 0.030]),
        ("B4: flat 2% +CHoCH",  0.50, None, None),  # flat 2% with CHoCH enabled
        ("B5: flat 2% BOS only",0.60, None, None),  # flat 2% without CHoCH (control)
        ("B6: 2-tier only",     0.50, [0.50, 0.65], [0.015, 0.025]),
        ("B7: heavy BOS",       0.50, [0.50, 0.55, 0.65], [0.010, 0.015, 0.035]),
    ]
    for name, min_score, thresholds, risks in tier_configs:
        p = deepcopy(V3_BASELINE)
        p["min_signal_score"] = min_score
        if thresholds is not None:
            p["use_tiered_sizing"] = True
            p["tier_thresholds"] = thresholds
            p["tier_risks"] = risks
        else:
            p["use_tiered_sizing"] = False
            p["risk_pct"] = 0.02
        r = run_test(df, p, name)
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_params"] = {
                "min_signal_score": min_score,
                "thresholds": thresholds,
                "risks": risks,
                "use_tiered": thresholds is not None,
            }
            cats["B"].append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # C1. EXTENDED min_bars_before_sl (beyond 30)
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*110}")
    print("  C1. EXTENDED MIN HOLD — Test min_bars beyond current edge of 30")
    for min_bars in [30, 35, 40, 45, 50]:
        p = deepcopy(V3_BASELINE)
        p["min_bars_before_sl"] = min_bars
        r = run_test(df, p, f"C1: min_bars={min_bars}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_params"] = {"min_bars": min_bars}
            cats["C1"].append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # C2. EXTENDED tp1_close_pct (below 20%)
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'─'*110}")
    print("  C2. EXTENDED TP1 CLOSE — Test tp1_close below current edge of 20%")
    for tp1_pct in [0.05, 0.10, 0.15, 0.20]:
        p = deepcopy(V3_BASELINE)
        p["tp1_close_pct"] = tp1_pct
        # Adjust TP2/TP3 to absorb the difference
        remain = 1.0 - tp1_pct
        p["tp2_close_pct"] = 0.30
        p["tp3_close_pct"] = remain - 0.30
        r = run_test(df, p, f"C2: tp1_close={tp1_pct:.0%} (tp3_close={remain-0.30:.0%})")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_params"] = {"tp1_close_pct": tp1_pct, "tp3_close_pct": remain - 0.30}
            cats["C2"].append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # BEST SINGLES
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*110}")
    print("  BEST INDIVIDUAL IMPROVEMENTS")
    print(f"{'='*110}")

    best_singles = {}
    for cat, results in sorted(cats.items()):
        if results:
            best = max(results, key=lambda x: x["_score"])
            best_singles[cat] = best
            print(f"  Best {cat}: {best['label']}")
            print_result(best, highlight=True)

    # ═══════════════════════════════════════════════════════════
    # COMBINATIONS — Best risk × Best C1 × Best C2
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*110}")
    print("  COMBINATIONS")
    print(f"{'='*110}")

    def build_override(cat, best_r):
        """Build param overrides from best result."""
        bp = best_r["_params"]
        if cat == "A":
            return {"use_tiered_sizing": False, "risk_pct": bp["risk_pct"]}
        elif cat == "B":
            overrides = {"min_signal_score": bp["min_signal_score"]}
            if bp["use_tiered"]:
                overrides.update({
                    "use_tiered_sizing": True,
                    "tier_thresholds": bp["thresholds"],
                    "tier_risks": bp["risks"],
                })
            else:
                overrides.update({"use_tiered_sizing": False, "risk_pct": 0.02})
            return overrides
        elif cat == "C1":
            return {"min_bars_before_sl": bp["min_bars"]}
        elif cat == "C2":
            return {"tp1_close_pct": bp["tp1_close_pct"], "tp3_close_pct": bp["tp3_close_pct"]}
        return {}

    overrides = {}
    for cat in best_singles:
        overrides[cat] = build_override(cat, best_singles[cat])

    combo_results = []

    # Determine best risk config: A or B
    best_risk_cat = None
    best_risk_score = -999
    for cat in ["A", "B"]:
        if cat in best_singles and best_singles[cat]["_score"] > best_risk_score:
            best_risk_score = best_singles[cat]["_score"]
            best_risk_cat = cat
    print(f"\n  Best risk config: {best_risk_cat} → {best_singles[best_risk_cat]['label']}")

    # Test combinations
    combo_configs = []

    # Best risk × C1
    if "C1" in overrides:
        combo_configs.append((f"{best_risk_cat}+C1", [best_risk_cat, "C1"]))
    # Best risk × C2
    if "C2" in overrides:
        combo_configs.append((f"{best_risk_cat}+C2", [best_risk_cat, "C2"]))
    # Best risk × C1 × C2
    if "C1" in overrides and "C2" in overrides:
        combo_configs.append((f"{best_risk_cat}+C1+C2", [best_risk_cat, "C1", "C2"]))
    # C1 × C2 alone (keep V3 risk)
    if "C1" in overrides and "C2" in overrides:
        combo_configs.append(("C1+C2 (V3 risk)", ["C1", "C2"]))

    # Also test both A and B with C1+C2 if they differ
    other_risk = "B" if best_risk_cat == "A" else "A"
    if other_risk in overrides and "C1" in overrides and "C2" in overrides:
        combo_configs.append((f"{other_risk}+C1+C2", [other_risk, "C1", "C2"]))

    print(f"\n  COMBO TESTS:")
    for name, cat_list in combo_configs:
        p = deepcopy(V3_BASELINE)
        for c in cat_list:
            p.update(overrides[c])
        r = run_test(df, p, f"COMBO: {name}")
        print_result(r)
        if r:
            r["_score"] = score(r)
            r["_combo"] = name
            r["_cat_list"] = cat_list
            combo_results.append(r)
            all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # FINE-TUNE AROUND BEST COMBO
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*110}")
    print("  FINE-TUNING AROUND BEST COMBO")
    print(f"{'='*110}")

    # Find best so far (excluding baseline)
    non_base = [r for r in all_results if r and r["label"] != "BASELINE (V3)"]
    if non_base:
        best_so_far = max(non_base, key=lambda x: x["_score"])
        print(f"  Best so far: {best_so_far['label']}")
        print_result(best_so_far, highlight=True)

        # Fine-tune risk around best
        best_risk = best_so_far.get("_params", {}).get("risk_pct", 0.02)
        if best_risk > 0:
            print(f"\n  Fine-tuning risk around {best_risk:.1%}:")
            for delta in [-0.003, -0.002, -0.001, 0.001, 0.002, 0.003]:
                trial_risk = best_risk + delta
                if trial_risk < 0.005 or trial_risk > 0.04:
                    continue
                p = deepcopy(V3_BASELINE)
                # Apply best combo overrides
                if "_cat_list" in best_so_far:
                    for c in best_so_far["_cat_list"]:
                        p.update(overrides[c])
                elif "_params" in best_so_far:
                    bp = best_so_far["_params"]
                    if "risk_pct" in bp:
                        p["use_tiered_sizing"] = False
                p["risk_pct"] = trial_risk
                p["use_tiered_sizing"] = False
                r = run_test(df, p, f"FINE: risk={trial_risk:.3f}")
                print_result(r)
                if r:
                    r["_score"] = score(r)
                    r["_params"] = {"risk_pct": trial_risk}
                    all_results.append(r)

    # ═══════════════════════════════════════════════════════════
    # D. SLIPPAGE STRESS TEST
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*110}")
    print("  D. SLIPPAGE STRESS TEST — Profit durability under execution friction")
    print(f"{'='*110}")

    # Use the overall best config for slippage testing
    valid = [r for r in all_results if r]
    for r in valid:
        r["_score"] = score(r)
    valid.sort(key=lambda x: -x["_score"])
    v4_candidate = valid[0] if valid[0]["label"] != "BASELINE (V3)" else (valid[1] if len(valid) > 1 else valid[0])

    # Reconstruct best params
    best_params = deepcopy(V3_BASELINE)
    if "_cat_list" in v4_candidate:
        for c in v4_candidate["_cat_list"]:
            if c in overrides:
                best_params.update(overrides[c])
    elif "_params" in v4_candidate:
        bp = v4_candidate["_params"]
        if "risk_pct" in bp:
            best_params["use_tiered_sizing"] = False
            best_params["risk_pct"] = bp["risk_pct"]
        if "min_signal_score" in bp:
            best_params["min_signal_score"] = bp["min_signal_score"]
        if bp.get("use_tiered") and bp.get("thresholds"):
            best_params["use_tiered_sizing"] = True
            best_params["tier_thresholds"] = bp["thresholds"]
            best_params["tier_risks"] = bp["risks"]
        if "min_bars" in bp:
            best_params["min_bars_before_sl"] = bp["min_bars"]
        if "tp1_close_pct" in bp:
            best_params["tp1_close_pct"] = bp["tp1_close_pct"]
            best_params["tp3_close_pct"] = bp["tp3_close_pct"]

    print(f"\n  Testing slippage on: {v4_candidate['label']}")
    for slippage in [0, 0.01, 0.02, 0.03, 0.05]:
        p = deepcopy(best_params)
        p["slippage_pct"] = slippage
        r = run_test(df, p, f"SLIP: {slippage:.2f}% ({slippage*2:.2f}% round-trip)")
        print_result(r)

    # ═══════════════════════════════════════════════════════════
    # OVERALL RANKING
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*110}")
    print("  OVERALL TOP 15 (all configurations, 0% slippage)")
    print(f"{'='*110}")

    valid = [r for r in all_results if r]
    for r in valid:
        r["_score"] = score(r)
    valid.sort(key=lambda x: -x["_score"])

    for r in valid[:15]:
        is_baseline = r["label"] == "BASELINE (V3)"
        print_result(r, highlight=is_baseline)

    # ═══════════════════════════════════════════════════════════
    # WALK-FORWARD VALIDATION — Top 3
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*110}")
    print("  WALK-FORWARD VALIDATION — Top 3 Configs")
    print(f"{'='*110}")

    wf_results = []
    for rank, r in enumerate(valid[:3], 1):
        label = r["label"]
        print(f"\n  #{rank}: {label}")

        p = deepcopy(V3_BASELINE)

        # Reconstruct params
        if "_cat_list" in r:
            for c in r["_cat_list"]:
                if c in overrides:
                    p.update(overrides[c])
        elif "_params" in r:
            bp = r["_params"]
            if "risk_pct" in bp:
                p["use_tiered_sizing"] = False
                p["risk_pct"] = bp["risk_pct"]
            if "min_signal_score" in bp:
                p["min_signal_score"] = bp["min_signal_score"]
            if bp.get("use_tiered") and bp.get("thresholds"):
                p["use_tiered_sizing"] = True
                p["tier_thresholds"] = bp["thresholds"]
                p["tier_risks"] = bp["risks"]
            if "min_bars" in bp:
                p["min_bars_before_sl"] = bp["min_bars"]
            if "tp1_close_pct" in bp:
                p["tp1_close_pct"] = bp["tp1_close_pct"]
                p["tp3_close_pct"] = bp["tp3_close_pct"]

        try:
            wf = walk_forward_test(df, p, n_folds=5, train_pct=0.6)
            for fold in wf["folds"]:
                status = "PASS" if fold["test_profitable"] else "FAIL"
                print(f"    Fold {fold['fold']}: "
                      f"train {fold['train_trades']}t ({fold['train_return_pct']:+.1f}%) | "
                      f"test {fold['test_trades']}t ({fold['test_return_pct']:+.1f}%) [{status}]")
            print(f"    Pass rate: {wf['passing_folds']}/{wf['total_folds']} "
                  f"| Avg OOS: {wf['avg_test_return_pct']:+.2f}%")
            wf_results.append((label, wf))
        except Exception as e:
            print(f"    WF ERROR: {e}")

    # ═══════════════════════════════════════════════════════════
    # V3 vs V4 COMPARISON
    # ═══════════════════════════════════════════════════════════
    print(f"\n{'='*110}")
    print("  V3 vs V4 COMPARISON")
    print(f"{'='*110}")

    v4_winner = valid[0] if valid and valid[0]["label"] != "BASELINE (V3)" else (valid[1] if len(valid) > 1 else None)
    if base and v4_winner:
        print(f"\n  {'Metric':<20} {'V3':>12} {'V4':>12} {'Delta':>12}")
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
            ("net_profit", "Net Profit $"),
        ]:
            v3_val = base[key]
            v4_val = v4_winner[key]
            delta = v4_val - v3_val
            print(f"  {label:<20} {v3_val:>12.2f} {v4_val:>12.2f} {delta:>+12.2f}")

        print(f"\n  V4 Winner: {v4_winner['label']}")

    elapsed = time.time() - t0
    print(f"\n  Total time: {elapsed:.0f}s")


if __name__ == "__main__":
    main()
