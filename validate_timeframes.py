"""
Multi-Timeframe Validation Suite — Test V5 strategy generalization to 15m/30m.

Tests if the winning 1H strategy parameters work on shorter timeframes
WITHOUT any parameter modification. If they pass, shorter timeframes
generate data 2-4x faster for parallel forward testing.

Run: python validate_timeframes.py
Prerequisites: Ensure 15m and 30m data exists for BTC, ETH, SOL.
  python data_fetcher.py --symbol BTCUSDT --interval 15m --start 2024-01-01
  python data_fetcher.py --symbol ETHUSDT --interval 15m --start 2024-01-01
  python data_fetcher.py --symbol SOLUSDT --interval 15m --start 2024-01-01
  python data_fetcher.py --symbol BTCUSDT --interval 30m --start 2024-01-01
  python data_fetcher.py --symbol ETHUSDT --interval 30m --start 2024-01-01
  python data_fetcher.py --symbol SOLUSDT --interval 30m --start 2024-01-01
"""

import numpy as np
import pandas as pd
from pathlib import Path
from copy import deepcopy
import time
import sys

from backtester import Backtester, format_metrics, walk_forward_test
from stake_manager import SizingMethod

DATA_DIR = Path(__file__).parent / "data"

# ═══════════════════════════════════════════════════════════════
# V5 WINNER_PARAMS — IDENTICAL to validate_strategy.py (DO NOT MODIFY)
# ═══════════════════════════════════════════════════════════════

WINNER_PARAMS = {
    # Capital & Risk
    "initial_capital": 10_000,
    "risk_pct": 0.03,                    # V5-C: 3% risk
    "sizing_method": SizingMethod.FIXED_FRACTIONAL,
    "max_position_pct": 0.80,            # V5-C: 80% position cap

    # Entry
    "use_market_structure": True,
    "use_fvg": True,
    "use_smc": False,
    "use_classic_pa": False,
    "min_confluence": 0.50,

    # Stop Loss
    "sl_atr_mult": 1.0,                 # V5-A: 1x ATR

    # Take Profits
    "tp1_atr_mult": 1.0,                # V5-B: 1x ATR
    "tp2_atr_mult": 4.0,
    "tp3_atr_mult": 6.0,
    "tp1_close_pct": 0.05,
    "tp2_close_pct": 0.30,
    "tp3_close_pct": 0.65,

    # Trailing — disabled
    "use_trailing": False,
    "trailing_atr_mult": 0,
    "trailing_activation_atr": 0,

    # V2 improvements
    "be_after_tp1": True,
    "be_buffer_atr": 0.30,
    "min_signal_score": 0.60,

    # V3+V4 improvements
    "min_bars_before_sl": 50,            # V4-B: was 19
    "use_tiered_sizing": False,

    # Execution
    "warmup_bars": 50,
    "commission_pct": 0.075,
    "slippage_pct": 0.02,               # V4: realistic BTC 1H slippage

    # Hard stop — catastrophic protection during SL suppression
    "use_hard_stop": True,
    "hard_stop_atr_mult": 15.0,
}

# ═══════════════════════════════════════════════════════════════
# 1H REFERENCE VALUES (from validate_strategy.py run — known baseline)
# ═══════════════════════════════════════════════════════════════

REFERENCE_1H = {
    "BTCUSDT": {
        "total_return_pct": 1093.0,
        "sharpe_ratio": 5.43,
        "max_drawdown_pct": 8.57,
        "win_rate": 0.85,
        "profit_factor": 12.75,
        "total_trades": 235,
    },
    "score": "5/5",
    "verdict": "ROBUST",
}

TIMEFRAMES = ["1h", "30m", "15m"]
SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]


# ═══════════════════════════════════════════════════════════════
# DATA LOADING & PREFLIGHT
# ═══════════════════════════════════════════════════════════════

def load_data(symbol: str, interval: str) -> pd.DataFrame:
    """Load data for a given symbol and interval. Picks largest matching file."""
    pattern = f"{symbol}_{interval}_*.csv"
    files = list(DATA_DIR.glob(pattern))
    if not files:
        raise FileNotFoundError(f"No data for {symbol} {interval}")
    filepath = max(files, key=lambda f: f.stat().st_size)
    df = pd.read_csv(filepath)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    print(f"  Loaded {symbol} {interval}: {len(df)} bars "
          f"({df['date'].iloc[0].strftime('%Y-%m-%d')} to {df['date'].iloc[-1].strftime('%Y-%m-%d')})")
    return df


