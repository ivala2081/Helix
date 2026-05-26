"""
V6.1 — calibrate absolute realized-volatility floor.

V6 used a *percentile* regime filter: skip entries when RV24 < 30th percentile
of trailing 365-day RV history. Phase 3 ablation showed that even in low-vol
periods this floor still permits entries because the percentile rebases against
recent low-vol history.

V6.1 replaces percentile with an *absolute* annualized-RV floor calibrated from
the full 2023-2024 (in-sample, V6-eligible) RV distribution. This script
computes the distribution and emits a single suggested floor value.

Output: prints stats + writes reports/v6_1_rv_floor_calibration.json
"""
from __future__ import annotations

import json
import math
import sys
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from oos_holdout import DEV_END, filter_dataset  # noqa: E402


SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT")
DATA_1H_GLOB = "data/{symbol}_1h_2023-01-01_to_2026-04-13.csv"
LOOKBACK_BARS = 24 * 24  # V6 default: 24-day RV from 1H bars


def compute_rv_series(closes: list[float]) -> list[float]:
    """Compute trailing 24-day annualized RV at each bar (after warmup)."""
    rv_series = []
    buf: deque[float] = deque(maxlen=LOOKBACK_BARS + 1)
    for c in closes:
        if c <= 0:
            continue
        buf.append(c)
        if len(buf) < LOOKBACK_BARS + 1:
            continue
        seq = list(buf)
        rets = [math.log(seq[i] / seq[i - 1]) for i in range(1, len(seq))
                if seq[i - 1] > 0 and seq[i] > 0]
        if len(rets) < 5:
            continue
        mean = sum(rets) / len(rets)
        var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
        rv_ann = math.sqrt(var) * math.sqrt(8760)
        rv_series.append(rv_ann)
    return rv_series


def main():
    print(f"[{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}] V6.1 RV floor calibration")
    print(f"  Symbols: {list(SYMBOLS)}")
    print(f"  Source: 2023-01-01 -> {DEV_END.date()} (V6 dev range; OOS held back)")
    print(f"  Lookback: {LOOKBACK_BARS} bars (24 days * 24 1H bars)")
    print()

    combined_rv = []
    per_sym = {}
    for sym in SYMBOLS:
        path = Path(DATA_1H_GLOB.format(symbol=sym))
        df = pd.read_csv(path)
        df["date"] = pd.to_datetime(df["date"], utc=True)
        df = filter_dataset(df, include_oos=False)
        # V6 dev window = 2023-01-01 -> 2025-12-31
        sd = pd.Timestamp("2023-01-01", tz="UTC")
        df = df[df["date"] >= sd].reset_index(drop=True)
        closes = df["close"].tolist()
        rv = compute_rv_series(closes)
        per_sym[sym] = rv
        combined_rv.extend(rv)
        print(f"  {sym}: {len(closes)} bars -> {len(rv)} RV samples"
              f"  mean={np.mean(rv):.3f}  p30={np.percentile(rv, 30):.3f}"
              f"  p50={np.percentile(rv, 50):.3f}  min={np.min(rv):.3f}")

    combined_arr = np.array(combined_rv)
    print()
    print("=" * 72)
    print("  COMBINED DISTRIBUTION (BTC + ETH + SOL pooled)")
    print("=" * 72)
    pctiles = [10, 20, 25, 30, 40, 50, 60, 70, 80, 90]
    print(f"  n={len(combined_arr)}")
    print(f"  mean={np.mean(combined_arr):.3f}, std={np.std(combined_arr, ddof=1):.3f}")
    print(f"  min={np.min(combined_arr):.3f}, max={np.max(combined_arr):.3f}")
    print()
    print(f"  {'percentile':>10}  {'RV (ann)':>10}")
    for p in pctiles:
        v = float(np.percentile(combined_arr, p))
        print(f"  {p:>10}  {v:>10.3f}")

    # Recommendation: P30 of the pooled distribution
    # Rationale: V6 intended to skip at "below 30th percentile". V6.1 makes
    # that floor absolute so a structurally low-vol period still gets blocked.
    p30 = float(np.percentile(combined_arr, 30))
    p25 = float(np.percentile(combined_arr, 25))
    p20 = float(np.percentile(combined_arr, 20))

    print()
    print(f"  >>> Recommended absolute floor (matches V6 P30 intent): {p30:.3f}")
    print(f"      Tighter (P25): {p25:.3f}  | Looser (P20): {p20:.3f}")

    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "symbols": list(SYMBOLS),
        "dev_range": f"2023-01-01 -> {DEV_END.date()}",
        "lookback_bars": LOOKBACK_BARS,
        "n_samples": len(combined_arr),
        "stats": {
            "mean": float(np.mean(combined_arr)),
            "std": float(np.std(combined_arr, ddof=1)),
            "min": float(np.min(combined_arr)),
            "max": float(np.max(combined_arr)),
            "percentiles": {str(p): float(np.percentile(combined_arr, p)) for p in pctiles},
        },
        "recommended_floor_p30": p30,
        "tighter_floor_p25": p25,
        "looser_floor_p20": p20,
    }
    out_path = Path("reports") / "v6_1_rv_floor_calibration.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"\n  Saved: {out_path}")


if __name__ == "__main__":
    main()
