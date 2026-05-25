"""
Out-of-sample holdout enforcement helper for V6 R&D.

Defines the held-back data range and provides a slicing helper that all
V6-development scripts must use. The OOS range is opened ONLY during
Phase 3g (OOS reality check) — no other phase may pass `include_oos=True`.

Holdout policy (frozen 2026-05-25, see docs/v6-plan.md):
  - OOS_START = 2026-01-01 00:00 UTC
  - OOS_END   = 2026-04-13 23:59 UTC

This window was chosen because:
  1. It is the most recent ~3.5 months of available backtest data.
  2. Live forward test started 2026-04-14, so OOS ends just before live —
     ensuring zero overlap between OOS evaluation and live execution.
  3. Length is ~104 days, enough for meaningful WF + stress assessment.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Tuple

import pandas as pd


OOS_START = pd.Timestamp("2026-01-01", tz="UTC")
OOS_END = pd.Timestamp("2026-04-13 23:59:59", tz="UTC")

# Maximum legal in-sample end date. All training/dev runs MUST slice <= this.
DEV_END = OOS_START - pd.Timedelta(seconds=1)


def filter_dataset(
    df: pd.DataFrame,
    include_oos: bool = False,
    column: str = "date",
) -> pd.DataFrame:
    """
    Slice a candle DataFrame to respect the OOS holdout.

    Args:
        df: DataFrame with a UTC-aware datetime column (default "date").
        include_oos: When False (default), drop rows in [OOS_START, OOS_END].
                     When True, keep only rows in that window (for Phase 3g
                     OOS reality check).
        column: Name of the datetime column.

    Returns:
        Filtered DataFrame.
    """
    if column not in df.columns:
        raise KeyError(f"Column {column!r} not in df. Columns: {list(df.columns)}")
    d = pd.to_datetime(df[column], utc=True)
    in_oos = (d >= OOS_START) & (d <= OOS_END)
    if include_oos:
        return df.loc[in_oos].reset_index(drop=True)
    return df.loc[~in_oos].reset_index(drop=True)


def describe_holdout() -> str:
    """Human-readable description for logs / reports."""
    days = (OOS_END - OOS_START).days
    return (
        f"OOS holdout: {OOS_START:%Y-%m-%d} -> {OOS_END:%Y-%m-%d} "
        f"({days} days). Dev range ends {DEV_END:%Y-%m-%d}."
    )


def get_dev_range() -> Tuple[pd.Timestamp, pd.Timestamp]:
    """Returns the in-sample dev window (start unbounded, end = DEV_END)."""
    return (pd.Timestamp("2020-01-01", tz="UTC"), DEV_END)


def get_oos_range() -> Tuple[pd.Timestamp, pd.Timestamp]:
    """Returns the OOS window."""
    return (OOS_START, OOS_END)


if __name__ == "__main__":
    print(describe_holdout())
    print(f"Generated at {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}")