def check_data_availability() -> bool:
    """Check which data files exist. Returns True if all critical data present."""
    print(f"\n  DATA AVAILABILITY CHECK")
    print(f"  {'Symbol':<12} {'Interval':<10} {'Status':<10} {'File'}")
    print(f"  {'─'*60}")

    all_ok = True
    missing_cmds = []

    for tf in TIMEFRAMES:
        for sym in SYMBOLS:
            pattern = f"{sym}_{tf}_*.csv"
            files = list(DATA_DIR.glob(pattern))
            if not files:
                print(f"  {sym:<12} {tf:<10} {'MISSING':<10} —")
                missing_cmds.append(f"  python data_fetcher.py --symbol {sym} --interval {tf} --start 2024-01-01")
                all_ok = False
            else:
                filepath = max(files, key=lambda f: f.stat().st_size)
                # Parse end date from filename
                name = filepath.stem
                parts = name.split("_to_")
                if len(parts) == 2:
                    try:
                        end_date = pd.to_datetime(parts[1])
                        days_old = (pd.Timestamp.now() - end_date).days
                        status = "OK" if days_old <= 30 else f"STALE ({days_old}d)"
                    except Exception:
                        status = "OK"
                else:
                    status = "OK"
                print(f"  {sym:<12} {tf:<10} {status:<10} {filepath.name}")

    if missing_cmds:
        print(f"\n  Missing data! Run these commands first:")
        for cmd in missing_cmds:
            print(cmd)

    return all_ok


# ═══════════════════════════════════════════════════════════════
# TEST 1: MULTI-ASSET GENERALIZATION
# ═══════════════════════════════════════════════════════════════

def test_multi_asset(interval: str) -> dict:
    """Test winning strategy on BTC/ETH/SOL for the given interval."""
    print(f"\n{'='*70}")
    print(f"  TEST 1: MULTI-ASSET GENERALIZATION ({interval})")
    print(f"{'='*70}")
    print(f"  Does MS+FVG logic work beyond BTC on {interval}?")
    print()

    results = {}
    for symbol in SYMBOLS:
        try:
            df = load_data(symbol, interval)
            bt = Backtester(**WINNER_PARAMS)
            result = bt.run(df)
            m = result["metrics"]
            results[symbol] = m

            print(f"\n  {symbol}:")
            print(f"    Trades:     {m['total_trades']}")
            print(f"    Return:     {m['total_return_pct']:+.2f}%")
            print(f"    Sharpe:     {m['sharpe_ratio']:.2f}")
            print(f"    Max DD:     {m['max_drawdown_pct']:.2f}%")
            print(f"    Win Rate:   {m['win_rate']*100:.1f}%")
            print(f"    PF:         {m['profit_factor']:.2f}")
            print(f"    Payoff:     {m['payoff_ratio']:.2f}")
            print(f"    Expectancy: ${m['expectancy']:.2f}")

            # Walk-forward on each asset
            print(f"    Walk-Forward (5 folds):")
            wf = walk_forward_test(df, WINNER_PARAMS, n_folds=5, train_pct=0.6)
            for fold in wf["folds"]:
                status = "PASS" if fold["test_profitable"] else "FAIL"
                print(f"      Fold {fold['fold']}: "
                      f"train {fold['train_trades']}t ({fold['train_return_pct']:+.1f}%) | "
                      f"test {fold['test_trades']}t ({fold['test_return_pct']:+.1f}%) [{status}]")
            print(f"    Pass Rate: {wf['passing_folds']}/{wf['total_folds']}")
            results[f"{symbol}_wf"] = wf

        except FileNotFoundError as e:
            print(f"\n  {symbol}: SKIP -- {e}")

    # Summary comparison
    print(f"\n  {'─'*60}")
    print(f"  MULTI-ASSET COMPARISON ({interval})")
    print(f"  {'Symbol':<12} {'Trades':>7} {'Return':>9} {'Sharpe':>8} {'MaxDD':>8} {'WR':>6} {'PF':>6} {'WF':>5}")
    print(f"  {'─'*60}")
    for symbol, m in results.items():
        if symbol.endswith("_wf"):
            continue
        wf = results.get(f"{symbol}_wf", {})
        wf_str = f"{wf.get('passing_folds', '?')}/{wf.get('total_folds', '?')}" if wf else "N/A"
        print(f"  {symbol:<12} {m['total_trades']:>7} {m['total_return_pct']:>+8.1f}% "
              f"{m['sharpe_ratio']:>8.2f} {m['max_drawdown_pct']:>7.1f}% "
              f"{m['win_rate']*100:>5.0f}% {m['profit_factor']:>6.2f} {wf_str:>5}")

    generalizes = sum(1 for s, m in results.items()
                      if not s.endswith("_wf") and isinstance(m, dict) and m.get("total_return_pct", 0) > 0)
    total_assets = sum(1 for s in results if not s.endswith("_wf"))
    print(f"\n  VERDICT: Profitable on {generalizes}/{total_assets} assets "
          f"{'-- GENERALIZES' if generalizes >= 2 else '-- BTC-SPECIFIC'}")

    return results


