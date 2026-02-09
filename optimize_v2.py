"""
Optimization V2 — Test all 4 improvements individually and in combination.

Improvements:
  A. min_bars_before_sl — suppress SL for first N bars
  B. be_after_tp1 — move SL to breakeven after TP1
  C. min_signal_score — filter weak signals
  D. use_regime_filter — skip ranging markets

Tests each individually with parameter sweeps, then tests all 2/3/4-way combos.
"""

import time
from itertools import product
from copy import deepcopy
from pathlib import Path

import numpy as np
import pandas as pd

from backtester import Backtester, walk_forward_test
from stake_manager import SizingMethod

DATA_DIR = Path(__file__).parent / "data"

# Baseline: winning config (no improvements)
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
    # All improvements off
    "min_bars_before_sl": 0,
    "be_after_tp1": False,
    "be_buffer_atr": 0.1,
    "min_signal_score": 0.0,
    "use_regime_filter": False,
    "regime_lookback": 50,
    "regime_min_er": 0.03,
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
        return None


def print_result(r, highlight=False):
    if r is None:
        return
    prefix = ">>>" if highlight else "   "
    print(f"  {prefix} {r['label']:<45} {r['trades']:>4}t  {r['return_pct']:>+7.1f}%  "
          f"Sh {r['sharpe']:>5.2f}  DD {r['max_dd']:>5.1f}%  "
          f"WR {r['win_rate']:>5.1f}%  PF {r['pf']:>5.2f}  "
          f"Pay {r['payoff']:>5.2f}  Cal {r['calmar']:>5.2f}")


