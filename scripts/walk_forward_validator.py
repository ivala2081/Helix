"""
Walk-forward validator for V6 R&D.

Splits the dev range (2023-01-01 → 2025-12-31 by default, respecting the
OOS holdout) into k folds. Each fold has a train window and a test window
defined by `train_pct`. The strategy is NOT re-optimized inside the fold —
we run the same (V5 or V6) params on both train and test, then read the
test-window metric.

This is the honest WF: train period sanity check, test period as
out-of-train evaluation. No look-ahead.

Per-fold metric: portfolio R/day on the test window.
Pass criterion: positive R/day in N of K folds (default ≥5 of 6).

Usage
-----
    python scripts/walk_forward_validator.py \\
        --symbols BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT \\
        --start 2023-01-01 --end 2025-12-31 \\
        --folds 6 --train-pct 0.60 \\
        --out reports/v5_walk_forward.json
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from backtester import Backtester  # noqa: E402
from oos_holdout import DEV_END, describe_holdout, filter_dataset  # noqa: E402
from strategy import STRATEGY_PARAMS  # noqa: E402


DEFAULT_SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT")
DEFAULT_DATA_GLOB = "data/{symbol}_1h_2023-01-01_to_2026-04-13.csv"


def load_symbol_dev_only(symbol: str, start: str, end: str) -> pd.DataFrame:
    p = Path(DEFAULT_DATA_GLOB.format(symbol=symbol))
    if not p.exists():
        raise FileNotFoundError(p)
    df = pd.read_csv(p)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    sd = pd.Timestamp(start, tz="UTC")
    ed = pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1)
    df = df[(df["date"] >= sd) & (df["date"] < ed)].reset_index(drop=True)
    df = filter_dataset(df, include_oos=False)  # NEVER include OOS in WF
    return df


def split_folds(df: pd.DataFrame, k: int, train_pct: float) -> list[dict]:
    """
    Produce k rolling (train, test) windows.

    Strategy: divide the data into k+1 equal-time segments. Fold i uses
    segments [i, i+train_segs) as train and [i+train_segs, i+train_segs+test_segs)
    as test, but for our purposes we just need k contiguous fold windows
    each with train+test segments inside.

    Simpler: split data into k equal chunks. For fold i, train = chunks
    [0..i] (everything before), test = chunk i. This is "expanding window".

    Even simpler (matches Helix existing WF convention): k folds, each fold
    is a contiguous slice of data, within which (train_pct, 1-train_pct)
    are train/test.
    """
    if len(df) < k * 200:
        raise ValueError(f"Not enough bars ({len(df)}) for {k} folds")
    folds = []
    chunk = len(df) // k
    for i in range(k):
        start = i * chunk
        end = (i + 1) * chunk if i < k - 1 else len(df)
        fold = df.iloc[start:end].reset_index(drop=True)
        split_at = int(len(fold) * train_pct)
        train = fold.iloc[:split_at].reset_index(drop=True)
        test = fold.iloc[split_at:].reset_index(drop=True)
        folds.append({
            "fold": i + 1,
            "start": str(fold["date"].iloc[0]),
            "end": str(fold["date"].iloc[-1]),
            "train_bars": len(train),
            "test_bars": len(test),
            "train": train,
            "test": test,
        })
    return folds


def fold_metric(
    train: pd.DataFrame,
    test: pd.DataFrame,
    params: dict,
    symbol: str,
) -> dict:
    """Run the backtester on train then test; report test-window metrics."""
    out_train = Backtester(**params).run(train)
    out_test = Backtester(**params).run(test)

    def summarize(out, df):
        trades = out["trades"]
        n = len(trades)
        wins = sum(1 for t in trades if t.pnl and t.pnl > 0)
        wr = wins / n if n else 0
        sw = sum(t.pnl for t in trades if t.pnl and t.pnl > 0)
        sl = -sum(t.pnl for t in trades if t.pnl and t.pnl <= 0)
        pf = sw / sl if sl > 0 else float("inf")
        r_total = sum(
            (t.pnl / t.risk_amount)
            for t in trades
            if t.pnl is not None and t.risk_amount and t.risk_amount > 0
        )
        days = max(1, (df["date"].iloc[-1] - df["date"].iloc[0]).days)
        return {
            "n_trades": n,
            "win_rate": wr,
            "profit_factor": pf if math.isfinite(pf) else None,
            "r_total": r_total,
            "r_per_day": r_total / days,
            "days": days,
            "total_return_pct": out["metrics"]["total_return_pct"],
            "sharpe_ratio": out["metrics"]["sharpe_ratio"],
        }

    return {
        "symbol": symbol,
        "train": summarize(out_train, train),
        "test": summarize(out_test, test),
    }


def run_wf(
    symbols: list[str],
    start: str,
    end: str,
    k: int,
    train_pct: float,
    params: dict,
) -> dict:
    per_symbol_folds: dict[str, list[dict]] = {s: [] for s in symbols}
    for sym in symbols:
        df = load_symbol_dev_only(sym, start, end)
        folds = split_folds(df, k, train_pct)
        print(f"  {sym}: {len(df)} bars across {k} folds")
        for f in folds:
            metric = fold_metric(f["train"], f["test"], params, sym)
            metric["fold"] = f["fold"]
            metric["window"] = {"start": f["start"], "end": f["end"]}
            per_symbol_folds[sym].append(metric)

    # Aggregate to portfolio level per fold
    portfolio_folds = []
    for fold_idx in range(k):
        fold_test_r_per_day = 0.0
        fold_test_total_r = 0.0
        fold_test_days = 0
        fold_train_total_r = 0.0
        fold_train_days = 0
        for sym in symbols:
            m = per_symbol_folds[sym][fold_idx]
            fold_test_total_r += m["test"]["r_total"]
            fold_test_days = max(fold_test_days, m["test"]["days"])
            fold_train_total_r += m["train"]["r_total"]
            fold_train_days = max(fold_train_days, m["train"]["days"])
        fold_test_r_per_day = (
            fold_test_total_r / fold_test_days if fold_test_days else 0
        )
        fold_train_r_per_day = (
            fold_train_total_r / fold_train_days if fold_train_days else 0
        )
        portfolio_folds.append({
            "fold": fold_idx + 1,
            "test_r_per_day": fold_test_r_per_day,
            "test_total_r": fold_test_total_r,
            "test_days": fold_test_days,
            "test_positive": fold_test_r_per_day > 0,
            "train_r_per_day": fold_train_r_per_day,
            "train_total_r": fold_train_total_r,
        })

    folds_positive = sum(1 for f in portfolio_folds if f["test_positive"])
    pass_5of6 = folds_positive >= 5
    pass_4of6 = folds_positive >= 4

    return {
        "k_folds": k,
        "train_pct": train_pct,
        "folds_positive": folds_positive,
        "verdict_5of6": "PASS" if pass_5of6 else "FAIL",
        "verdict_4of6": "PASS" if pass_4of6 else "FAIL",
        "portfolio_folds": portfolio_folds,
        "per_symbol_folds": per_symbol_folds,
    }


def main():
    ap = argparse.ArgumentParser(description="Walk-forward validator")
    ap.add_argument("--symbols", default=",".join(DEFAULT_SYMBOLS))
    ap.add_argument("--start", default="2023-01-01")
    ap.add_argument("--end", default=str(DEV_END.date()))
    ap.add_argument("--folds", type=int, default=6)
    ap.add_argument("--train-pct", type=float, default=0.60)
    ap.add_argument("--out", default="reports/v5_walk_forward.json")
    ap.add_argument("--label", default="V5_DEFAULTS")
    args = ap.parse_args()

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    print(f"[{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}] Walk-forward validator")
    print(f"  Symbols: {symbols}")
    print(f"  Range:   {args.start} -> {args.end}")
    print(f"  Folds:   {args.folds} (train_pct={args.train_pct})")
    print(f"  Params:  {args.label}")
    print(f"  {describe_holdout()}")

    result = run_wf(
        symbols, args.start, args.end, args.folds, args.train_pct, STRATEGY_PARAMS,
    )

    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "params_label": args.label,
        "date_range": {"start": args.start, "end": args.end},
        "symbols": symbols,
        "result": result,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(_sanitize(out), f, indent=2, default=str)

    print()
    print("=" * 72)
    print(f"  WALK-FORWARD RESULTS — {result['k_folds']}-fold")
    print("=" * 72)
    print(f"  {'fold':>4} {'train R/day':>12} {'test R/day':>12} {'test pos?':>10}")
    for f in result["portfolio_folds"]:
        mark = "YES" if f["test_positive"] else "NO"
        print(f"  {f['fold']:>4} {f['train_r_per_day']:>+12.3f} {f['test_r_per_day']:>+12.3f} {mark:>10}")
    print()
    print(f"  Test-fold positivity: {result['folds_positive']} / {result['k_folds']}")
    print(f"  Gate 5/6:  {result['verdict_5of6']}")
    print(f"  Gate 4/6:  {result['verdict_4of6']}")
    print()
    print(f"  Saved: {out_path}")


def _sanitize(obj: Any) -> Any:
    if isinstance(obj, dict):
        # Drop heavy "train"/"test" DataFrames if any survived
        return {
            k: _sanitize(v)
            for k, v in obj.items()
            if not (isinstance(v, pd.DataFrame))
        }
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
