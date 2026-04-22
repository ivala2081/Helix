"""
Helix V5 — Quant Analysis Suite
================================

Objective: decide whether to public-launch the forward-test on 2026-04-29
based on overfit-adjusted statistics of the 3.3-year backtest.

Three analyses produced:
  1) Walk-Forward OOS decay — IS vs OOS Sharpe across rolling windows
  2) Deflated Sharpe Ratio  — DSR + PSR (Bailey & Lopez de Prado 2014)
  3) Minimum Track Record Length — MTRL for confidence on the reported SR

Outputs:
  - stdout summary table + decision recommendation
  - reports/quant_analysis_<timestamp>.json with raw numbers

Run: python3 quant_analysis.py
"""

import json
import math
from copy import deepcopy
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import norm, skew, kurtosis

from backtester import Backtester
from validate_strategy import WINNER_PARAMS, load_data

REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

SYMBOLS_AVAILABLE = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
INTERVAL = "1h"

# Number of trials tested during backtest development (for DSR deflation)
# 3 timeframes (1H/30M/15M) x 4 validation tests (OOS, MC, Sensitivity, Multi-Asset)
# Conservative: add V1..V5 iterations (5) as separate trials
# Total effective trials: 3*4 + 5 = 17. We use N=20 to be conservative.
N_TRIALS = 20

# Walk-forward config
N_FOLDS = 6              # 6 rolling windows over 3.3 years ~= 6.6 months each
IS_PCT = 0.67            # 67% in-sample, 33% out-of-sample per fold


# ════════════════════════════════════════════════════════════════════════
# BAILEY-LOPEZ DE PRADO STATISTICS
# ════════════════════════════════════════════════════════════════════════

def psr(sr, T, g3, g4, sr_star=0.0):
    """
    Probabilistic Sharpe Ratio.
    P(true_SR > sr_star) given observed sr over T observations, with
    return skewness g3 and excess kurtosis g4_excess = g4 - 3.

    Uses Mertens (2002) variance formula for non-IID non-normal returns.
    """
    g4_excess = g4 - 3.0
    if T <= 1:
        return float("nan")
    se = math.sqrt(max(1e-12, 1.0 - g3 * sr + (g4_excess / 4.0) * sr * sr) / (T - 1))
    z = (sr - sr_star) / se
    return float(norm.cdf(z))


def expected_max_sr(n_trials, T, g3=0.0, g4=3.0, observed_sr=0.0):
    """
    Expected maximum Sharpe under the null (no skill), given n_trials.
    Bailey-Lopez de Prado eq. (3).

    Under H0 (true SR = 0), the estimation variance of SR is
    (1 - g3*SR + (g4-3)/4 * SR^2) / (T - 1).  Conservative: use SR=0 in
    this variance, giving var_sr = 1/(T-1) — this matches most DSR
    reference implementations.
    """
    gamma = 0.5772156649  # Euler-Mascheroni
    N = max(2, n_trials)
    g4_excess = g4 - 3.0
    var_sr = max(1e-12, 1.0 - g3 * observed_sr + (g4_excess / 4.0) * observed_sr ** 2) / max(1, T - 1)
    term1 = (1.0 - gamma) * norm.ppf(1.0 - 1.0 / N)
    term2 = gamma * norm.ppf(1.0 - 1.0 / (N * math.e))
    return math.sqrt(var_sr) * (term1 + term2)


def deflated_sharpe(sr, T, g3, g4, n_trials):
    """
    Deflated Sharpe Ratio — probability that observed SR exceeds the
    expected max under the null of no skill, accounting for multiple trials.
    """
    sr_null = expected_max_sr(n_trials, T, g3, g4, observed_sr=sr)
    return psr(sr, T, g3, g4, sr_star=sr_null), sr_null


def min_track_record_length(sr, g3, g4, sr_star=0.0, alpha=0.05):
    """
    Minimum number of observations T required so that PSR(sr_star) >= 1-alpha.
    Bailey-Lopez de Prado eq. (6).
    """
    if sr <= sr_star:
        return float("inf")
    g4_excess = g4 - 3.0
    z = norm.ppf(1.0 - alpha)
    numerator = 1.0 - g3 * sr + (g4_excess / 4.0) * sr * sr
    denominator = (sr - sr_star) ** 2
    return 1.0 + numerator * z * z / denominator


# ════════════════════════════════════════════════════════════════════════
# BACKTEST DRIVER
# ════════════════════════════════════════════════════════════════════════

def run_backtest(df, params):
    bt = Backtester(**params)
    return bt.run(df)


