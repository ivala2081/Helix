"""
Master Test Runner — Tests all PA approaches across all timeframes
with all adaptation methods. Compares results and identifies the best
strategy configuration.

Run: python3 run_tests.py
"""

import time
import sys
from pathlib import Path
from itertools import product

import numpy as np
import pandas as pd

from data_fetcher import load_csv
from backtester import Backtester, format_metrics, walk_forward_test
from adaptation import run_adaptive_backtest
from stake_manager import SizingMethod

DATA_DIR = Path(__file__).parent / "data"
REPORT_DIR = Path(__file__).parent / "reports"


# ═══════════════════════════════════════════════════════════════
# CONFIGURATION MATRIX
# ═══════════════════════════════════════════════════════════════

TIMEFRAMES = ["15m", "30m", "1h"]

# Indicator system combinations to test
INDICATOR_CONFIGS = {
    "MS_only": {
        "use_market_structure": True, "use_fvg": False,
        "use_smc": False, "use_classic_pa": False,
    },
    "FVG_only": {
        "use_market_structure": False, "use_fvg": True,
        "use_smc": False, "use_classic_pa": False,
    },
    "SMC_only": {
        "use_market_structure": False, "use_fvg": False,
        "use_smc": True, "use_classic_pa": False,
    },
    "ClassicPA_only": {
        "use_market_structure": False, "use_fvg": False,
        "use_smc": False, "use_classic_pa": True,
    },
    "MS_FVG": {
        "use_market_structure": True, "use_fvg": True,
        "use_smc": False, "use_classic_pa": False,
    },
    "MS_SMC": {
        "use_market_structure": True, "use_fvg": False,
        "use_smc": True, "use_classic_pa": False,
    },
    "FVG_SMC": {
        "use_market_structure": False, "use_fvg": True,
        "use_smc": True, "use_classic_pa": False,
    },
    "ALL_indicators": {
        "use_market_structure": True, "use_fvg": True,
        "use_smc": True, "use_classic_pa": True,
    },
}

ADAPTATION_METHODS = ["none", "volatility", "regime", "self_learning"]

BASE_PARAMS = {
    "initial_capital": 10_000.0,
    "risk_pct": 0.02,
    "sizing_method": SizingMethod.FIXED_FRACTIONAL,
    "tp1_atr_mult": 2.0,
    "tp2_atr_mult": 4.0,
    "tp3_atr_mult": 8.0,
    "tp1_close_pct": 0.40,
    "tp2_close_pct": 0.30,
    "tp3_close_pct": 0.30,
    "sl_atr_mult": 2.0,
    "use_trailing": True,
    "trailing_atr_mult": 2.5,
    "trailing_activation_atr": 2.0,
    "min_confluence": 0.50,
    "warmup_bars": 50,
    "commission_pct": 0.075,
}


def load_timeframe_data(timeframe: str) -> pd.DataFrame:
    """Load data for a given timeframe."""
    pattern = f"BTCUSDT_{timeframe}_*.csv"
    files = list(DATA_DIR.glob(pattern))
    if not files:
        raise FileNotFoundError(f"No data for {timeframe}")
    filepath = max(files, key=lambda f: f.stat().st_size)
    df = pd.read_csv(filepath)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    return df


def run_single_test(df: pd.DataFrame, indicator_config: dict, adaptation: str, base_params: dict) -> dict:
    """Run a single backtest configuration."""
    params = {**base_params, **indicator_config}

    if adaptation == "none":
        bt = Backtester(**params)
        result = bt.run(df)
        result["adaptation"] = "none"
    else:
        result = run_adaptive_backtest(df, params, adaptation_method=adaptation)

    return result


