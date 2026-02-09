"""
Strategy Validation Suite — Additional robustness checks for the winning strategy.

Tests:
1. Multi-asset generalization (ETH, SOL) — does MS+FVG logic work beyond BTC?
2. Monte Carlo simulation — shuffle trade PnLs 10,000 times, check max DD distribution
3. Sensitivity analysis — vary swing_lookback and SL/TP parameters
4. Out-of-sample recent data — test on most recent 3 months unseen data

Run: python3 validate_strategy.py
"""

import numpy as np
import pandas as pd
from pathlib import Path
from copy import deepcopy
import time

from data_fetcher import load_csv
from backtester import Backtester, format_metrics, walk_forward_test
from stake_manager import SizingMethod

DATA_DIR = Path(__file__).parent / "data"

# Winning strategy config
WINNER_PARAMS = {
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
    # V2 improvements
    "min_bars_before_sl": 19,
    "be_after_tp1": True,
    "be_buffer_atr": 0.30,
    "min_signal_score": 0.60,
    "warmup_bars": 50,
    "commission_pct": 0.075,
}


def load_data(symbol: str, interval: str = "1h") -> pd.DataFrame:
    """Load data for a given symbol and interval."""
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


# ═══════════════════════════════════════════════════════════════
# 1. MULTI-ASSET GENERALIZATION
# ═══════════════════════════════════════════════════════════════

def test_multi_asset():
    """Test winning strategy on ETH and SOL to check generalization."""
    print(f"\n{'='*70}")
    print(f"  TEST 1: MULTI-ASSET GENERALIZATION")
    print(f"{'='*70}")
    print(f"  Does MS+FVG logic work beyond BTC?")
    print()

    results = {}
    for symbol in ["BTCUSDT", "ETHUSDT", "SOLUSDT"]:
        try:
            df = load_data(symbol)
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
            print(f"\n  {symbol}: SKIP — {e}")

    # Summary comparison
    print(f"\n  {'─'*60}")
    print(f"  MULTI-ASSET COMPARISON")
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
                      if not s.endswith("_wf") and m.get("total_return_pct", 0) > 0)
    total_assets = sum(1 for s in results if not s.endswith("_wf"))
    print(f"\n  VERDICT: Profitable on {generalizes}/{total_assets} assets "
          f"{'— GENERALIZES' if generalizes >= 2 else '— BTC-SPECIFIC'}")

    return results


# ═══════════════════════════════════════════════════════════════
# 2. MONTE CARLO SIMULATION
# ═══════════════════════════════════════════════════════════════

def test_monte_carlo(n_simulations: int = 10_000):
    """Shuffle trade PnLs to estimate max DD distribution and confidence intervals."""
    print(f"\n{'='*70}")
    print(f"  TEST 2: MONTE CARLO SIMULATION ({n_simulations:,} shuffles)")
    print(f"{'='*70}")
    print(f"  Randomly reorder trades to test if results depend on lucky sequencing.")
    print()

    # First run the strategy to get actual trades
    df = load_data("BTCUSDT")
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

    # Probability of ruin (losing 25%+ of capital)
    ruin_pct = (sim_max_dds >= 25).mean() * 100
    bad_dd_pct = (sim_max_dds >= 15).mean() * 100
    print(f"\n  P(MaxDD >= 15%): {bad_dd_pct:.2f}%")
    print(f"  P(MaxDD >= 25%): {ruin_pct:.2f}%")

    # Probability of negative return
    neg_return_pct = (sim_returns < 0).mean() * 100
    print(f"  P(Negative return): {neg_return_pct:.2f}%")

    # Verdict
    median_dd = np.median(sim_max_dds)
    p95_dd = np.percentile(sim_max_dds, 95)
    is_robust = neg_return_pct < 5 and p95_dd < 25
    print(f"\n  VERDICT: {'ROBUST — low sequence risk' if is_robust else 'CAUTION — sensitive to trade ordering'}")

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
# 3. SENSITIVITY ANALYSIS
# ═══════════════════════════════════════════════════════════════