# ═══════════════════════════════════════════════════════════════
# TEST 2: MONTE CARLO SIMULATION
# ═══════════════════════════════════════════════════════════════

def test_monte_carlo(interval: str, n_simulations: int = 10_000) -> dict:
    """Shuffle trade PnLs to estimate max DD distribution and confidence intervals."""
    print(f"\n{'='*70}")
    print(f"  TEST 2: MONTE CARLO SIMULATION ({n_simulations:,} shuffles, {interval})")
    print(f"{'='*70}")
    print(f"  Randomly reorder trades to test if results depend on lucky sequencing.")
    print()

    df = load_data("BTCUSDT", interval)
    bt = Backtester(**WINNER_PARAMS)
    result = bt.run(df)
    trades = result["trades"]
    actual_metrics = result["metrics"]

    pnls = np.array([t.pnl for t in trades if t.pnl is not None])
    n_trades = len(pnls)
    initial_capital = WINNER_PARAMS["initial_capital"]

    print(f"  Actual strategy: {n_trades} trades, {actual_metrics['total_return_pct']:+.2f}% return, "
          f"{actual_metrics['max_drawdown_pct']:.2f}% max DD")
    print(f"  Shuffling trade order {n_simulations:,} times...")

    np.random.seed(42)

    sim_returns = np.zeros(n_simulations)
    sim_max_dds = np.zeros(n_simulations)
    sim_final_equity = np.zeros(n_simulations)

    t0 = time.time()
    for sim in range(n_simulations):
        shuffled = np.random.permutation(pnls)
        equity = initial_capital + np.cumsum(shuffled)
        equity = np.insert(equity, 0, initial_capital)

        running_max = np.maximum.accumulate(equity)
        drawdowns = (equity - running_max) / running_max * 100

        sim_returns[sim] = (equity[-1] - initial_capital) / initial_capital * 100
        sim_max_dds[sim] = abs(drawdowns.min())
        sim_final_equity[sim] = equity[-1]

    elapsed = time.time() - t0
    print(f"  Done in {elapsed:.1f}s")

    # Return distribution
    print(f"\n  RETURN DISTRIBUTION")
    percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99]
    for p in percentiles:
        val = np.percentile(sim_returns, p)
        print(f"    {p:>3}th percentile: {val:+.2f}%")

    print(f"\n  Mean return:   {sim_returns.mean():+.2f}%")
    print(f"  Std return:    {sim_returns.std():.2f}%")
    print(f"  Actual return: {actual_metrics['total_return_pct']:+.2f}% "
          f"(percentile: {(sim_returns <= actual_metrics['total_return_pct']).mean()*100:.1f}%)")

    # Max DD distribution
    print(f"\n  MAX DRAWDOWN DISTRIBUTION")
    dd_percentiles = [50, 75, 90, 95, 99]
    for p in dd_percentiles:
        val = np.percentile(sim_max_dds, p)
        print(f"    {p:>3}th percentile: {val:.2f}%")

    print(f"\n  Actual max DD:    {actual_metrics['max_drawdown_pct']:.2f}%")
    print(f"  Median MC max DD: {np.median(sim_max_dds):.2f}%")
    print(f"  95th pctile DD:   {np.percentile(sim_max_dds, 95):.2f}%")
    print(f"  99th pctile DD:   {np.percentile(sim_max_dds, 99):.2f}%")

    # Probability of ruin
    ruin_pct = (sim_max_dds >= 25).mean() * 100
    bad_dd_pct = (sim_max_dds >= 15).mean() * 100
    print(f"\n  P(MaxDD >= 15%): {bad_dd_pct:.2f}%")
    print(f"  P(MaxDD >= 25%): {ruin_pct:.2f}%")

    neg_return_pct = (sim_returns < 0).mean() * 100
    print(f"  P(Negative return): {neg_return_pct:.2f}%")

    # Verdict
    median_dd = np.median(sim_max_dds)
    p95_dd = np.percentile(sim_max_dds, 95)
    is_robust = neg_return_pct < 5 and p95_dd < 25
    print(f"\n  VERDICT: {'ROBUST -- low sequence risk' if is_robust else 'CAUTION -- sensitive to trade ordering'}")

    return {
        "n_simulations": n_simulations,
        "actual_return": actual_metrics["total_return_pct"],
        "actual_dd": actual_metrics["max_drawdown_pct"],
        "mean_return": sim_returns.mean(),
        "median_dd": median_dd,
        "p95_dd": p95_dd,
        "p99_dd": np.percentile(sim_max_dds, 99),
        "prob_negative": neg_return_pct,
        "prob_ruin_25": ruin_pct,
    }


