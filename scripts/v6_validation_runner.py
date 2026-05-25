"""
V6 validation runner — Phase 3.

Runs the full V6 validation battery and writes four JSON artifacts:

  reports/v6_validation_run.json   — 7 ablation runs (3a-3g) + V5_fair baseline
  reports/v6_walk_forward.json     — V6 full 6-fold WF on the constrained set
  reports/v6_stress_tests.json     — V6 full on 4 frozen regime windows
  reports/v6_oos_holdout.json      — V6 full on 2026-Q1 (Phase 3g)

Copies of each are written to public/data/v6/ for the research dashboard.

Constraints (frozen by data availability and docs/v6-plan.md):
  - Symbols restricted to {BTCUSDT, ETHUSDT, SOLUSDT} — the 3 symbols with
    30M data available (V6 MTF agreement requires it).
  - In-sample date range: 2024-01-01 → DEV_END. 30M files start 2024-01-01.
  - V5_fair baseline runs V5_PARAMS on the SAME constrained set so the
    "V6 beats V5 by +20% PF / +0.2 Sharpe" gate is apples-to-apples.
  - OOS window: 2026-01-01 → 2026-04-13 (oos_holdout.py, never touched
    outside this script's 3g block).

Usage
-----
    python scripts/v6_validation_runner.py
    python scripts/v6_validation_runner.py --skip-wf --skip-stress
    python scripts/v6_validation_runner.py --only-oos
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_ROOT))
sys.path.insert(0, str(_ROOT / "scripts"))

from backtester import Backtester  # noqa: E402
from oos_holdout import DEV_END, describe_holdout, filter_dataset  # noqa: E402
from strategy import STRATEGY_PARAMS as V5_PARAMS  # noqa: E402
from strategy_v6 import V6_PARAMS  # noqa: E402

# Reuse the portfolio aggregation logic from the concurrent BT runner so
# ablations are reported on the same metric definitions as Phase 1.
from multi_symbol_concurrent_backtest import aggregate_portfolio  # noqa: E402
from walk_forward_validator import split_folds  # noqa: E402


# ─────────────────────────────────────────────────────────────────────
# Constants — frozen by data availability
# ─────────────────────────────────────────────────────────────────────

V6_SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT")
DATA_1H_GLOB = "data/{symbol}_1h_2023-01-01_to_2026-04-13.csv"
DATA_30M_GLOB = "data/{symbol}_30m_2024-01-01_to_2026-04-13.csv"

DEV_START = "2024-01-01"  # 30M data starts here

REPORTS_DIR = Path("reports")
DASHBOARD_DIR = Path("public/data/v6")


# ─────────────────────────────────────────────────────────────────────
# Ablation configs — overrides applied on top of V6_PARAMS
# ─────────────────────────────────────────────────────────────────────

# Each entry: (label, description, overrides_dict)
ABLATIONS = [
    (
        "3a_v6_full",
        "V6 full — all 6 changes active",
        {},
    ),
    (
        "3b_no_regime",
        "V6 minus regime filter (RV percentile floor)",
        {"use_v6_regime_filter": False},
    ),
    (
        "3c_no_mtf",
        "V6 minus MTF agreement (30M trend bias)",
        {"use_v6_mtf_agreement": False},
    ),
    (
        "3d_no_trail",
        "V6 minus trailing TP (revert to V5 TP1/TP2/TP3 mix)",
        {
            "trail_after_tp1": False,
            "tp1_close_pct": V5_PARAMS["tp1_close_pct"],
            "tp2_close_pct": V5_PARAMS["tp2_close_pct"],
            "tp3_close_pct": V5_PARAMS["tp3_close_pct"],
        },
    ),
    (
        "3e_no_adapt",
        "V6 minus adaptive sizing (fixed V5 risk_pct)",
        {"use_v6_adaptive_sizing": False},
    ),
    (
        "3f_no_realism",
        "V6 minus stricter realism (revert slippage/spread/hard-stop/2-bar to V5)",
        {
            "slippage_atr_frac": V5_PARAMS["slippage_atr_frac"],
            "spread_atr_frac": V5_PARAMS["spread_atr_frac"],
            "hard_stop_atr_mult": V5_PARAMS["hard_stop_atr_mult"],
            "tp_require_close_bars": 1,
        },
    ),
]

OOS_CONFIG = (
    "3g_oos_v6_full",
    "V6 full on 2026-Q1 held-back OOS data",
    {},
)


# Stress windows — copied from stress_test_runner DEFAULT_WINDOWS but
# scoped to the V6-eligible date range (>= 2024-01-01).
V6_STRESS_WINDOWS = [
    (
        "low_vol_apr_aug_2024",
        "2024-04-01",
        "2024-08-31",
        "Low realized vol — regime filter must keep us out / minimize damage",
    ),
    (
        "bull_dec_2024",
        "2024-12-01",
        "2024-12-31",
        "BTC bull spike — V6 must capture, not be filtered out",
    ),
    (
        "chop_jan_feb_2025",
        "2025-01-15",
        "2025-02-28",
        "Post-bull chop — V6 should produce few trades, low losses",
    ),
    (
        "summer_drift_2025",
        "2025-06-01",
        "2025-08-31",
        "Mid-2025 drift — V6 vs V5 trade-count delta indicator",
    ),
]


# ─────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────

def load_1h(symbol: str, start: str, end: str, include_oos: bool) -> pd.DataFrame:
    path = Path(DATA_1H_GLOB.format(symbol=symbol))
    if not path.exists():
        raise FileNotFoundError(path)
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    sd = pd.Timestamp(start, tz="UTC")
    ed = pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1)
    df = df[(df["date"] >= sd) & (df["date"] < ed)].reset_index(drop=True)
    df = filter_dataset(df, include_oos=include_oos)
    return df


def load_30m(symbol: str, start: str, end: str, include_oos: bool) -> pd.DataFrame:
    path = Path(DATA_30M_GLOB.format(symbol=symbol))
    if not path.exists():
        raise FileNotFoundError(path)
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    sd = pd.Timestamp(start, tz="UTC")
    ed = pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1)
    df = df[(df["date"] >= sd) & (df["date"] < ed)].reset_index(drop=True)
    df = filter_dataset(df, include_oos=include_oos)
    return df


# ─────────────────────────────────────────────────────────────────────
# Single-config runner — runs one params set across all V6 symbols
# ─────────────────────────────────────────────────────────────────────

def run_config(
    label: str,
    params: dict,
    symbols: tuple,
    start: str,
    end: str,
    include_oos: bool,
    needs_30m: bool,
) -> dict:
    """Run a single config across all symbols, return per-symbol + aggregate."""
    runs = []
    for sym in symbols:
        df_1h = load_1h(sym, start, end, include_oos)
        if len(df_1h) < 200:
            print(f"    [{label}] {sym}: only {len(df_1h)} bars, skipping")
            continue

        kwargs = dict(params)
        if needs_30m:
            df_30m = load_30m(sym, start, end, include_oos)
            if len(df_30m) < 100:
                print(f"    [{label}] {sym}: only {len(df_30m)} 30M bars, skipping")
                continue
            kwargs["df_30m"] = df_30m

        bt = Backtester(**kwargs)
        out = bt.run(df_1h)
        trades = out["trades"]
        eq_df = pd.DataFrame(
            {"date": df_1h["date"].values, "equity": out["equity_curve"]}
        ).set_index("date").sort_index()

        runs.append({
            "symbol": sym,
            "metrics": out["metrics"],
            "equity_curve": eq_df,
            "n_trades": len(trades),
            "trades": trades,
        })

    if not runs:
        return {"label": label, "skipped": True, "reason": "no symbols ran"}

    agg = aggregate_portfolio(runs, float(params["initial_capital"]))

    per_sym_rows = []
    for r in runs:
        m = r["metrics"]
        pf = m.get("profit_factor", 0.0)
        per_sym_rows.append({
            "symbol": r["symbol"],
            "n_trades": m.get("total_trades", 0),
            "win_rate": m.get("win_rate", 0.0),
            "profit_factor": pf if isinstance(pf, (int, float)) and math.isfinite(pf) else None,
            "total_return_pct": m.get("total_return_pct", 0.0),
            "max_drawdown_pct": m.get("max_drawdown_pct", 0.0),
            "sharpe_ratio": m.get("sharpe_ratio", 0.0),
            "avg_r_multiple": m.get("avg_r_multiple", 0),
        })

    # Portfolio-level profit factor recomputed across all symbols' trades
    pf_num = 0.0
    pf_den = 0.0
    for r in runs:
        for t in r["trades"]:
            if t.pnl is None:
                continue
            if t.pnl > 0:
                pf_num += float(t.pnl)
            else:
                pf_den += -float(t.pnl)
    portfolio_pf = pf_num / pf_den if pf_den > 0 else float("inf")

    agg["portfolio_profit_factor"] = (
        portfolio_pf if math.isfinite(portfolio_pf) else None
    )

    return {
        "label": label,
        "per_symbol": per_sym_rows,
        "portfolio_aggregate": agg,
    }


# ─────────────────────────────────────────────────────────────────────
# Ablation matrix — 3a-3f in-sample + 3g OOS
# ─────────────────────────────────────────────────────────────────────

def make_v6_params(overrides: dict) -> dict:
    p = deepcopy(V6_PARAMS)
    p.update(overrides)
    return p


def run_ablations(symbols: tuple, start: str, end: str) -> dict:
    """Run V5_fair baseline + 6 V6 ablations on the constrained set."""
    results = []

    # V5_fair baseline (same symbols, same date range, V5_PARAMS)
    print(f"  [V5_fair] running V5_PARAMS on V6-constrained set...")
    v5_result = run_config(
        label="V5_fair",
        params=V5_PARAMS,
        symbols=symbols,
        start=start,
        end=end,
        include_oos=False,
        needs_30m=False,
    )
    v5_result["description"] = "V5 honest baseline on V6 symbol/date set (apples-to-apples comparator)"
    results.append(v5_result)

    # 6 V6 ablations
    for label, desc, overrides in ABLATIONS:
        params = make_v6_params(overrides)
        # MTF data only needed when MTF is active in this ablation
        needs_30m = params.get("use_v6_mtf_agreement", False)
        print(f"  [{label}] {desc}")
        result = run_config(
            label=label,
            params=params,
            symbols=symbols,
            start=start,
            end=end,
            include_oos=False,
            needs_30m=needs_30m,
        )
        result["description"] = desc
        result["overrides"] = overrides
        results.append(result)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "constraint_note": (
            f"Symbols {list(symbols)} (3 with 30M data), "
            f"dev range {start} → {end}. V5_fair runs same set for comparison."
        ),
        "holdout_policy": describe_holdout(),
        "symbols": list(symbols),
        "date_range": {"start": start, "end": end},
        "ablations": results,
    }


def run_oos(symbols: tuple) -> dict:
    """3g — V6 full on 2026-Q1 held-back data."""
    label, desc, overrides = OOS_CONFIG
    params = make_v6_params(overrides)
    print(f"  [{label}] {desc}")
    result = run_config(
        label=label,
        params=params,
        symbols=symbols,
        start="2026-01-01",
        end="2026-04-13",
        include_oos=True,
        needs_30m=True,
    )
    result["description"] = desc

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "symbols": list(symbols),
        "oos_window": {"start": "2026-01-01", "end": "2026-04-13"},
        "holdout_policy": describe_holdout(),
        "result": result,
    }


# ─────────────────────────────────────────────────────────────────────
# Walk-forward — V6 full only
# ─────────────────────────────────────────────────────────────────────

def run_v6_walk_forward(
    symbols: tuple,
    start: str,
    end: str,
    k: int = 6,
    train_pct: float = 0.60,
) -> dict:
    """V6 full 6-fold WF. Built here instead of reusing walk_forward_validator's
    main() because we need to pass df_30m per symbol per fold."""
    per_symbol_folds: dict[str, list[dict]] = {s: [] for s in symbols}

    for sym in symbols:
        df_1h = load_1h(sym, start, end, include_oos=False)
        df_30m = load_30m(sym, start, end, include_oos=False)
        folds_1h = split_folds(df_1h, k, train_pct)

        # Slice 30M to match each 1H fold's time window
        for f in folds_1h:
            train_start = f["train"]["date"].iloc[0]
            train_end = f["train"]["date"].iloc[-1] + pd.Timedelta(hours=1)
            test_start = f["test"]["date"].iloc[0]
            test_end = f["test"]["date"].iloc[-1] + pd.Timedelta(hours=1)

            df_30m_train = df_30m[
                (df_30m["date"] >= train_start) & (df_30m["date"] < train_end)
            ].reset_index(drop=True)
            df_30m_test = df_30m[
                (df_30m["date"] >= test_start) & (df_30m["date"] < test_end)
            ].reset_index(drop=True)

            metric = _v6_fold_metric(
                f["train"], f["test"], df_30m_train, df_30m_test, V6_PARAMS, sym,
            )
            metric["fold"] = f["fold"]
            metric["window"] = {"start": f["start"], "end": f["end"]}
            per_symbol_folds[sym].append(metric)
        print(f"    [{sym}] {len(df_1h)} 1H bars, {k} folds — done")

    # Aggregate per-fold across symbols
    portfolio_folds = []
    for i in range(k):
        test_r = 0.0
        train_r = 0.0
        test_days = 0
        train_days = 0
        for sym in symbols:
            m = per_symbol_folds[sym][i]
            test_r += m["test"]["r_total"]
            train_r += m["train"]["r_total"]
            test_days = max(test_days, m["test"]["days"])
            train_days = max(train_days, m["train"]["days"])
        portfolio_folds.append({
            "fold": i + 1,
            "test_r_per_day": test_r / test_days if test_days else 0,
            "test_total_r": test_r,
            "test_days": test_days,
            "test_positive": (test_r / test_days if test_days else 0) > 0,
            "train_r_per_day": train_r / train_days if train_days else 0,
            "train_total_r": train_r,
        })

    folds_positive = sum(1 for f in portfolio_folds if f["test_positive"])
    pass_5of6 = folds_positive >= 5
    pass_4of6 = folds_positive >= 4

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "params_label": "V6_PARAMS",
        "date_range": {"start": start, "end": end},
        "symbols": list(symbols),
        "result": {
            "k_folds": k,
            "train_pct": train_pct,
            "folds_positive": folds_positive,
            "verdict_5of6": "PASS" if pass_5of6 else "FAIL",
            "verdict_4of6": "PASS" if pass_4of6 else "FAIL",
            "portfolio_folds": portfolio_folds,
            "per_symbol_folds": per_symbol_folds,
        },
    }


def _v6_fold_metric(
    train: pd.DataFrame,
    test: pd.DataFrame,
    df_30m_train: pd.DataFrame,
    df_30m_test: pd.DataFrame,
    params: dict,
    symbol: str,
) -> dict:
    """V6-aware fold metric — passes df_30m to Backtester."""
    out_train = Backtester(**params, df_30m=df_30m_train).run(train)
    out_test = Backtester(**params, df_30m=df_30m_test).run(test)

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
        metrics = out["metrics"]
        return {
            "n_trades": n,
            "win_rate": wr,
            "profit_factor": pf if math.isfinite(pf) else None,
            "r_total": r_total,
            "r_per_day": r_total / days,
            "days": days,
            "total_return_pct": metrics.get("total_return_pct", 0.0),
            "sharpe_ratio": metrics.get("sharpe_ratio", 0.0),
        }

    return {
        "symbol": symbol,
        "train": summarize(out_train, train),
        "test": summarize(out_test, test),
    }


# ─────────────────────────────────────────────────────────────────────
# Stress tests — V6 full on regime windows
# ─────────────────────────────────────────────────────────────────────

def run_v6_stress(symbols: tuple) -> dict:
    rows = []
    for label, start, end, watch in V6_STRESS_WINDOWS:
        print(f"  [stress:{label}] {start} -> {end}")
        per_sym = []
        for sym in symbols:
            df_1h = load_1h(sym, start, end, include_oos=False)
            df_30m = load_30m(sym, start, end, include_oos=False)
            if len(df_1h) < 100:
                per_sym.append({
                    "symbol": sym, "skipped": True,
                    "reason": f"only {len(df_1h)} 1H bars",
                })
                continue
            bt = Backtester(**V6_PARAMS, df_30m=df_30m)
            out = bt.run(df_1h)
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
            days = max(1, (df_1h["date"].iloc[-1] - df_1h["date"].iloc[0]).days)
            m = out["metrics"]
            per_sym.append({
                "symbol": sym,
                "n_trades": n,
                "win_rate": wr,
                "profit_factor": pf if math.isfinite(pf) else None,
                "r_total": r_total,
                "r_per_day": r_total / days,
                "total_return_pct": m.get("total_return_pct", 0.0),
                "max_drawdown_pct": m.get("max_drawdown_pct", 0.0),
                "sharpe_ratio": m.get("sharpe_ratio", 0.0),
                "days": days,
            })
        valid = [r for r in per_sym if not r.get("skipped")]
        n_total = sum(r["n_trades"] for r in valid)
        r_total = sum(r["r_total"] for r in valid)
        wr_avg = (
            sum(r["win_rate"] * r["n_trades"] for r in valid) / n_total
            if n_total else 0
        )
        max_days = max((r["days"] for r in valid), default=0)
        rows.append({
            "label": label,
            "start": start,
            "end": end,
            "what_to_watch": watch,
            "n_trades_total": n_total,
            "win_rate_aggregate": wr_avg,
            "r_total": r_total,
            "r_per_day": r_total / max_days if max_days else 0,
            "days": max_days,
            "per_symbol": per_sym,
        })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "params_label": "V6_PARAMS",
        "symbols": list(symbols),
        "windows": rows,
    }


# ─────────────────────────────────────────────────────────────────────
# Output utilities
# ─────────────────────────────────────────────────────────────────────

def write_report(payload: dict, name: str) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPORTS_DIR / name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(_sanitize(payload), f, indent=2, default=str)
    # Mirror to dashboard
    shutil.copy(out_path, DASHBOARD_DIR / name)
    return out_path


def _sanitize(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {
            k: _sanitize(v)
            for k, v in obj.items()
            if not isinstance(v, pd.DataFrame)
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


# ─────────────────────────────────────────────────────────────────────
# Pretty printing
# ─────────────────────────────────────────────────────────────────────

def print_ablation_table(report: dict) -> None:
    print()
    print("=" * 92)
    print(f"  ABLATION MATRIX - V5_fair + 6 V6 configs")
    print("=" * 92)
    hdr = f"  {'config':>18}  {'n':>4}  {'Ret%':>8}  {'PF':>6}  {'Sharpe':>7}  {'DD%':>6}  {'R/day':>7}"
    print(hdr)
    print("  " + "-" * 88)
    for ab in report["ablations"]:
        if ab.get("skipped"):
            print(f"  {ab['label']:>18}  [SKIPPED] {ab.get('reason', '')}")
            continue
        agg = ab["portfolio_aggregate"]
        pf = agg.get("portfolio_profit_factor")
        pf_str = "inf" if pf is None else f"{pf:.2f}"
        print(
            f"  {ab['label']:>18}  {agg['n_trades_total']:>4}  "
            f"{agg['portfolio_return_pct']:>+8.2f}  {pf_str:>6}  "
            f"{agg['portfolio_sharpe_annualized']:>+7.2f}  "
            f"{agg['portfolio_max_dd_pct']:>5.2f}  "
            f"{agg['portfolio_r_per_day']:>+7.3f}"
        )


def print_wf_table(report: dict) -> None:
    print()
    print("=" * 72)
    res = report["result"]
    print(f"  V6 WALK-FORWARD - {res['k_folds']}-fold")
    print("=" * 72)
    print(f"  {'fold':>4} {'train R/day':>12} {'test R/day':>12} {'pos?':>6}")
    for f in res["portfolio_folds"]:
        mark = "YES" if f["test_positive"] else "NO"
        print(
            f"  {f['fold']:>4} {f['train_r_per_day']:>+12.3f} "
            f"{f['test_r_per_day']:>+12.3f} {mark:>6}"
        )
    print()
    print(f"  Folds positive: {res['folds_positive']} / {res['k_folds']}")
    print(f"  Gate 5/6:  {res['verdict_5of6']}")
    print(f"  Gate 4/6:  {res['verdict_4of6']}")


def print_stress_table(report: dict) -> None:
    print()
    print("=" * 82)
    print(f"  V6 STRESS TESTS (constrained set)")
    print("=" * 82)
    print(f"  {'window':>22}  {'n':>4}  {'WR':>6}  {'R/day':>8}  {'R_tot':>8}")
    print("  " + "-" * 78)
    for r in report["windows"]:
        print(
            f"  {r['label']:>22}  {r['n_trades_total']:>4}  "
            f"{r['win_rate_aggregate']*100:>5.1f}%  "
            f"{r['r_per_day']:>+8.3f}  {r['r_total']:>+8.2f}"
        )


def print_oos_table(report: dict) -> None:
    print()
    print("=" * 72)
    print(f"  V6 OOS HOLDOUT - 2026-Q1")
    print("=" * 72)
    res = report["result"]
    if res.get("skipped"):
        print(f"  [SKIPPED] {res.get('reason')}")
        return
    agg = res["portfolio_aggregate"]
    pf = agg.get("portfolio_profit_factor")
    pf_str = "inf" if pf is None else f"{pf:.2f}"
    print(f"  trades:      {agg['n_trades_total']}")
    print(f"  return:      {agg['portfolio_return_pct']:+.2f}%")
    print(f"  PF:          {pf_str}")
    print(f"  Sharpe:      {agg['portfolio_sharpe_annualized']:+.2f}")
    print(f"  Max DD:      {agg['portfolio_max_dd_pct']:.2f}%")
    print(f"  R/day:       {agg['portfolio_r_per_day']:+.3f}")


# ─────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="V6 Phase 3 validation runner")
    ap.add_argument("--symbols", default=",".join(V6_SYMBOLS))
    ap.add_argument("--start", default=DEV_START)
    ap.add_argument("--end", default=str(DEV_END.date()))
    ap.add_argument("--skip-ablations", action="store_true")
    ap.add_argument("--skip-wf", action="store_true")
    ap.add_argument("--skip-stress", action="store_true")
    ap.add_argument("--skip-oos", action="store_true")
    ap.add_argument("--only-ablations", action="store_true")
    ap.add_argument("--only-wf", action="store_true")
    ap.add_argument("--only-stress", action="store_true")
    ap.add_argument("--only-oos", action="store_true")
    args = ap.parse_args()

    symbols = tuple(s.strip() for s in args.symbols.split(",") if s.strip())

    print(f"[{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}] V6 validation runner")
    print(f"  Symbols: {list(symbols)}")
    print(f"  Range:   {args.start} -> {args.end}")
    print(f"  {describe_holdout()}")
    print()

    # Resolve which stages to run
    only_flags = [args.only_ablations, args.only_wf, args.only_stress, args.only_oos]
    if any(only_flags):
        run_ab = args.only_ablations
        run_wf = args.only_wf
        run_st = args.only_stress
        run_o = args.only_oos
    else:
        run_ab = not args.skip_ablations
        run_wf = not args.skip_wf
        run_st = not args.skip_stress
        run_o = not args.skip_oos

    if run_ab:
        print(">>> Phase 3a-3f: Ablation matrix")
        ab_report = run_ablations(symbols, args.start, args.end)
        ab_path = write_report(ab_report, "v6_validation_run.json")
        print(f"    saved: {ab_path}")
        print_ablation_table(ab_report)

    if run_wf:
        print()
        print(">>> Phase 3: V6 walk-forward")
        wf_report = run_v6_walk_forward(symbols, args.start, args.end)
        wf_path = write_report(wf_report, "v6_walk_forward.json")
        print(f"    saved: {wf_path}")
        print_wf_table(wf_report)

    if run_st:
        print()
        print(">>> Phase 3: V6 stress tests")
        st_report = run_v6_stress(symbols)
        st_path = write_report(st_report, "v6_stress_tests.json")
        print(f"    saved: {st_path}")
        print_stress_table(st_report)

    if run_o:
        print()
        print(">>> Phase 3g: V6 OOS holdout (2026-Q1)")
        oos_report = run_oos(symbols)
        oos_path = write_report(oos_report, "v6_oos_holdout.json")
        print(f"    saved: {oos_path}")
        print_oos_table(oos_report)

    print()
    print("=" * 72)
    print("V6 validation runner - done.")


if __name__ == "__main__":
    main()
