"""
V6 smoke test — Phase 2 gate.

Run V6 on a single symbol (BTCUSDT) to verify all modules wire up and the
backtester produces non-NaN trades with the new logic active. Compares
V5 vs V6 metrics side-by-side as a sanity check.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from backtester import Backtester
from oos_holdout import DEV_END, filter_dataset
from strategy import STRATEGY_PARAMS as V5_PARAMS
from strategy_v6 import V6_PARAMS


SYMBOL = "BTCUSDT"
DATA_1H = f"data/{SYMBOL}_1h_2023-01-01_to_2026-04-13.csv"
DATA_30M = f"data/{SYMBOL}_30m_2024-01-01_to_2026-04-13.csv"


def load(path: str, min_date: str | None = None) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    if min_date is not None:
        df = df[df["date"] >= pd.Timestamp(min_date, tz="UTC")].reset_index(drop=True)
    df = filter_dataset(df, include_oos=False)
    return df


def summarize(label: str, out: dict) -> None:
    trades = out["trades"]
    n = len(trades)
    wins = sum(1 for t in trades if t.pnl and t.pnl > 0)
    wr = wins / n if n else 0
    sw = sum(t.pnl for t in trades if t.pnl and t.pnl > 0)
    sl = -sum(t.pnl for t in trades if t.pnl and t.pnl <= 0)
    pf = sw / sl if sl > 0 else float("inf")
    m = out["metrics"]
    print(
        f"  {label:>4}  n={n:>4}  WR={wr*100:>5.1f}%  PF={pf:>6.2f}  "
        f"Ret={m['total_return_pct']:+7.1f}%  DD={m['max_drawdown_pct']:>5.1f}%  "
        f"SR={m['sharpe_ratio']:>5.2f}"
    )


def main():
    print(f"V6 smoke test — {SYMBOL}")
    # 30M data only goes back to 2024-01-01, so the smoke test scopes to that window
    df_1h = load(DATA_1H, min_date="2024-01-01")
    df_30m = load(DATA_30M, min_date="2024-01-01")
    print(f"  Loaded {len(df_1h)} 1H bars, {len(df_30m)} 30M bars")
    print()

    print("Running V5...")
    bt_v5 = Backtester(**V5_PARAMS)
    out_v5 = bt_v5.run(df_1h)

    print("Running V6 full...")
    bt_v6 = Backtester(**V6_PARAMS, df_30m=df_30m)
    out_v6 = bt_v6.run(df_1h)

    print()
    print("=" * 78)
    print("  RESULTS")
    print("=" * 78)
    print()
    summarize("V5", out_v5)
    summarize("V6", out_v6)
    print()

    # Sanity assertions
    n_v6 = len(out_v6["trades"])
    if n_v6 == 0:
        print("  [WARN] V6 produced 0 trades — filters too aggressive?")
        sys.exit(1)
    if not all(t.pnl is not None for t in out_v6["trades"]):
        print("  [FAIL] V6 trades have NaN pnl — engine bug")
        sys.exit(1)
    pnl_total = sum(t.pnl for t in out_v6["trades"])
    if math.isnan(pnl_total) or math.isinf(pnl_total):
        print(f"  [FAIL] V6 total pnl is non-finite: {pnl_total}")
        sys.exit(1)

    print(f"  [PASS] V6 produced {n_v6} valid trades.")
    print(f"  [PASS] All pnl values are finite.")
    print()
    print(f"  V6 vs V5 trade count delta: {n_v6 - len(out_v5['trades']):+d}")
    print(f"  V6 vs V5 return delta:      {out_v6['metrics']['total_return_pct'] - out_v5['metrics']['total_return_pct']:+.2f}%")


if __name__ == "__main__":
    main()