def trade_returns(trades):
    """Return per-trade percent returns on notional, as np.array."""
    rs = []
    for t in trades:
        if t.pnl is None or t.entry_price is None or t.size is None:
            continue
        notional = t.entry_price * t.size
        if notional <= 0:
            continue
        rs.append(t.pnl / notional)
    return np.array(rs)


def r_multiples(trades):
    rs = []
    for t in trades:
        if t.pnl is None or not t.risk_amount or t.risk_amount <= 0:
            continue
        rs.append(t.pnl / t.risk_amount)
    return np.array(rs)


def annualized_sharpe_from_returns(returns, periods_per_year):
    if len(returns) < 2 or returns.std(ddof=1) == 0:
        return 0.0
    return float(returns.mean() / returns.std(ddof=1) * math.sqrt(periods_per_year))


# ════════════════════════════════════════════════════════════════════════
# 1. WALK-FORWARD OOS DECAY
# ════════════════════════════════════════════════════════════════════════

def walk_forward(df, params, n_folds=N_FOLDS, is_pct=IS_PCT):
    """
    Rolling walk-forward: partition data into n_folds windows.
    Each fold: run backtest on full window, split trades into IS and OOS.
    Compare IS Sharpe vs OOS Sharpe (decay ratio).
    """
    n = len(df)
    fold_size = n // n_folds
    results = []
    bars_per_year = 24 * 365  # 1H bars

    for fold in range(n_folds):
        start = fold * fold_size
        end = min(start + fold_size + int(fold_size * 0.5), n)
        fold_df = df.iloc[start:end].reset_index(drop=True)
        if len(fold_df) < 500:
            continue
        split_idx = int(len(fold_df) * is_pct)

        out = run_backtest(fold_df, params)
        trades = out["trades"]
        equity = np.array(out["equity_curve"])

        is_trades = [t for t in trades if t.entry_bar < split_idx]
        oos_trades = [t for t in trades if t.entry_bar >= split_idx]

        is_eq = equity[:split_idx + 1]
        oos_eq = equity[split_idx:]
        is_rets = np.diff(is_eq) / is_eq[:-1] if len(is_eq) > 1 else np.array([])
        oos_rets = np.diff(oos_eq) / oos_eq[:-1] if len(oos_eq) > 1 else np.array([])

        is_sharpe = annualized_sharpe_from_returns(is_rets, bars_per_year)
        oos_sharpe = annualized_sharpe_from_returns(oos_rets, bars_per_year)

        is_pnl = sum(t.pnl for t in is_trades if t.pnl) if is_trades else 0.0
        oos_pnl = sum(t.pnl for t in oos_trades if t.pnl) if oos_trades else 0.0

        results.append({
            "fold": fold + 1,
            "date_start": str(fold_df["date"].iloc[0]),
            "date_end": str(fold_df["date"].iloc[-1]),
            "is_trades": len(is_trades),
            "oos_trades": len(oos_trades),
            "is_sharpe": is_sharpe,
            "oos_sharpe": oos_sharpe,
            "is_pnl": is_pnl,
            "oos_pnl": oos_pnl,
            "oos_profitable": oos_pnl > 0,
        })

    # Aggregate
    oos_sharpes = [r["oos_sharpe"] for r in results]
    is_sharpes = [r["is_sharpe"] for r in results]
    passing = sum(1 for r in results if r["oos_profitable"])

    avg_is = float(np.mean(is_sharpes)) if is_sharpes else 0.0
    avg_oos = float(np.mean(oos_sharpes)) if oos_sharpes else 0.0
    decay = (avg_oos / avg_is) if abs(avg_is) > 1e-9 else 0.0

    return {
        "folds": results,
        "passing_folds": passing,
        "total_folds": len(results),
        "pass_rate": passing / max(1, len(results)),
        "avg_is_sharpe": avg_is,
        "avg_oos_sharpe": avg_oos,
        "decay_ratio": decay,       # 1.0 = no decay, 0 = catastrophic
    }


# ════════════════════════════════════════════════════════════════════════
# 2. DSR + PSR on full-period backtest
# ════════════════════════════════════════════════════════════════════════