def test_sensitivity():
    """Vary key parameters to check how sensitive results are."""
    print(f"\n{'='*70}")
    print(f"  TEST 3: SENSITIVITY ANALYSIS")
    print(f"{'='*70}")
    print(f"  How stable are results when key parameters change slightly?")
    print()

    df = load_data("BTCUSDT")

    # Parameters to vary
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

                marker = " ◄ baseline" if val == WINNER_PARAMS.get(param) else ""
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

        # Compute sensitivity (how much does return change per unit param change)
        if len(results_for_param) >= 2:
            returns = [r["return"] for r in results_for_param]
            vals = [r["value"] for r in results_for_param]
            return_range = max(returns) - min(returns)
            best_val = vals[returns.index(max(returns))]
            print(f"  Return range: {return_range:.1f}pp | Best at: {best_val}")
            all_results[test_name] = results_for_param

    # Overall sensitivity verdict
    print(f"\n  {'─'*60}")
    print(f"  SENSITIVITY SUMMARY")
    print(f"  {'Parameter':<25} {'Return Range':>13} {'Stable?':>8}")
    print(f"  {'─'*60}")
    for test_name, results in all_results.items():
        returns = [r["return"] for r in results]
        return_range = max(returns) - min(returns)
        # Stable if range < 20% of baseline return
        baseline_return = abs(WINNER_PARAMS.get("initial_capital", 10000) * 0.476)  # ~47.6%
        is_stable = return_range < 20  # less than 20pp swing
        print(f"  {test_name:<25} {return_range:>12.1f}pp {'YES' if is_stable else 'NO':>8}")

    return all_results


# ═══════════════════════════════════════════════════════════════
# 4. OUT-OF-SAMPLE TEST (RECENT DATA)
# ═══════════════════════════════════════════════════════════════

def test_out_of_sample():
    """Split data: train on first 80%, test on last 20% (most recent)."""
    print(f"\n{'='*70}")
    print(f"  TEST 4: OUT-OF-SAMPLE TEST (Recent Data)")
    print(f"{'='*70}")
    print(f"  Train on older data, test on most recent unseen data.")
    print()

    df = load_data("BTCUSDT")
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
        print(f"\n  DEGRADATION ANALYSIS (Train → OOS):")
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
                print(f"    {name:<15} {train_val:>8.2f}{unit} → {test_val:>8.2f}{unit} ({change_pct:+.0f}%, {direction})")

    oos_profitable = tsm.get("total_return_pct", 0) > 0
    print(f"\n  VERDICT: {'OOS PROFITABLE — strategy holds on unseen data' if oos_profitable else 'OOS UNPROFITABLE — possible overfit'}")

    return {
        "train_metrics": tm,
        "test_metrics": tsm,
        "oos_profitable": oos_profitable,
    }


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  STRATEGY VALIDATION SUITE                                 ║")
    print("║  BTC 1H MS+FVG (No Trailing) — Robustness Testing         ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    start = time.time()

    # Run all tests
    oos_results = test_out_of_sample()
    mc_results = test_monte_carlo()
    sensitivity_results = test_sensitivity()
    multi_results = test_multi_asset()

    total_time = time.time() - start

    # ── FINAL SUMMARY ──
    print(f"\n\n{'═'*70}")
    print(f"  VALIDATION SUMMARY")
    print(f"{'═'*70}")
    print(f"  Total time: {total_time:.0f}s\n")

    checks = []

    # OOS check
    oos_pass = oos_results["oos_profitable"]
    checks.append(("Out-of-Sample profitable", oos_pass))

    # Monte Carlo checks
    mc_pass = mc_results["prob_negative"] < 5
    checks.append(("Monte Carlo P(loss) < 5%", mc_pass))

    mc_dd_pass = mc_results["p95_dd"] < 25
    checks.append(("Monte Carlo 95th DD < 25%", mc_dd_pass))

    # Multi-asset check
    multi_profitable = sum(1 for s, m in multi_results.items()
                          if not s.endswith("_wf") and isinstance(m, dict) and m.get("total_return_pct", 0) > 0)
    multi_total = sum(1 for s in multi_results if not s.endswith("_wf"))
    multi_pass = multi_profitable >= 2
    checks.append((f"Profitable on {multi_profitable}/{multi_total} assets", multi_pass))

    # Sensitivity check (return positive for all SL values)
    if "SL Multiplier" in sensitivity_results:
        sl_returns = [r["return"] for r in sensitivity_results["SL Multiplier"]]
        sl_stable = sum(1 for r in sl_returns if r > 0) >= len(sl_returns) * 0.6
        checks.append(("SL sensitivity: profitable at 60%+ values", sl_stable))

    print(f"  {'Check':<45} {'Result':>8}")
    print(f"  {'─'*55}")
    for check_name, passed in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  {check_name:<45} {status:>8}")

    total_pass = sum(1 for _, p in checks if p)
    total_checks = len(checks)
    print(f"\n  Overall: {total_pass}/{total_checks} checks passed")

    if total_pass == total_checks:
        print(f"\n  STRATEGY IS ROBUST — all validation checks passed.")
    elif total_pass >= total_checks * 0.6:
        print(f"\n  STRATEGY IS ACCEPTABLE — most checks passed, some concerns.")
    else:
        print(f"\n  STRATEGY HAS ISSUES — significant validation failures.")
