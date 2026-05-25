"""
Stress test runner — backtest the strategy on specific market regimes.

Runs the strategy on hand-picked date windows to confirm it doesn't
catastrophically fail in a particular regime:

  - Low-vol Apr-Aug 2024: did the strategy stall and bleed?
  - Chop Sep-Oct 2023: did it generate noise trades?
  - Bull Dec 2024: did it capture the move?

Each window is run independently per symbol and aggregated. Output: a
per-window metrics table.

Usage
-----
    python scripts/stress_test_runner.py \\
        --symbols BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT \\
        --out reports/v5_stress_tests.json
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
from oos_holdout import describe_holdout, filter_dataset  # noqa: E402
from strategy import STRATEGY_PARAMS  # noqa: E402


DEFAULT_SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT")
DEFAULT_DATA_GLOB = "data/{symbol}_1h_2023-01-01_to_2026-04-13.csv"

# Frozen stress windows for V6 R&D (see docs/v6-plan.md).
# Each tuple: (label, start, end, what-to-watch-for).
DEFAULT_WINDOWS = [
    ("low_vol_apr_aug_2024", "2024-04-01", "2024-08-31",
     "Low realized vol — does the strategy stall and bleed via TP1-then-BE?"),
    ("chop_sep_oct_2023", "2023-09-01", "2023-10-31",
     "Ranging/chop — does the entry filter produce noise trades?"),
    ("bull_dec_2024", "2024-12-01", "2024-12-31",
     "BTC bull spike — does the strategy capture momentum cleanly?"),
    ("crash_aug_2023", "2023-08-15", "2023-09-15",
     "Mid-2023 BTC pullback — does the SL/hard-stop discipline hold?"),
]


def load_symbol_window(
    symbol: str, start: str, end: str, include_oos: bool
) -> pd.DataFrame:
    p = Path(DEFAULT_DATA_GLOB.format(symbol=symbol))
    if not p.exists():
        raise FileNotFoundError(p)
    df = pd.read_csv(p)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    sd = pd.Timestamp(start, tz="UTC")
    ed = pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1)
    df = df[(df["date"] >= sd) & (df["date"] < ed)].reset_index(drop=True)
    df = filter_dataset(df, include_oos=include_oos)
    return df


def run_window(symbol: str, start: str, end: str, params: dict) -> dict:
    df = load_symbol_window(symbol, start, end, include_oos=False)
    # If window touches OOS, filter_dataset already removed those rows.
    # If <200 bars after filter, can't run.
    if len(df) < 100:
        return {"symbol": symbol, "skipped": True, "reason": f"only {len(df)} bars"}
    bt = Backtester(**params)
    out = bt.run(df)
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
    m = out["metrics"]
    return {
        "symbol": symbol,
        "n_trades": n,
        "win_rate": wr,
        "profit_factor": pf if math.isfinite(pf) else None,
        "r_total": r_total,
        "r_per_day": r_total / days,
        "total_return_pct": m["total_return_pct"],
        "max_drawdown_pct": m["max_drawdown_pct"],
        "sharpe_ratio": m["sharpe_ratio"],
        "days": days,
    }


def run_stress_tests(
    symbols: list[str], windows: list[tuple], params: dict
) -> list[dict]:
    rows = []
    for label, start, end, watch in windows:
        per_sym = [run_window(s, start, end, params) for s in symbols]

        # Aggregate (sum trades, sum R, equal-weighted return)
        valid = [r for r in per_sym if not r.get("skipped")]
        n_total = sum(r["n_trades"] for r in valid)
        r_total = sum(r["r_total"] for r in valid)
        wr_avg = (
            sum(r["win_rate"] * r["n_trades"] for r in valid) / n_total
            if n_total
            else 0
        )
        max_days = max((r["days"] for r in valid), default=0)
        r_per_day = r_total / max_days if max_days else 0

        rows.append({
            "label": label,
            "start": start,
            "end": end,
            "what_to_watch": watch,
            "n_trades_total": n_total,
            "win_rate_aggregate": wr_avg,
            "r_total": r_total,
            "r_per_day": r_per_day,
            "days": max_days,
            "per_symbol": per_sym,
        })
    return rows


def main():
    ap = argparse.ArgumentParser(description="Stress test runner")
    ap.add_argument("--symbols", default=",".join(DEFAULT_SYMBOLS))
    ap.add_argument("--out", default="reports/v5_stress_tests.json")
    ap.add_argument("--label", default="V5_DEFAULTS")
    args = ap.parse_args()

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    print(f"[{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}] Stress test runner")
    print(f"  Symbols: {symbols}")
    print(f"  Params:  {args.label}")
    print(f"  Windows: {len(DEFAULT_WINDOWS)}")
    print(f"  {describe_holdout()}")

    rows = run_stress_tests(symbols, DEFAULT_WINDOWS, STRATEGY_PARAMS)

    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "params_label": args.label,
        "symbols": symbols,
        "windows": rows,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(_sanitize(out), f, indent=2, default=str)

    print()
    print("=" * 78)
    print(f"  STRESS TEST RESULTS")
    print("=" * 78)
    hdr = f"  {'window':>22}  {'n':>4}  {'WR':>6}  {'R/day':>8}  {'R_tot':>8}"
    print(hdr)
    print("  " + "-" * 76)
    for r in rows:
        print(
            f"  {r['label']:>22}  {r['n_trades_total']:>4}  "
            f"{r['win_rate_aggregate']*100:>5.1f}%  "
            f"{r['r_per_day']:>+8.3f}  {r['r_total']:>+8.2f}"
        )
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