def compute_dsr_block(df, params, symbol):
    out = run_backtest(df, params)
    trades = out["trades"]
    equity = np.array(out["equity_curve"])
    metrics = out["metrics"]

    tr_ret = trade_returns(trades)
    r_mults = r_multiples(trades)

    # Trade-level SR (per-trade, then annualized by trades/year)
    years_span = (df["date"].iloc[-1] - df["date"].iloc[0]).total_seconds() / (365.25 * 24 * 3600)
    trades_per_year = len(trades) / max(years_span, 0.01)

    if len(tr_ret) >= 2 and tr_ret.std(ddof=1) > 0:
        sr_per_trade = float(tr_ret.mean() / tr_ret.std(ddof=1))
        sr_annualized = sr_per_trade * math.sqrt(trades_per_year)
        g3 = float(skew(tr_ret, bias=False))
        g4 = float(kurtosis(tr_ret, fisher=False, bias=False))  # Pearson (not excess)
    else:
        sr_per_trade = 0.0
        sr_annualized = 0.0
        g3 = 0.0
        g4 = 3.0

    # Bar-level SR (as reported in metrics)
    bar_ret = np.diff(equity) / equity[:-1]
    bar_ret = bar_ret[~np.isnan(bar_ret)]
    bar_sr = annualized_sharpe_from_returns(bar_ret, 24 * 365)

    psr_vs_zero = psr(sr_per_trade, len(tr_ret), g3, g4, sr_star=0.0)
    psr_vs_one_ann = psr(sr_per_trade, len(tr_ret), g3, g4,
                         sr_star=1.0 / math.sqrt(trades_per_year))
    psr_vs_two_ann = psr(sr_per_trade, len(tr_ret), g3, g4,
                         sr_star=2.0 / math.sqrt(trades_per_year))

    dsr, sr_null = deflated_sharpe(sr_per_trade, len(tr_ret), g3, g4, N_TRIALS)

    # MTRL — how many trades needed for 95% PSR vs SR* = 1.0 annualized
    mtrl_vs_one = min_track_record_length(
        sr_per_trade, g3, g4,
        sr_star=1.0 / math.sqrt(trades_per_year),
        alpha=0.05,
    )
    mtrl_vs_two = min_track_record_length(
        sr_per_trade, g3, g4,
        sr_star=2.0 / math.sqrt(trades_per_year),
        alpha=0.05,
    )
    mtrl_vs_null = min_track_record_length(
        sr_per_trade, g3, g4,
        sr_star=sr_null,
        alpha=0.05,
    )

    return {
        "symbol": symbol,
        "years_span": years_span,
        "total_trades": len(trades),
        "trades_per_year": trades_per_year,
        "win_rate": metrics.get("win_rate", 0),
        "profit_factor": metrics.get("profit_factor", 0),
        "max_drawdown_pct": metrics.get("max_drawdown_pct", 0),
        "reported_sharpe_bar": bar_sr,
        "reported_sharpe_metric": metrics.get("sharpe_ratio", 0),
        "sharpe_per_trade": sr_per_trade,
        "sharpe_annualized_trade": sr_annualized,
        "skewness": g3,
        "kurtosis": g4,
        "psr_vs_zero": psr_vs_zero,
        "psr_vs_one_ann": psr_vs_one_ann,
        "psr_vs_two_ann": psr_vs_two_ann,
        "expected_max_sr_null": sr_null,
        "deflated_sharpe": dsr,
        "mtrl_vs_one_ann": mtrl_vs_one,
        "mtrl_vs_two_ann": mtrl_vs_two,
        "mtrl_vs_null": mtrl_vs_null,
        "mean_r_multiple": float(np.mean(r_mults)) if len(r_mults) else 0.0,
        "median_r_multiple": float(np.median(r_mults)) if len(r_mults) else 0.0,
    }


# ════════════════════════════════════════════════════════════════════════
# 3. DECISION LOGIC
# ════════════════════════════════════════════════════════════════════════

def decide_launch(btc_block, wf_block):
    """Return (verdict, rationale_lines)"""
    dsr = btc_block["deflated_sharpe"]
    decay = wf_block["decay_ratio"]
    pass_rate = wf_block["pass_rate"]
    psr0 = btc_block["psr_vs_zero"]

    lines = []
    lines.append(f"  DSR (prob edge > null max): {dsr:.3f}")
    lines.append(f"  PSR(SR>0):                 {psr0:.3f}")
    lines.append(f"  Walk-forward pass rate:    {pass_rate:.0%}")
    lines.append(f"  IS->OOS Sharpe decay:      {decay:.2f} (1.0 = no decay)")

    if dsr >= 0.95 and decay >= 0.5 and pass_rate >= 0.5:
        return "LAUNCH", lines
    if dsr >= 0.75 and decay >= 0.4:
        return "LAUNCH_CAUTIOUS", lines
    if dsr >= 0.5 or decay >= 0.3:
        return "DELAY_1_MONTH", lines
    return "KILL_OR_REWORK", lines


# ════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════

