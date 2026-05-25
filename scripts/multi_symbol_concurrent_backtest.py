"""
Multi-symbol concurrent backtest runner.

Existing `backtester.Backtester` is symbol-independent — running it per symbol
inflates effective n and ignores correlation. Live cron runs 5 portfolios in
parallel with shared bar timing; this script reproduces that behaviour so the
backtest baseline matches the live execution model.

Approach
--------
1. Load 1H data for all five symbols.
2. Run Backtester independently per symbol (same params, same dev range).
3. Reconstruct a TIME-INDEXED equity curve per symbol from each Backtester's
   equity_curve output (which is per-bar).
4. Resample all five curves to a common hourly grid and sum to a portfolio
   equity curve. Compute aggregate metrics:
     - portfolio total return, Sharpe (per-day), max drawdown, R/day
     - correlation matrix of daily returns
     - simultaneous-DD count (days where 3+ symbols are in DD)

Usage
-----
    python scripts/multi_symbol_concurrent_backtest.py \\
        --symbols BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT \\
        --start 2023-01-01 \\
        --end 2025-12-31 \\
        --out reports/v5_concurrent_baseline.json
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# Add project root to path for local imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backtester import Backtester  # noqa: E402
from oos_holdout import filter_dataset, describe_holdout, DEV_END  # noqa: E402
from strategy import STRATEGY_PARAMS  # noqa: E402


DEFAULT_SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT")
DEFAULT_DATA_GLOB = "data/{symbol}_1h_2023-01-01_to_2026-04-13.csv"


def load_symbol(symbol: str, start: str, end: str) -> pd.DataFrame:
    path = Path(DEFAULT_DATA_GLOB.format(symbol=symbol))
    if not path.exists():
        raise FileNotFoundError(f"Missing data file: {path}")
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    sd = pd.Timestamp(start, tz="UTC")
    ed = pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1)
    df = df[(df["date"] >= sd) & (df["date"] < ed)].reset_index(drop=True)
    return df


def per_symbol_run(symbol: str, df: pd.DataFrame, params: dict) -> dict:
    bt = Backtester(**params)
    out = bt.run(df)
    trades = out["trades"]
    metrics = out["metrics"]
    eq_values = out["equity_curve"]  # list of float, one per bar
    # Align equity values with df dates 1:1
    eq_df = pd.DataFrame({"date": df["date"].values, "equity": eq_values})
    eq_df = eq_df.set_index("date").sort_index()
    return {
        "symbol": symbol,
        "metrics": metrics,
        "equity_curve": eq_df,
        "n_trades": len(trades),
        "trades": trades,
    }


def aggregate_portfolio(runs: list[dict], initial_capital_each: float) -> dict:
    # Build a common hourly DateTimeIndex from union of all symbols
    idx = sorted(set().union(*[r["equity_curve"].index for r in runs]))
    idx = pd.DatetimeIndex(idx)

    # Reindex each symbol's equity onto the common index, forward-fill,
    # then prepend initial capital for any missing leading rows.
    eq_matrix = {}
    for r in runs:
        s = r["equity_curve"]["equity"].reindex(idx).ffill()
        s.iloc[0] = s.iloc[0] if pd.notna(s.iloc[0]) else initial_capital_each
        eq_matrix[r["symbol"]] = s.fillna(initial_capital_each)
    eq_df = pd.DataFrame(eq_matrix)

    # Portfolio equity is the sum of per-symbol equities
    portfolio_eq = eq_df.sum(axis=1)
    total_initial = initial_capital_each * len(runs)
    total_final = float(portfolio_eq.iloc[-1])
    total_return_pct = ((total_final - total_initial) / total_initial) * 100

    # Daily returns
    daily_eq = portfolio_eq.resample("1D").last().dropna()
    daily_ret = daily_eq.pct_change().dropna()
    mean_d = float(daily_ret.mean())
    std_d = float(daily_ret.std(ddof=1)) if len(daily_ret) > 1 else 0.0
    sharpe_ann = (mean_d / std_d) * math.sqrt(365) if std_d > 0 else 0.0

    # Drawdown on portfolio
    rolling_peak = portfolio_eq.cummax()
    dd_pct_series = (portfolio_eq - rolling_peak) / rolling_peak * 100
    max_dd_pct = float(abs(dd_pct_series.min()))

    # Correlation of per-symbol daily returns
    daily_per_sym = eq_df.resample("1D").last().pct_change().dropna()
    corr_matrix = daily_per_sym.corr().round(3).to_dict()

    # Simultaneous-DD count
    per_sym_peak = eq_df.cummax()
    per_sym_dd = (eq_df - per_sym_peak) / per_sym_peak * 100
    in_dd = (per_sym_dd < -2.0).astype(int)  # >2% DD = "in DD"
    in_dd_daily = in_dd.resample("1D").last().fillna(0)
    simul_dd_3plus = int((in_dd_daily.sum(axis=1) >= 3).sum())
    simul_dd_4plus = int((in_dd_daily.sum(axis=1) >= 4).sum())
    total_days = len(in_dd_daily)

    # Total trade count
    total_trades = sum(r["n_trades"] for r in runs)
    days_span = max(1, (portfolio_eq.index.max() - portfolio_eq.index.min()).days)
    r_total = sum(_sum_r(r["trades"]) for r in runs)
    r_per_day = r_total / days_span if days_span > 0 else 0

    return {
        "n_symbols": len(runs),
        "n_trades_total": total_trades,
        "days_span": days_span,
        "portfolio_initial": total_initial,
        "portfolio_final": total_final,
        "portfolio_return_pct": total_return_pct,
        "portfolio_sharpe_annualized": sharpe_ann,
        "portfolio_max_dd_pct": max_dd_pct,
        "portfolio_r_per_day": r_per_day,
        "correlation_matrix": corr_matrix,
        "simul_dd_3plus_days": simul_dd_3plus,
        "simul_dd_4plus_days": simul_dd_4plus,
        "total_days": total_days,
        "simul_dd_3plus_pct": simul_dd_3plus / total_days * 100 if total_days else 0,
    }


def _sum_r(trades: list) -> float:
    s = 0.0
    for t in trades:
        if t.pnl is not None and t.risk_amount and t.risk_amount > 0:
            s += float(t.pnl) / float(t.risk_amount)
    return s


def render_report(
    symbols: list[str],
    start: str,
    end: str,
    runs: list[dict],
    agg: dict,
    params_label: str,
) -> dict:
    per_sym_rows = []
    for r in runs:
        m = r["metrics"]
        per_sym_rows.append({
            "symbol": r["symbol"],
            "n_trades": m["total_trades"],
            "win_rate": m["win_rate"],
            "profit_factor": m["profit_factor"]
            if math.isfinite(m["profit_factor"])
            else None,
            "total_return_pct": m["total_return_pct"],
            "max_drawdown_pct": m["max_drawdown_pct"],
            "sharpe_ratio": m["sharpe_ratio"],
            "avg_r_multiple": m.get("avg_r_multiple", 0),
        })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "params_label": params_label,
        "date_range": {"start": start, "end": end},
        "holdout_policy": describe_holdout(),
        "symbols": symbols,
        "per_symbol": per_sym_rows,
        "portfolio_aggregate": agg,
    }


def main():
    ap = argparse.ArgumentParser(description="Multi-symbol concurrent BT")
    ap.add_argument("--symbols", default=",".join(DEFAULT_SYMBOLS))
    ap.add_argument("--start", default="2023-01-01")
    ap.add_argument(
        "--end",
        default=str(DEV_END.date()),
        help="Defaults to OOS dev end (frozen by oos_holdout.py)",
    )
    ap.add_argument("--out", default="reports/v5_concurrent_baseline.json")
    ap.add_argument(
        "--label",
        default="V5_DEFAULTS",
        help="Label for the params used (for reporting)",
    )
    ap.add_argument(
        "--include-oos",
        action="store_true",
        help="DANGEROUS: include held-back 2026-Q1 OOS data. Only for Phase 3g.",
    )
    args = ap.parse_args()

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    print(f"[{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}] Multi-symbol concurrent BT")
    print(f"  Symbols: {symbols}")
    print(f"  Range:   {args.start} -> {args.end}")
    print(f"  Params:  {args.label}")
    print(f"  {describe_holdout()}")

    if args.include_oos:
        print("  *** include_oos=True — Phase 3g OOS mode ***")

    runs = []
    for sym in symbols:
        df = load_symbol(sym, args.start, args.end)
        df = filter_dataset(df, include_oos=args.include_oos)
        if len(df) < 200:
            print(f"  [WARN] {sym}: only {len(df)} bars after filter, skipping")
            continue
        print(f"  Running {sym}: {len(df)} bars...")
        runs.append(per_symbol_run(sym, df, STRATEGY_PARAMS))

    if not runs:
        print("  No symbols produced runs. Aborting.")
        sys.exit(1)

    initial_capital_each = float(STRATEGY_PARAMS["initial_capital"])
    agg = aggregate_portfolio(runs, initial_capital_each)
    report = render_report(symbols, args.start, args.end, runs, agg, args.label)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(_sanitize(report), f, indent=2, default=str)

    # Print summary
    print()
    print("=" * 72)
    print(f"  PORTFOLIO AGGREGATE")
    print("=" * 72)
    print(f"  Symbols:                    {agg['n_symbols']}")
    print(f"  Total trades:               {agg['n_trades_total']}")
    print(f"  Days span:                  {agg['days_span']}")
    print(f"  Initial capital:            ${agg['portfolio_initial']:,.0f}")
    print(f"  Final equity:               ${agg['portfolio_final']:,.0f}")
    print(f"  Portfolio return:           {agg['portfolio_return_pct']:+.2f}%")
    print(f"  Portfolio Sharpe (ann.):    {agg['portfolio_sharpe_annualized']:+.2f}")
    print(f"  Portfolio max DD:           {agg['portfolio_max_dd_pct']:.2f}%")
    print(f"  R per day:                  {agg['portfolio_r_per_day']:+.3f}")
    print(f"  Simult. DD (>=3 syms):      {agg['simul_dd_3plus_days']} days ({agg['simul_dd_3plus_pct']:.1f}%)")
    print()
    print(f"  Per-symbol:")
    for r in report["per_symbol"]:
        pf = "inf" if r["profit_factor"] is None else f"{r['profit_factor']:.2f}"
        print(f"    {r['symbol']:>9} n={r['n_trades']:>3} WR={r['win_rate']*100:>5.1f}% PF={pf:>6} Ret={r['total_return_pct']:+7.1f}% DD={r['max_drawdown_pct']:>5.1f}%")
    print()
    print(f"  Saved: {out_path}")


def _sanitize(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, float):
        if math.isinf(obj) or math.isnan(obj):
            return None
        return obj
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return obj


if __name__ == "__main__":
    main()