# ═══════════════════════════════════════════════════════════════
# TEST 3: SENSITIVITY ANALYSIS
# ═══════════════════════════════════════════════════════════════

def test_sensitivity(interval: str) -> dict:
    """Vary key parameters to check how sensitive results are."""
    print(f"\n{'='*70}")
    print(f"  TEST 3: SENSITIVITY ANALYSIS ({interval})")
    print(f"{'='*70}")
    print(f"  How stable are results when key parameters change slightly?")
    print()

    df = load_data("BTCUSDT", interval)

    sensitivity_tests = {
        "SL Multiplier": {
            "param": "sl_atr_mult",
            "values": [1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
        },
        "TP1 Multiplier": {
            "param": "tp1_atr_mult",
            "values": [1.0, 1.5, 2.0, 2.5, 3.0],
        },
        "TP3 Multiplier": {
            "param": "tp3_atr_mult",
            "values": [4.0, 6.0, 8.0, 10.0, 12.0],
        },
        "Risk Percent": {
            "param": "risk_pct",
            "values": [0.01, 0.015, 0.02, 0.025, 0.03],
        },
        "Confluence Threshold": {
            "param": "min_confluence",
            "values": [0.25, 0.35, 0.50, 0.65, 0.75],
        },
    }

    all_results = {}

    for test_name, test_config in sensitivity_tests.items():
        param = test_config["param"]
        values = test_config["values"]

        print(f"\n  {test_name} ({param}):")
        print(f"  {'Value':<10} {'Trades':>7} {'Return':>9} {'Sharpe':>8} {'MaxDD':>8} {'WR':>6} {'PF':>6}")
        print(f"  {'─'*56}")

        results_for_param = []
        for val in values:
            params = deepcopy(WINNER_PARAMS)
            params[param] = val

            try:
                bt = Backtester(**params)
                result = bt.run(df)
                m = result["metrics"]

                marker = " << baseline" if val == WINNER_PARAMS.get(param) else ""
                print(f"  {val:<10.3f} {m['total_trades']:>7} {m['total_return_pct']:>+8.1f}% "
                      f"{m['sharpe_ratio']:>8.2f} {m['max_drawdown_pct']:>7.1f}% "
                      f"{m['win_rate']*100:>5.0f}% {m['profit_factor']:>6.2f}{marker}")

                results_for_param.append({
                    "value": val,
                    "return": m["total_return_pct"],
                    "sharpe": m["sharpe_ratio"],
                    "max_dd": m["max_drawdown_pct"],
                    "trades": m["total_trades"],
                    "pf": m["profit_factor"],
                })
            except Exception as e:
                print(f"  {val:<10.3f} ERROR: {e}")

        if len(results_for_param) >= 2:
            returns = [r["return"] for r in results_for_param]
            vals = [r["value"] for r in results_for_param]
            return_range = max(returns) - min(returns)
            best_val = vals[returns.index(max(returns))]
            print(f"  Return range: {return_range:.1f}pp | Best at: {best_val}")
            all_results[test_name] = results_for_param

    # Overall sensitivity verdict
    print(f"\n  {'─'*60}")
    print(f"  SENSITIVITY SUMMARY ({interval})")
    print(f"  {'Parameter':<25} {'Return Range':>13} {'Stable?':>8}")
    print(f"  {'─'*60}")
    for test_name, results in all_results.items():
        returns = [r["return"] for r in results]
        return_range = max(returns) - min(returns)
        is_stable = return_range < 20
        print(f"  {test_name:<25} {return_range:>12.1f}pp {'YES' if is_stable else 'NO':>8}")

    return all_results


# ═══════════════════════════════════════════════════════════════
# TEST 4: OUT-OF-SAMPLE TEST
# ═══════════════════════════════════════════════════════════════

def test_out_of_sample(interval: str) -> dict:
    """Split data: train on first 80%, test on last 20% (most recent)."""
    print(f"\n{'='*70}")
    print(f"  TEST 4: OUT-OF-SAMPLE TEST ({interval})")
    print(f"{'='*70}")
    print(f"  Train on older data, test on most recent unseen data.")
    print()

    df = load_data("BTCUSDT", interval)
    n = len(df)

    # 80/20 split
    split_idx = int(n * 0.80)
    train_df = df.iloc[:split_idx].reset_index(drop=True)
    test_df = df.iloc[split_idx:].reset_index(drop=True)

    train_start = df["date"].iloc[0].strftime("%Y-%m-%d")
    train_end = df["date"].iloc[split_idx - 1].strftime("%Y-%m-%d")
    test_start = df["date"].iloc[split_idx].strftime("%Y-%m-%d")
    test_end = df["date"].iloc[-1].strftime("%Y-%m-%d")

    print(f"  Train: {train_start} to {train_end} ({split_idx} bars)")
    print(f"  Test:  {test_start} to {test_end} ({n - split_idx} bars)")

    # Run on train
    bt_train = Backtester(**WINNER_PARAMS)
    train_result = bt_train.run(train_df)
    tm = train_result["metrics"]

    print(f"\n  TRAINING PERIOD:")
    print(f"    Trades:  {tm['total_trades']}")
    print(f"    Return:  {tm['total_return_pct']:+.2f}%")
    print(f"    Sharpe:  {tm['sharpe_ratio']:.2f}")
    print(f"    Max DD:  {tm['max_drawdown_pct']:.2f}%")
    print(f"    WR:      {tm['win_rate']*100:.1f}%")
    print(f"    PF:      {tm['profit_factor']:.2f}")

    # Run on test (out-of-sample)
    bt_test = Backtester(**WINNER_PARAMS)
    test_result = bt_test.run(test_df)
    tsm = test_result["metrics"]

    print(f"\n  OUT-OF-SAMPLE PERIOD:")
    print(f"    Trades:  {tsm['total_trades']}")
    print(f"    Return:  {tsm['total_return_pct']:+.2f}%")
    print(f"    Sharpe:  {tsm['sharpe_ratio']:.2f}")
    print(f"    Max DD:  {tsm['max_drawdown_pct']:.2f}%")
    print(f"    WR:      {tsm['win_rate']*100:.1f}%")
    print(f"    PF:      {tsm['profit_factor']:.2f}")

    # Degradation analysis
    if tm["total_trades"] > 0 and tsm["total_trades"] > 0:
        print(f"\n  DEGRADATION ANALYSIS (Train -> OOS):")
        metrics_compare = [
            ("Return", tm["total_return_pct"], tsm["total_return_pct"], "%"),
            ("Sharpe", tm["sharpe_ratio"], tsm["sharpe_ratio"], ""),
            ("Win Rate", tm["win_rate"]*100, tsm["win_rate"]*100, "%"),
            ("Profit Factor", tm["profit_factor"], tsm["profit_factor"], ""),
            ("Max DD", tm["max_drawdown_pct"], tsm["max_drawdown_pct"], "%"),
        ]

        for name, train_val, test_val, unit in metrics_compare:
            if train_val != 0:
                change_pct = (test_val - train_val) / abs(train_val) * 100
                direction = "improved" if (name != "Max DD" and change_pct > 0) or (name == "Max DD" and change_pct < 0) else "degraded"
                print(f"    {name:<15} {train_val:>8.2f}{unit} -> {test_val:>8.2f}{unit} ({change_pct:+.0f}%, {direction})")

    oos_profitable = tsm.get("total_return_pct", 0) > 0
    print(f"\n  VERDICT: {'OOS PROFITABLE -- strategy holds on unseen data' if oos_profitable else 'OOS UNPROFITABLE -- possible overfit'}")

    return {
        "train_metrics": tm,
        "test_metrics": tsm,
        "oos_profitable": oos_profitable,
    }


# ═══════════════════════════════════════════════════════════════
# VALIDATION CHECKS (5-check scoring)
# ═══════════════════════════════════════════════════════════════

def run_validation_checks(oos_results, mc_results, sensitivity_results, multi_results) -> tuple:
    """Run 5 standard checks. Returns (checks_list, pass_count)."""
    checks = []

    # 1. OOS profitable
    oos_pass = oos_results["oos_profitable"]
    checks.append(("Out-of-Sample profitable", oos_pass))

    # 2. Monte Carlo P(loss) < 5%
    mc_pass = mc_results["prob_negative"] < 5
    checks.append(("Monte Carlo P(loss) < 5%", mc_pass))

    # 3. Monte Carlo 95th DD < 25%
    mc_dd_pass = mc_results["p95_dd"] < 25
    checks.append(("Monte Carlo 95th DD < 25%", mc_dd_pass))

    # 4. Multi-asset 2+ profitable
    multi_profitable = sum(1 for s, m in multi_results.items()
                          if not s.endswith("_wf") and isinstance(m, dict) and m.get("total_return_pct", 0) > 0)
    multi_total = sum(1 for s in multi_results if not s.endswith("_wf"))
    multi_pass = multi_profitable >= 2
    checks.append((f"Profitable on {multi_profitable}/{multi_total} assets", multi_pass))

    # 5. SL sensitivity — profitable at 60%+ of SL values
    if "SL Multiplier" in sensitivity_results:
        sl_returns = [r["return"] for r in sensitivity_results["SL Multiplier"]]
        sl_stable = sum(1 for r in sl_returns if r > 0) >= len(sl_returns) * 0.6
        checks.append(("SL sensitivity: profitable at 60%+ values", sl_stable))

    pass_count = sum(1 for _, p in checks if p)
    return checks, pass_count


# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR — run full validation for one timeframe
# ═══════════════════════════════════════════════════════════════

def run_timeframe_validation(interval: str) -> dict:
    """Run full validation suite for one timeframe. Returns structured results."""
    print(f"\n{'#'*70}")
    print(f"  TIMEFRAME: {interval.upper()}")
    print(f"{'#'*70}")

    t0 = time.time()

    # Run all 4 tests (same order as validate_strategy.py)
    oos_results = test_out_of_sample(interval)
    mc_results = test_monte_carlo(interval)
    sensitivity_results = test_sensitivity(interval)
    multi_results = test_multi_asset(interval)

    elapsed = time.time() - t0

    # Run 5-check scoring
    checks, pass_count = run_validation_checks(oos_results, mc_results, sensitivity_results, multi_results)
    total_checks = len(checks)

    # Print checklist
    print(f"\n{'='*70}")
    print(f"  {interval.upper()} VALIDATION SUMMARY")
    print(f"{'='*70}")
    print(f"  Time: {elapsed:.0f}s\n")

    print(f"  {'Check':<45} {'Result':>8}")
    print(f"  {'─'*55}")
    for check_name, passed in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  {check_name:<45} {status:>8}")

    print(f"\n  Overall: {pass_count}/{total_checks} checks passed")

    if pass_count == total_checks:
        verdict = "ROBUST"
        print(f"\n  {interval.upper()} IS ROBUST -- all validation checks passed.")
    elif pass_count >= total_checks * 0.6:
        verdict = "ACCEPTABLE"
        print(f"\n  {interval.upper()} IS ACCEPTABLE -- most checks passed, some concerns.")
    else:
        verdict = "HAS ISSUES"
        print(f"\n  {interval.upper()} HAS ISSUES -- significant validation failures.")

    # Extract BTC metrics for comparison table
    btc_metrics = multi_results.get("BTCUSDT", {})

    return {
        "interval": interval,
        "elapsed": elapsed,
        "checks": checks,
        "pass_count": pass_count,
        "total_checks": total_checks,
        "verdict": verdict,
        "btc_return": btc_metrics.get("total_return_pct", 0),
        "btc_sharpe": btc_metrics.get("sharpe_ratio", 0),
        "btc_dd": btc_metrics.get("max_drawdown_pct", 0),
        "btc_wr": btc_metrics.get("win_rate", 0),
        "btc_pf": btc_metrics.get("profit_factor", 0),
        "btc_trades": btc_metrics.get("total_trades", 0),
        "eth_return": multi_results.get("ETHUSDT", {}).get("total_return_pct", 0),
        "sol_return": multi_results.get("SOLUSDT", {}).get("total_return_pct", 0),
        "oos": oos_results,
        "mc": mc_results,
        "sensitivity": sensitivity_results,
        "multi": multi_results,
    }


# ═══════════════════════════════════════════════════════════════
# COMPARISON TABLE & RECOMMENDATION
# ═══════════════════════════════════════════════════════════════

def print_comparison_table(results: list):
    """Print side-by-side comparison: 1H (reference) vs each tested timeframe."""
    print(f"\n{'='*70}")
    print(f"  CROSS-TIMEFRAME COMPARISON")
    print(f"{'='*70}")

    ref = REFERENCE_1H["BTCUSDT"]
    cols = ["1H (ref)"] + [r["interval"].upper() for r in results]
    n_cols = len(cols)

    # Header
    print(f"\n  {'Metric':<20}", end="")
    for c in cols:
        print(f" {c:>12}", end="")
    print()
    print(f"  {'─'*20}" + "─" * 13 * n_cols)

    # BTC Return
    print(f"  {'BTC Return':<20}", end="")
    print(f" {ref['total_return_pct']:>+11.1f}%", end="")
    for r in results:
        print(f" {r['btc_return']:>+11.1f}%", end="")
    print()

    # Sharpe
    print(f"  {'Sharpe':<20}", end="")
    print(f" {ref['sharpe_ratio']:>12.2f}", end="")
    for r in results:
        print(f" {r['btc_sharpe']:>12.2f}", end="")
    print()

    # Max DD
    print(f"  {'Max DD':<20}", end="")
    print(f" {ref['max_drawdown_pct']:>11.2f}%", end="")
    for r in results:
        print(f" {r['btc_dd']:>11.2f}%", end="")
    print()

    # Win Rate
    print(f"  {'Win Rate':<20}", end="")
    print(f" {ref['win_rate']*100:>11.0f}%", end="")
    for r in results:
        print(f" {r['btc_wr']*100:>11.0f}%", end="")
    print()

    # Profit Factor
    print(f"  {'Profit Factor':<20}", end="")
    print(f" {ref['profit_factor']:>12.2f}", end="")
    for r in results:
        print(f" {r['btc_pf']:>12.2f}", end="")
    print()

    # Trade Count
    print(f"  {'Trades':<20}", end="")
    print(f" {ref['total_trades']:>12}", end="")
    for r in results:
        print(f" {r['btc_trades']:>12}", end="")
    print()

    # ETH Return
    print(f"  {'ETH Return':<20}", end="")
    print(f" {'—':>12}", end="")
    for r in results:
        print(f" {r['eth_return']:>+11.1f}%", end="")
    print()

    # SOL Return
    print(f"  {'SOL Return':<20}", end="")
    print(f" {'—':>12}", end="")
    for r in results:
        print(f" {r['sol_return']:>+11.1f}%", end="")
    print()

    # OOS
    print(f"  {'OOS Profitable?':<20}", end="")
    print(f" {'YES':>12}", end="")
    for r in results:
        oos_pass = r["oos"]["oos_profitable"]
        print(f" {'YES' if oos_pass else 'NO':>12}", end="")
    print()

    # MC Robust
    print(f"  {'MC Robust?':<20}", end="")
    print(f" {'YES':>12}", end="")
    for r in results:
        mc_ok = r["mc"]["prob_negative"] < 5 and r["mc"]["p95_dd"] < 25
        print(f" {'YES' if mc_ok else 'NO':>12}", end="")
    print()

    # Score
    print(f"  {'Score':<20}", end="")
    print(f" {REFERENCE_1H['score']:>12}", end="")
    for r in results:
        print(f" {r['pass_count']}/{r['total_checks']:>11}", end="")
    print()

    # Verdict
    print(f"  {'Verdict':<20}", end="")
    print(f" {REFERENCE_1H['verdict']:>12}", end="")
    for r in results:
        print(f" {r['verdict']:>12}", end="")
    print()


def print_recommendation(results: list):
    """Print final GO/NO-GO recommendation per timeframe."""
    print(f"\n{'='*70}")
    print(f"  RECOMMENDATION")
    print(f"{'='*70}")

    for r in results:
        tf = r["interval"].upper()
        score = r["pass_count"]
        total = r["total_checks"]
        verdict = r["verdict"]
        sharpe = r["btc_sharpe"]
        pf = r["btc_pf"]

        # GO conditions: 3+/5 checks AND Sharpe >= 1.0 AND PF >= 1.5
        go = (score >= 3 and sharpe >= 1.0 and pf >= 1.5)
        # MARGINAL: 3+/5 but metrics borderline
        marginal = (score >= 3 and not go)

        if go:
            speed = "4x" if r["interval"] == "15m" else "2x"
            print(f"\n  {tf}: GO -- Launch parallel forward test")
            print(f"    Score {score}/{total} ({verdict}), Sharpe {sharpe:.2f}, PF {pf:.2f}")
            print(f"    Expected data generation: {speed} faster than 1H")
        elif marginal:
            print(f"\n  {tf}: MARGINAL -- Review metrics before deciding")
            print(f"    Score {score}/{total} ({verdict}), Sharpe {sharpe:.2f}, PF {pf:.2f}")
            if sharpe < 1.0:
                print(f"    Concern: Sharpe {sharpe:.2f} below 1.0")
            if pf < 1.5:
                print(f"    Concern: Profit Factor {pf:.2f} below 1.5")
        else:
            print(f"\n  {tf}: NO-GO -- Do not launch forward test")
            print(f"    Score {score}/{total} ({verdict}), Sharpe {sharpe:.2f}, PF {pf:.2f}")
            reasons = []
            if score < 3:
                reasons.append(f"Only {score}/{total} checks passed (need 3+)")
            if sharpe < 1.0:
                reasons.append(f"Sharpe {sharpe:.2f} below 1.0")
            if pf < 1.5:
                reasons.append(f"Profit Factor {pf:.2f} below 1.5")
            for reason in reasons:
                print(f"    Reason: {reason}")

    # Final summary
    go_tfs = [r["interval"] for r in results
              if r["pass_count"] >= 3 and r["btc_sharpe"] >= 1.0 and r["btc_pf"] >= 1.5]
    if go_tfs:
        best = go_tfs[0]  # prefer shortest timeframe (15m listed first)
        print(f"\n  NEXT STEP: Launch {best.upper()} parallel forward test.")
        print(f"  The 1H forward test continues untouched.")
    else:
        print(f"\n  NEXT STEP: Stay with 1H forward test only.")
        print(f"  V5 strategy is 1H-specific. Wait for 1H results (4-6 weeks).")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("+=" * 35 + "+")
    print("|  MULTI-TIMEFRAME VALIDATION SUITE                              |")
    print("|  V5 MS+FVG Strategy -- Testing 15m & 30m Generalization        |")
    print("|  Parameters: IDENTICAL to 1H (zero modifications)              |")
    print("+=" * 35 + "+")

    start = time.time()

    # Phase 0: Data availability check
    all_data_ok = check_data_availability()
    if not all_data_ok:
        print("\n  WARNING: Some data files are missing or stale.")
        print("  Continuing with available data (missing assets will be skipped).\n")

    # Phase 1: Run validation per timeframe
    all_results = []
    for tf in TIMEFRAMES:
        # Check if at least BTC data exists for this timeframe
        btc_pattern = f"BTCUSDT_{tf}_*.csv"
        btc_files = list(DATA_DIR.glob(btc_pattern))
        if not btc_files:
            print(f"\n  SKIPPING {tf}: No BTC data available.")
            print(f"  Run: python data_fetcher.py --symbol BTCUSDT --interval {tf} --start 2024-01-01")
            continue

        try:
            result = run_timeframe_validation(tf)
            all_results.append(result)
        except Exception as e:
            print(f"\n  ERROR running {tf} validation: {e}")
            import traceback
            traceback.print_exc()

    total_time = time.time() - start
    print(f"\n  Total validation time: {total_time:.0f}s")

    # Phase 2: Comparison table & recommendation
    if all_results:
        print_comparison_table(all_results)
        print_recommendation(all_results)
    else:
        print("\n  No timeframes could be validated. Ensure data is downloaded first.")