def main():
    print("\n" + "=" * 72)
    print("  HELIX V5 — QUANT ANALYSIS SUITE")
    print("  " + datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))
    print("=" * 72)
    print(f"  Trials assumed for DSR deflation: N = {N_TRIALS}")
    print(f"  Walk-forward folds: {N_FOLDS}  (IS = {IS_PCT:.0%})")

    results = {"generated_at": datetime.utcnow().isoformat(), "per_symbol": {}}

    # --- per-symbol DSR block ---
    blocks = {}
    for symbol in SYMBOLS_AVAILABLE:
        print(f"\n[1/3] DSR + PSR — {symbol} {INTERVAL}")
        df = load_data(symbol, INTERVAL)
        block = compute_dsr_block(df, WINNER_PARAMS, symbol)
        blocks[symbol] = block
        results["per_symbol"][symbol] = block

        print(f"  Trades:                    {block['total_trades']}  ({block['trades_per_year']:.1f}/yr)")
        print(f"  Reported Sharpe (bar):     {block['reported_sharpe_bar']:.2f}")
        print(f"  Sharpe per trade:          {block['sharpe_per_trade']:.3f}")
        print(f"  Sharpe annualized (trade): {block['sharpe_annualized_trade']:.2f}")
        print(f"  Skew / Kurtosis:           {block['skewness']:.2f} / {block['kurtosis']:.2f}")
        print(f"  Expected max SR (null):    {block['expected_max_sr_null']:.3f}  (N={N_TRIALS} trials)")
        print(f"  PSR(SR > 0):               {block['psr_vs_zero']:.3f}")
        print(f"  PSR(SR > 1 annualized):    {block['psr_vs_one_ann']:.3f}")
        print(f"  PSR(SR > 2 annualized):    {block['psr_vs_two_ann']:.3f}")
        print(f"  DSR (overfit-adjusted):    {block['deflated_sharpe']:.3f}")
        print(f"  MTRL for SR > 1 (95%):     {block['mtrl_vs_one_ann']:.0f} trades")
        print(f"  MTRL for SR > 2 (95%):     {block['mtrl_vs_two_ann']:.0f} trades")
        print(f"  MTRL vs null max (95%):    {block['mtrl_vs_null']:.0f} trades")

    # --- walk-forward on BTC (primary validation asset) ---
    print(f"\n[2/3] Walk-forward decay — BTCUSDT {INTERVAL}")
    df_btc = load_data("BTCUSDT", INTERVAL)
    wf = walk_forward(df_btc, WINNER_PARAMS)
    results["walk_forward_btc"] = wf

    print(f"\n  Fold | Trades IS/OOS | Sharpe IS -> OOS    | OOS PnL")
    print("  " + "-" * 60)
    for r in wf["folds"]:
        print(f"  {r['fold']:>4} | {r['is_trades']:>3}/{r['oos_trades']:<3}"
              f"       | {r['is_sharpe']:>5.2f} -> {r['oos_sharpe']:>5.2f}"
              f"       | ${r['oos_pnl']:>8.2f}")
    print(f"\n  Avg IS Sharpe:   {wf['avg_is_sharpe']:.2f}")
    print(f"  Avg OOS Sharpe:  {wf['avg_oos_sharpe']:.2f}")
    print(f"  Decay ratio:     {wf['decay_ratio']:.2f}  (1.0 = no overfit)")
    print(f"  Pass rate:       {wf['passing_folds']}/{wf['total_folds']}  ({wf['pass_rate']:.0%})")

    # --- decision ---
    print(f"\n[3/3] Launch decision")
    verdict, lines = decide_launch(blocks["BTCUSDT"], wf)
    for line in lines:
        print(line)

    verdict_labels = {
        "LAUNCH": "GO — launch 2026-04-29 as planned, full risk.",
        "LAUNCH_CAUTIOUS": "GO CAUTIOUS — launch with reduced risk cap + prominent disclaimer.",
        "DELAY_1_MONTH": "DELAY — fix biases (TP wick, portfolio limit) and re-run.",
        "KILL_OR_REWORK": "KILL — strategy likely overfit; do not public-launch V5 as-is.",
    }
    print(f"\n  >>> VERDICT: {verdict}")
    print(f"  >>> {verdict_labels[verdict]}")

    results["verdict"] = verdict
    results["verdict_label"] = verdict_labels[verdict]

    # --- persist ---
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_path = REPORTS_DIR / f"quant_analysis_{ts}.json"

    def _sanitize(obj):
        if isinstance(obj, dict):
            return {k: _sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_sanitize(v) for v in obj]
        if isinstance(obj, (np.floating,)):
            obj = float(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, float) and (math.isinf(obj) or math.isnan(obj)):
            return None
        return obj

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(_sanitize(results), f, indent=2, default=str)
    print(f"\n  Raw results: {out_path}")

    return results


if __name__ == "__main__":
    main()