def run_full_comparison():
    """Run all configurations and produce comparison report."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    all_results = []

    total_tests = len(TIMEFRAMES) * len(INDICATOR_CONFIGS) * len(ADAPTATION_METHODS)
    test_num = 0
    start_time = time.time()

    print("=" * 70)
    print("  COMPREHENSIVE STRATEGY COMPARISON")
    print(f"  {len(TIMEFRAMES)} timeframes × {len(INDICATOR_CONFIGS)} configs × {len(ADAPTATION_METHODS)} adaptations = {total_tests} tests")
    print("=" * 70)

    for tf in TIMEFRAMES:
        print(f"\n{'#'*70}")
        print(f"  TIMEFRAME: {tf}")
        print(f"{'#'*70}")

        try:
            df = load_timeframe_data(tf)
            print(f"  Loaded {len(df)} candles")
        except FileNotFoundError as e:
            print(f"  SKIP: {e}")
            continue

        for config_name, config in INDICATOR_CONFIGS.items():
            for adaptation in ADAPTATION_METHODS:
                test_num += 1
                label = f"[{test_num}/{total_tests}] {tf} | {config_name} | {adaptation}"
                print(f"\n  {label}...", end=" ", flush=True)

                try:
                    t0 = time.time()
                    result = run_single_test(df, config, adaptation, BASE_PARAMS)
                    elapsed = time.time() - t0

                    metrics = result["metrics"]
                    trades = metrics.get("total_trades", 0)
                    ret = metrics.get("total_return_pct", 0)
                    sharpe = metrics.get("sharpe_ratio", 0)
                    dd = metrics.get("max_drawdown_pct", 0)
                    wr = metrics.get("win_rate", 0)
                    pf = metrics.get("profit_factor", 0)

                    print(f"[{elapsed:.1f}s] {trades} trades | {ret:+.1f}% | Sharpe {sharpe:.2f} | DD {dd:.1f}% | WR {wr*100:.0f}% | PF {pf:.2f}")

                    all_results.append({
                        "timeframe": tf,
                        "indicators": config_name,
                        "adaptation": adaptation,
                        "trades": trades,
                        "return_pct": ret,
                        "sharpe": sharpe,
                        "sortino": metrics.get("sortino_ratio", 0),
                        "max_dd_pct": dd,
                        "win_rate": wr,
                        "profit_factor": pf,
                        "expectancy": metrics.get("expectancy", 0),
                        "avg_r": metrics.get("avg_r_multiple", 0),
                        "calmar": metrics.get("calmar_ratio", 0),
                        "annualized_return": metrics.get("annualized_return_pct", 0),
                        "net_profit": metrics.get("net_profit", 0),
                        "long_trades": metrics.get("long_trades", 0),
                        "short_trades": metrics.get("short_trades", 0),
                        "long_wr": metrics.get("long_win_rate", 0),
                        "short_wr": metrics.get("short_win_rate", 0),
                        "avg_bars_held": metrics.get("avg_bars_held", 0),
                    })

                except Exception as e:
                    print(f"ERROR: {e}")
                    all_results.append({
                        "timeframe": tf,
                        "indicators": config_name,
                        "adaptation": adaptation,
                        "trades": 0,
                        "return_pct": 0,
                        "sharpe": 0,
                        "error": str(e),
                    })

    total_time = time.time() - start_time

    # ── Build comparison report ──
    results_df = pd.DataFrame(all_results)
    results_df.to_csv(REPORT_DIR / "full_comparison.csv", index=False)

    print(f"\n\n{'='*70}")
    print(f"  COMPARISON COMPLETE — {total_time:.0f}s total")
    print(f"{'='*70}")

    # Filter to strategies with at least 10 trades
    valid = results_df[results_df["trades"] >= 10].copy()

    if valid.empty:
        print("\n  No strategies generated 10+ trades. Try lowering min_confluence.")
        # Show what we got
        print("\n  All results:")
        for _, row in results_df.iterrows():
            print(f"    {row['timeframe']} | {row['indicators']:<20} | {row['adaptation']:<15} | {row.get('trades', 0)} trades")
        return results_df

    # ── Top strategies by different criteria ──
    print("\n  TOP 10 BY TOTAL RETURN")
    print(f"  {'TF':<5} {'Indicators':<20} {'Adapt':<15} {'Trades':>6} {'Return':>8} {'Sharpe':>7} {'MaxDD':>7} {'WR':>6} {'PF':>6}")
    print("  " + "-" * 80)
    top_return = valid.nlargest(10, "return_pct")
    for _, r in top_return.iterrows():
        print(f"  {r['timeframe']:<5} {r['indicators']:<20} {r['adaptation']:<15} {r['trades']:>6} {r['return_pct']:>+7.1f}% {r['sharpe']:>7.2f} {r['max_dd_pct']:>6.1f}% {r['win_rate']*100:>5.0f}% {r['profit_factor']:>6.2f}")

    print("\n  TOP 10 BY SHARPE RATIO")
    print(f"  {'TF':<5} {'Indicators':<20} {'Adapt':<15} {'Trades':>6} {'Return':>8} {'Sharpe':>7} {'MaxDD':>7} {'WR':>6} {'PF':>6}")
    print("  " + "-" * 80)
    top_sharpe = valid.nlargest(10, "sharpe")
    for _, r in top_sharpe.iterrows():
        print(f"  {r['timeframe']:<5} {r['indicators']:<20} {r['adaptation']:<15} {r['trades']:>6} {r['return_pct']:>+7.1f}% {r['sharpe']:>7.2f} {r['max_dd_pct']:>6.1f}% {r['win_rate']*100:>5.0f}% {r['profit_factor']:>6.2f}")

    print("\n  TOP 10 BY RISK-ADJUSTED (Return / MaxDD)")
    valid["risk_adjusted"] = valid["return_pct"] / valid["max_dd_pct"].clip(lower=0.1)
    top_risk = valid.nlargest(10, "risk_adjusted")
    print(f"  {'TF':<5} {'Indicators':<20} {'Adapt':<15} {'Trades':>6} {'Return':>8} {'Sharpe':>7} {'MaxDD':>7} {'Ret/DD':>7}")
    print("  " + "-" * 80)
    for _, r in top_risk.iterrows():
        print(f"  {r['timeframe']:<5} {r['indicators']:<20} {r['adaptation']:<15} {r['trades']:>6} {r['return_pct']:>+7.1f}% {r['sharpe']:>7.2f} {r['max_dd_pct']:>6.1f}% {r['risk_adjusted']:>7.2f}")

    # ── Best overall (composite score) ──
    # Score = Return * Sharpe * PF / MaxDD (favor high return, high sharpe, low DD)
    valid["composite"] = (
        valid["return_pct"].clip(lower=0) *
        valid["sharpe"].clip(lower=0) *
        valid["profit_factor"].clip(lower=0) /
        valid["max_dd_pct"].clip(lower=0.1)
    )

    print("\n  TOP 5 OVERALL (COMPOSITE SCORE)")
    print(f"  {'TF':<5} {'Indicators':<20} {'Adapt':<15} {'Trades':>6} {'Return':>8} {'Sharpe':>7} {'MaxDD':>7} {'PF':>6} {'Score':>8}")
    print("  " + "-" * 90)
    top_composite = valid.nlargest(5, "composite")
    for _, r in top_composite.iterrows():
        print(f"  {r['timeframe']:<5} {r['indicators']:<20} {r['adaptation']:<15} {r['trades']:>6} {r['return_pct']:>+7.1f}% {r['sharpe']:>7.2f} {r['max_dd_pct']:>6.1f}% {r['profit_factor']:>6.2f} {r['composite']:>8.1f}")

    # ── Aggregated insights ──
    print(f"\n\n{'='*60}")
    print("  AGGREGATED INSIGHTS")
    print(f"{'='*60}")

    # Best timeframe
    tf_avg = valid.groupby("timeframe")["return_pct"].mean()
    print(f"\n  Avg return by timeframe:")
    for tf, ret in tf_avg.sort_values(ascending=False).items():
        print(f"    {tf}: {ret:+.2f}%")

    # Best indicator system
    ind_avg = valid.groupby("indicators")["return_pct"].mean()
    print(f"\n  Avg return by indicator system:")
    for ind, ret in ind_avg.sort_values(ascending=False).items():
        print(f"    {ind}: {ret:+.2f}%")

    # Best adaptation
    adapt_avg = valid.groupby("adaptation")["return_pct"].mean()
    print(f"\n  Avg return by adaptation method:")
    for a, ret in adapt_avg.sort_values(ascending=False).items():
        print(f"    {a}: {ret:+.2f}%")

    return results_df


# ═══════════════════════════════════════════════════════════════
# WALK-FORWARD VALIDATION OF TOP STRATEGIES
# ═══════════════════════════════════════════════════════════════

def validate_top_strategies(results_df: pd.DataFrame, top_n: int = 5):
    """Run walk-forward validation on top-performing strategies."""
    valid = results_df[results_df.get("trades", results_df["trades"]) >= 10].copy()
    if valid.empty:
        print("No strategies to validate.")
        return

    valid["composite"] = (
        valid["return_pct"].clip(lower=0) *
        valid.get("sharpe", pd.Series(0)).clip(lower=0) *
        valid.get("profit_factor", pd.Series(0)).clip(lower=0) /
        valid.get("max_dd_pct", pd.Series(1)).clip(lower=0.1)
    )

    top = valid.nlargest(top_n, "composite")

    print(f"\n\n{'='*70}")
    print(f"  WALK-FORWARD VALIDATION — Top {top_n} Strategies")
    print(f"{'='*70}")

    for _, row in top.iterrows():
        tf = row["timeframe"]
        indicators = row["indicators"]
        adaptation = row["adaptation"]

        print(f"\n  Testing: {tf} | {indicators} | {adaptation}")

        df = load_timeframe_data(tf)
        config = INDICATOR_CONFIGS[indicators]
        params = {**BASE_PARAMS, **config}

        wf_result = walk_forward_test(df, params, n_folds=5, train_pct=0.6)

        print(f"    Walk-Forward: {wf_result['passing_folds']}/{wf_result['total_folds']} folds profitable")
        print(f"    Avg Test Return: {wf_result['avg_test_return_pct']:.2f}%")
        for fold in wf_result["folds"]:
            status = "PASS" if fold["test_profitable"] else "FAIL"
            print(f"      Fold {fold['fold']}: train {fold['train_trades']} trades ({fold['train_return_pct']:+.1f}%) | "
                  f"test {fold['test_trades']} trades ({fold['test_return_pct']:+.1f}%) [{status}]")


# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    results = run_full_comparison()
    if results is not None and len(results) > 0:
        validate_top_strategies(results)