def main():
    print("=" * 90)
    print("  OPTIMIZATION V2 — Testing All Improvements")
    print("=" * 90)

    df = load_data()
    print(f"  Data: {len(df)} bars\n")
    t0 = time.time()

    all_results = []

    # ── BASELINE ──
    print("  BASELINE (no improvements):")
    base = run_test(df, BASELINE, "BASELINE")
    print_result(base, highlight=True)
    all_results.append(base)

    # ═════════════════════════════════════════════════════════
    # A. MIN BARS BEFORE SL
    # ═════════════════════════════════════════════════════════
    print(f"\n{'─'*90}")
    print("  A. MIN BARS BEFORE SL (suppress stop loss for first N bars)")
    for n_bars in [3, 5, 7, 10, 15]:
        p = deepcopy(BASELINE)
        p["min_bars_before_sl"] = n_bars
        r = run_test(df, p, f"A: min_bars_sl={n_bars}")
        print_result(r)
        if r:
            all_results.append(r)

    # ═════════════════════════════════════════════════════════
    # B. BREAKEVEN AFTER TP1
    # ═════════════════════════════════════════════════════════
    print(f"\n{'─'*90}")
    print("  B. BREAKEVEN STOP AFTER TP1")
    for buf in [0.0, 0.05, 0.1, 0.2, 0.3]:
        p = deepcopy(BASELINE)
        p["be_after_tp1"] = True
        p["be_buffer_atr"] = buf
        r = run_test(df, p, f"B: BE after TP1 (buf={buf})")
        print_result(r)
        if r:
            all_results.append(r)

    # ═════════════════════════════════════════════════════════
    # C. MIN SIGNAL SCORE
    # ═════════════════════════════════════════════════════════
    print(f"\n{'─'*90}")
    print("  C. MIN SIGNAL SCORE FILTER")
    for score in [0.50, 0.55, 0.60, 0.65, 0.70]:
        p = deepcopy(BASELINE)
        p["min_signal_score"] = score
        r = run_test(df, p, f"C: min_score={score}")
        print_result(r)
        if r:
            all_results.append(r)

    # ═════════════════════════════════════════════════════════
    # D. REGIME FILTER
    # ═════════════════════════════════════════════════════════
    print(f"\n{'─'*90}")
    print("  D. REGIME FILTER (Efficiency Ratio)")
    for er_thresh in [0.02, 0.03, 0.05, 0.07, 0.10]:
        for lb in [30, 50]:
            p = deepcopy(BASELINE)
            p["use_regime_filter"] = True
            p["regime_lookback"] = lb
            p["regime_min_er"] = er_thresh
            r = run_test(df, p, f"D: ER>{er_thresh} lb={lb}")
            print_result(r)
            if r:
                all_results.append(r)

    # ═════════════════════════════════════════════════════════
    # BEST SINGLES — find top from each category
    # ═════════════════════════════════════════════════════════
    print(f"\n{'='*90}")
    print("  BEST INDIVIDUAL IMPROVEMENTS")
    print(f"{'='*90}")

    cats = {"A": [], "B": [], "C": [], "D": []}
    for r in all_results:
        if r and r["label"] != "BASELINE":
            cat = r["label"][0]
            if cat in cats:
                cats[cat].append(r)

    best_singles = {}
    for cat, results in cats.items():
        if results:
            # Rank by composite: return * sharpe / max_dd
            for r in results:
                r["_score"] = r["return_pct"] * max(r["sharpe"], 0.01) / max(r["max_dd"], 0.1)
            best = max(results, key=lambda x: x["_score"])
            best_singles[cat] = best
            print(f"  Best {cat}: {best['label']}")
            print_result(best, highlight=True)

    # ═════════════════════════════════════════════════════════
    # COMBINATIONS — 2-way, 3-way, 4-way
    # ═════════════════════════════════════════════════════════
    print(f"\n{'='*90}")
    print("  COMBINATIONS")
    print(f"{'='*90}")

    # Extract best params for each improvement
    best_a_bars = 0
    best_b_buf = 0.1
    best_c_score = 0.0
    best_d_er = 0.03
    best_d_lb = 50

    for r in cats.get("A", []):
        if r == best_singles.get("A"):
            best_a_bars = int(r["label"].split("=")[1])
    for r in cats.get("B", []):
        if r == best_singles.get("B"):
            best_b_buf = float(r["label"].split("buf=")[1].rstrip(")"))
    for r in cats.get("C", []):
        if r == best_singles.get("C"):
            best_c_score = float(r["label"].split("=")[1])
    for r in cats.get("D", []):
        if r == best_singles.get("D"):
            parts = r["label"].split()
            best_d_er = float(parts[1].split(">")[1])
            best_d_lb = int(parts[2].split("=")[1])

    print(f"  Using best params: A={best_a_bars}, B_buf={best_b_buf}, C={best_c_score}, D_er={best_d_er} lb={best_d_lb}")

    # All 2-way combinations
    combos = {
        "A+B": {"min_bars_before_sl": best_a_bars, "be_after_tp1": True, "be_buffer_atr": best_b_buf},
        "A+C": {"min_bars_before_sl": best_a_bars, "min_signal_score": best_c_score},
        "A+D": {"min_bars_before_sl": best_a_bars, "use_regime_filter": True, "regime_min_er": best_d_er, "regime_lookback": best_d_lb},
        "B+C": {"be_after_tp1": True, "be_buffer_atr": best_b_buf, "min_signal_score": best_c_score},
        "B+D": {"be_after_tp1": True, "be_buffer_atr": best_b_buf, "use_regime_filter": True, "regime_min_er": best_d_er, "regime_lookback": best_d_lb},
        "C+D": {"min_signal_score": best_c_score, "use_regime_filter": True, "regime_min_er": best_d_er, "regime_lookback": best_d_lb},
    }

    # 3-way
    combos["A+B+C"] = {**combos["A+B"], "min_signal_score": best_c_score}
    combos["A+B+D"] = {**combos["A+B"], "use_regime_filter": True, "regime_min_er": best_d_er, "regime_lookback": best_d_lb}
    combos["A+C+D"] = {**combos["A+C"], "use_regime_filter": True, "regime_min_er": best_d_er, "regime_lookback": best_d_lb}
    combos["B+C+D"] = {**combos["B+C"], "use_regime_filter": True, "regime_min_er": best_d_er, "regime_lookback": best_d_lb}

    # 4-way
    combos["A+B+C+D"] = {
        "min_bars_before_sl": best_a_bars,
        "be_after_tp1": True, "be_buffer_atr": best_b_buf,
        "min_signal_score": best_c_score,
        "use_regime_filter": True, "regime_min_er": best_d_er, "regime_lookback": best_d_lb,
    }

    combo_results = []
    for name, overrides in combos.items():
        p = deepcopy(BASELINE)
        p.update(overrides)
        r = run_test(df, p, f"COMBO: {name}")
        print_result(r)
        if r:
            r["_score"] = r["return_pct"] * max(r["sharpe"], 0.01) / max(r["max_dd"], 0.1)
            combo_results.append(r)
            all_results.append(r)

    # ═════════════════════════════════════════════════════════
    # FINE-TUNE — Grid search around best combo
    # ═════════════════════════════════════════════════════════
    print(f"\n{'='*90}")
    print("  FINE-TUNING BEST COMBO")
    print(f"{'='*90}")

    # Find the best combo
    if combo_results:
        best_combo = max(combo_results, key=lambda x: x["_score"])
        print(f"  Best combo so far: {best_combo['label']}")
        print_result(best_combo, highlight=True)

        # Extract which improvements are in the best combo
        best_name = best_combo["label"].replace("COMBO: ", "")
        has_a = "A" in best_name
        has_b = "B" in best_name
        has_c = "C" in best_name
        has_d = "D" in best_name

        # Fine-tune around the best parameters
        print(f"\n  Fine-tuning parameters...")
        fine_tune_results = []

        # Grid around best values
        a_values = [best_a_bars - 2, best_a_bars, best_a_bars + 2, best_a_bars + 4] if has_a else [0]
        b_values = [max(0, best_b_buf - 0.05), best_b_buf, best_b_buf + 0.1, best_b_buf + 0.2] if has_b else [0.1]
        c_values = [max(0, best_c_score - 0.05), best_c_score, best_c_score + 0.05] if has_c else [0.0]
        d_values = [max(0.01, best_d_er - 0.01), best_d_er, best_d_er + 0.01] if has_d else [0.03]

        a_values = [max(0, v) for v in a_values]

        total_combos = len(a_values) * len(b_values) * len(c_values) * len(d_values)
        print(f"  Testing {total_combos} fine-tune combinations...")
        count = 0

        for a_val, b_val, c_val, d_val in product(a_values, b_values, c_values, d_values):
            count += 1
            p = deepcopy(BASELINE)
            if has_a:
                p["min_bars_before_sl"] = a_val
            if has_b:
                p["be_after_tp1"] = True
                p["be_buffer_atr"] = b_val
            if has_c:
                p["min_signal_score"] = c_val
            if has_d:
                p["use_regime_filter"] = True
                p["regime_min_er"] = d_val
                p["regime_lookback"] = best_d_lb

            label = f"FT: a={a_val} b={b_val:.2f} c={c_val:.2f} d={d_val:.3f}"
            r = run_test(df, p, label)
            if r:
                r["_score"] = r["return_pct"] * max(r["sharpe"], 0.01) / max(r["max_dd"], 0.1)
                r["_params"] = {"a": a_val, "b": b_val, "c": c_val, "d": d_val}
                fine_tune_results.append(r)
                all_results.append(r)

        # Top 10 fine-tuned
        fine_tune_results.sort(key=lambda x: -x["_score"])
        print(f"\n  TOP 10 FINE-TUNED CONFIGS:")
        for r in fine_tune_results[:10]:
            print_result(r)

        if fine_tune_results:
            winner = fine_tune_results[0]
            print(f"\n  WINNER:")
            print_result(winner, highlight=True)

    # ═════════════════════════════════════════════════════════
    # OVERALL RANKING
    # ═════════════════════════════════════════════════════════
    print(f"\n{'='*90}")
    print("  OVERALL TOP 15 (all configurations)")
    print(f"{'='*90}")

    for r in all_results:
        if r:
            r["_score"] = r["return_pct"] * max(r["sharpe"], 0.01) / max(r["max_dd"], 0.1)

    valid = [r for r in all_results if r]
    valid.sort(key=lambda x: -x["_score"])

    for r in valid[:15]:
        is_baseline = r["label"] == "BASELINE"
        print_result(r, highlight=is_baseline)

    # ═════════════════════════════════════════════════════════
    # WALK-FORWARD VALIDATION of top 3
    # ═════════════════════════════════════════════════════════
    print(f"\n{'='*90}")
    print("  WALK-FORWARD VALIDATION — Top 3 Configs")
    print(f"{'='*90}")

    for rank, r in enumerate(valid[:3], 1):
        label = r["label"]
        print(f"\n  #{rank}: {label}")

        # Reconstruct params
        p = deepcopy(BASELINE)
        if "FT:" in label:
            params_dict = r.get("_params", {})
            if params_dict.get("a", 0) > 0:
                p["min_bars_before_sl"] = params_dict["a"]
            if params_dict.get("b", 0) > 0:
                p["be_after_tp1"] = True
                p["be_buffer_atr"] = params_dict["b"]
            if params_dict.get("c", 0) > 0:
                p["min_signal_score"] = params_dict["c"]
            if params_dict.get("d", 0) > 0:
                p["use_regime_filter"] = True
                p["regime_min_er"] = params_dict["d"]
                p["regime_lookback"] = best_d_lb
        elif "COMBO:" in label:
            combo_name = label.replace("COMBO: ", "")
            if "A" in combo_name:
                p["min_bars_before_sl"] = best_a_bars
            if "B" in combo_name:
                p["be_after_tp1"] = True
                p["be_buffer_atr"] = best_b_buf
            if "C" in combo_name:
                p["min_signal_score"] = best_c_score
            if "D" in combo_name:
                p["use_regime_filter"] = True
                p["regime_min_er"] = best_d_er
                p["regime_lookback"] = best_d_lb
        elif "A:" in label:
            p["min_bars_before_sl"] = int(label.split("=")[1])
        elif "B:" in label:
            p["be_after_tp1"] = True
            p["be_buffer_atr"] = float(label.split("buf=")[1].rstrip(")"))
        elif "C:" in label:
            p["min_signal_score"] = float(label.split("=")[1])
        elif "D:" in label:
            parts = label.split()
            p["use_regime_filter"] = True
            p["regime_min_er"] = float(parts[1].split(">")[1])
            p["regime_lookback"] = int(parts[2].split("=")[1])

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

    elapsed = time.time() - t0
    print(f"\n  Total time: {elapsed:.0f}s")


if __name__ == "__main__":
    main()
