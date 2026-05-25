"""
V6 Per-Symbol Validator — pre-flight and in-live eligibility checks.

Implements Change 2.6 of the V6 plan:

  Pre-flight (before a symbol is deployed live):
    - >= 80 trades in 90-day rolling backtest
    - profit factor >= 1.3
    - walk-forward: >= 4 of 5 folds positive

  In-live (rolling):
    - 30-day rolling profit factor < 1.0 → auto-suspend

The pre-flight is run as a one-shot per symbol when V6 is ready to deploy.
The in-live check is run by the cron worker each tick (NOT YET WIRED — Phase 5).

Usage
-----
    res = run_preflight(symbol="BTCUSDT", params=V6_PARAMS)
    if res.passes:
        # symbol eligible
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd

from backtester import Backtester
from oos_holdout import filter_dataset


DEFAULT_DATA_GLOB = "data/{symbol}_1h_2023-01-01_to_2026-04-13.csv"


@dataclass
class PreflightResult:
    symbol: str
    passes: bool
    n_trades: int
    profit_factor: Optional[float]
    wf_folds_positive: int
    wf_folds_total: int
    reasons: list


@dataclass
class LiveCheckResult:
    symbol: str
    suspend: bool
    rolling_pf: Optional[float]
    n_trades_in_window: int
    reason: str


def _profit_factor(trades) -> Optional[float]:
    sw = sum(t.pnl for t in trades if t.pnl and t.pnl > 0)
    sl = -sum(t.pnl for t in trades if t.pnl and t.pnl <= 0)
    if sl <= 0:
        return None
    return sw / sl


def run_preflight(
    symbol: str,
    params: dict,
    min_n_trades: int = 80,
    min_profit_factor: float = 1.3,
    min_wf_folds_positive: int = 4,
    wf_folds_total: int = 5,
    data_glob: str = DEFAULT_DATA_GLOB,
) -> PreflightResult:
    """
    Run a full-history backtest + 5-fold walk-forward on the symbol with
    the given V6 params. Return the pass/fail verdict.
    """
    reasons: list = []
    p = Path(data_glob.format(symbol=symbol))
    if not p.exists():
        return PreflightResult(
            symbol=symbol, passes=False, n_trades=0,
            profit_factor=None, wf_folds_positive=0, wf_folds_total=wf_folds_total,
            reasons=[f"data file missing: {p}"],
        )
    df = pd.read_csv(p)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df = filter_dataset(df, include_oos=False)

    # Full backtest
    bt = Backtester(**params)
    out = bt.run(df)
    trades = out["trades"]
    n = len(trades)
    pf = _profit_factor(trades)

    if n < min_n_trades:
        reasons.append(f"n={n} below threshold {min_n_trades}")
    if pf is None or pf < min_profit_factor:
        reasons.append(
            f"PF={pf if pf is None else round(pf, 2)} below threshold {min_profit_factor}"
        )

    # Walk-forward (5 folds, 60/40 train/test)
    fold_positives = 0
    chunk = len(df) // wf_folds_total
    for i in range(wf_folds_total):
        start = i * chunk
        end = (i + 1) * chunk if i < wf_folds_total - 1 else len(df)
        fold = df.iloc[start:end].reset_index(drop=True)
        split_at = int(len(fold) * 0.6)
        test = fold.iloc[split_at:].reset_index(drop=True)
        if len(test) < 50:
            continue
        out_test = Backtester(**params).run(test)
        test_trades = out_test["trades"]
        r_total = sum(
            (t.pnl / t.risk_amount)
            for t in test_trades
            if t.pnl is not None and t.risk_amount and t.risk_amount > 0
        )
        if r_total > 0:
            fold_positives += 1

    if fold_positives < min_wf_folds_positive:
        reasons.append(
            f"WF {fold_positives}/{wf_folds_total} folds positive (need >= {min_wf_folds_positive})"
        )

    passes = (
        n >= min_n_trades
        and pf is not None
        and pf >= min_profit_factor
        and fold_positives >= min_wf_folds_positive
    )

    return PreflightResult(
        symbol=symbol,
        passes=passes,
        n_trades=n,
        profit_factor=pf,
        wf_folds_positive=fold_positives,
        wf_folds_total=wf_folds_total,
        reasons=reasons,
    )


def check_live_eligibility(
    symbol: str,
    recent_trades_pnl: list[float],
    days_window: int = 30,
    min_rolling_pf: float = 1.0,
) -> LiveCheckResult:
    """
    Check whether a symbol should remain live based on rolling-window PF.
    `recent_trades_pnl` is a chronological list of PnL values for trades that
    exited within the last `days_window` days (caller's responsibility to slice).
    """
    n = len(recent_trades_pnl)
    if n < 5:
        return LiveCheckResult(
            symbol=symbol, suspend=False, rolling_pf=None,
            n_trades_in_window=n, reason="warmup (n<5)",
        )
    sw = sum(p for p in recent_trades_pnl if p > 0)
    sl = -sum(p for p in recent_trades_pnl if p <= 0)
    pf = sw / sl if sl > 0 else float("inf")
    if pf < min_rolling_pf:
        return LiveCheckResult(
            symbol=symbol, suspend=True, rolling_pf=pf,
            n_trades_in_window=n,
            reason=f"rolling PF {pf:.2f} below {min_rolling_pf} in {days_window}d window",
        )
    return LiveCheckResult(
        symbol=symbol, suspend=False, rolling_pf=pf,
        n_trades_in_window=n, reason="ok",
    )
