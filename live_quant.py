"""
Helix Forward-Test — Quant Analysis on LIVE data
================================================

Fetches `live_trades` from Supabase via REST API (anon key is sufficient
because the table has public SELECT policy), then applies the same
DSR/PSR/MTRL math from `quant_analysis.py` to the live sample.

Use this around day 25-30 of the forward-test to replace backtest-based
confidence with live-sample confidence for the launch decision.

Run: python3 live_quant.py
Env needed: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
           (read automatically from .env.local if present)
"""

import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path

import requests

from quant_analysis import (
    psr,
    deflated_sharpe,
    min_track_record_length,
    expected_max_sr,
    N_TRIALS,
)

# MTRL thresholds used in the live panel (must match QuantMonitor.tsx)
MTRL_TARGET_SR1 = 19
MTRL_TARGET_SR2 = 42

# Backtest reference values (from reports/quant_analysis_20260422_132943.json)
BACKTEST_REF = {
    "BTCUSDT": {"win_rate": 0.778, "profit_factor": 6.80, "sharpe_per_trade": 0.516, "mean_r": 1.54},
    "ETHUSDT": {"win_rate": 0.767, "profit_factor": 4.31, "sharpe_per_trade": 0.450, "mean_r": 1.16},
    "SOLUSDT": {"win_rate": 0.822, "profit_factor": 5.46, "sharpe_per_trade": 0.468, "mean_r": 1.25},
}

REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


# ─────────────────────────────────────────────────────────────────────
# ENV + FETCH
# ─────────────────────────────────────────────────────────────────────

def load_dotenv_local() -> None:
    """Parse .env.local into os.environ if keys are missing."""
    p = Path(__file__).parent / ".env.local"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def fetch_live_trades(symbol: str | None = None) -> list[dict]:
    base = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    params = {"select": "*", "order": "entry_ts.asc"}
    if symbol:
        params["symbol"] = f"eq.{symbol}"
    r = requests.get(f"{base}/rest/v1/live_trades", headers=headers, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


# ─────────────────────────────────────────────────────────────────────
# METRICS — trade-level on live sample
# ─────────────────────────────────────────────────────────────────────

def trade_returns_from_live(rows: list[dict]) -> list[float]:
    """Per-trade notional returns: pnl / (entry_price * size)."""
    out = []
    for t in rows:
        ep = t.get("entry_price") or 0
        sz = t.get("size") or 0
        pnl = t.get("pnl") or 0
        notional = ep * sz
        if notional > 0:
            out.append(pnl / notional)
    return out


def r_multiples_from_live(rows: list[dict]) -> list[float]:
    out = []
    for t in rows:
        r = t.get("r_multiple")
        if r is not None:
            out.append(float(r))
    return out


def summary_for_symbol(rows: list[dict], symbol: str, years_span_guess: float) -> dict:
    import numpy as np
    from scipy.stats import skew, kurtosis

    n = len(rows)
    wins = [t for t in rows if (t.get("pnl") or 0) > 0]
    losses = [t for t in rows if (t.get("pnl") or 0) <= 0]
    win_rate = len(wins) / n if n else 0.0
    sum_win = sum((t.get("pnl") or 0) for t in wins)
    sum_loss = abs(sum((t.get("pnl") or 0) for t in losses))
    pf = sum_win / sum_loss if sum_loss > 0 else float("inf")

    tr = trade_returns_from_live(rows)
    rmul = r_multiples_from_live(rows)

    if len(tr) >= 2 and np.std(tr, ddof=1) > 0:
        sr_per_trade = float(np.mean(tr) / np.std(tr, ddof=1))
        g3 = float(skew(tr, bias=False))
        g4 = float(kurtosis(tr, fisher=False, bias=False))
    else:
        sr_per_trade = 0.0
        g3 = 0.0
        g4 = 3.0

    trades_per_year = n / max(years_span_guess, 0.01) if years_span_guess > 0 else 0.0
    sr_ann = sr_per_trade * math.sqrt(trades_per_year) if trades_per_year > 0 else 0.0

    # TP hit rates from exit_reason
    tp3_count = sum(1 for t in rows if t.get("exit_reason") == "TP3")
    tp2_count = tp3_count + sum(1 for t in rows if t.get("exit_reason") == "TP2")
    tp1_count = tp2_count + sum(1 for t in rows if t.get("exit_reason") == "TP1")
    sl_count = sum(1 for t in rows if t.get("exit_reason") in ("StopLoss", "Stop Loss", "HardStop", "Hard Stop"))
    trail_count = sum(1 for t in rows if t.get("exit_reason") in ("Trailing Stop", "Trailing"))

    # DSR + MTRL (only meaningful when n is reasonable, but compute anyway)
    if n >= 3:
        psr0 = psr(sr_per_trade, n, g3, g4, sr_star=0.0)
        dsr, sr_null = deflated_sharpe(sr_per_trade, n, g3, g4, N_TRIALS)
        mtrl_sr1 = min_track_record_length(sr_per_trade, g3, g4,
                                           sr_star=1.0 / math.sqrt(max(trades_per_year, 1)),
                                           alpha=0.05)
        mtrl_sr2 = min_track_record_length(sr_per_trade, g3, g4,
                                           sr_star=2.0 / math.sqrt(max(trades_per_year, 1)),
                                           alpha=0.05)
    else:
        psr0 = 0.0
        dsr = 0.0
        sr_null = float("nan")
        mtrl_sr1 = float("inf")
        mtrl_sr2 = float("inf")

    return {
        "symbol": symbol,
        "total_trades": n,
        "win_rate": win_rate,
        "profit_factor": pf if pf != float("inf") else None,
        "sum_pnl": float(sum((t.get("pnl") or 0) for t in rows)),
        "sharpe_per_trade": sr_per_trade,
        "sharpe_annualized_trade": sr_ann,
        "skewness": g3,
        "kurtosis": g4,
        "psr_vs_zero": psr0,
        "deflated_sharpe": dsr,
        "expected_max_sr_null": sr_null if not (isinstance(sr_null, float) and math.isnan(sr_null)) else None,
        "mtrl_vs_one_ann": mtrl_sr1 if math.isfinite(mtrl_sr1) else None,
        "mtrl_vs_two_ann": mtrl_sr2 if math.isfinite(mtrl_sr2) else None,
        "mean_r_multiple": float(sum(rmul) / len(rmul)) if rmul else 0.0,
        "median_r_multiple": float(sorted(rmul)[len(rmul) // 2]) if rmul else 0.0,
        "tp1_rate": tp1_count / n if n else 0,
        "tp2_rate": tp2_count / n if n else 0,
        "tp3_rate": tp3_count / n if n else 0,
        "sl_rate": sl_count / n if n else 0,
        "trail_rate": trail_count / n if n else 0,
    }


def compare_to_backtest(live: dict) -> dict | None:
    sym = live["symbol"]
    ref = BACKTEST_REF.get(sym)
    if not ref:
        return None
    return {
        "win_rate_delta": live["win_rate"] - ref["win_rate"],
        "profit_factor_delta": (live["profit_factor"] or 0) - ref["profit_factor"],
        "sharpe_per_trade_delta": live["sharpe_per_trade"] - ref["sharpe_per_trade"],
        "mean_r_delta": live["mean_r_multiple"] - ref["mean_r"],
    }


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────

def main():
    load_dotenv_local()
    for required in ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"):
        if required not in os.environ:
            raise SystemExit(f"Missing env var: {required}")

    print("\n" + "=" * 72)
    print("  HELIX FORWARD-TEST — LIVE QUANT ANALYSIS")
    print("  " + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
    print("=" * 72)

    all_trades = fetch_live_trades()
    print(f"  Total live trades fetched: {len(all_trades)}")

    # Time span of live data (for trades/year annualization)
    if all_trades:
        ts_min = min(t["entry_ts"] for t in all_trades) / 1000.0
        ts_max = max(t["exit_ts"] for t in all_trades) / 1000.0
        years_span = (ts_max - ts_min) / (365.25 * 24 * 3600)
        print(f"  Date range: {datetime.fromtimestamp(ts_min, timezone.utc):%Y-%m-%d} -> "
              f"{datetime.fromtimestamp(ts_max, timezone.utc):%Y-%m-%d}  ({years_span:.3f} yr)")
    else:
        years_span = 0.0
        print("  No live trades yet — nothing to analyze.")
        return

    # Aggregate (all symbols)
    print(f"\n[AGGREGATE — all symbols, n={len(all_trades)}]")
    agg = summary_for_symbol(all_trades, "AGGREGATE", years_span)
    _print_block(agg, mtrl_ref=MTRL_TARGET_SR1)

    # Per-symbol
    symbols = sorted({t["symbol"] for t in all_trades})
    per_symbol = {}
    for sym in symbols:
        rows = [t for t in all_trades if t["symbol"] == sym]
        block = summary_for_symbol(rows, sym, years_span)
        per_symbol[sym] = block
        print(f"\n[{sym} — n={len(rows)}]")
        _print_block(block, mtrl_ref=MTRL_TARGET_SR1)
        cmp = compare_to_backtest(block)
        if cmp:
            print("  vs backtest reference:")
            print(f"    d Win Rate:           {cmp['win_rate_delta']:+.3f}")
            print(f"    d Profit Factor:      {cmp['profit_factor_delta']:+.2f}")
            print(f"    d Sharpe (per-trade): {cmp['sharpe_per_trade_delta']:+.3f}")
            print(f"    d Mean R-multiple:    {cmp['mean_r_delta']:+.2f}R")

    # Launch-decision view
    print("\n[LAUNCH DECISION PROJECTION]")
    n = len(all_trades)
    print(f"  Live sample size:               {n}")
    print(f"  MTRL target (SR > 1, 95%):      {MTRL_TARGET_SR1}  ({'REACHED' if n >= MTRL_TARGET_SR1 else f'need {MTRL_TARGET_SR1 - n} more'})")
    print(f"  MTRL target (SR > 2, 95%):      {MTRL_TARGET_SR2}  ({'REACHED' if n >= MTRL_TARGET_SR2 else f'need {MTRL_TARGET_SR2 - n} more'})")
    if n >= MTRL_TARGET_SR1:
        verdict = (
            "LAUNCH current engine" if agg["deflated_sharpe"] >= 0.95 and agg["sharpe_per_trade"] > 0
            else "DELAY + engine-realism reset" if agg["deflated_sharpe"] >= 0.5
            else "KILL or rebuild strategy"
        )
        print(f"  Live DSR:                       {agg['deflated_sharpe']:.3f}")
        print(f"  >>> VERDICT: {verdict}")
    else:
        print(f"  >>> VERDICT: INSUFFICIENT DATA — continue silent run")

    # Persist
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_trades": n,
        "years_span": years_span,
        "aggregate": agg,
        "per_symbol": per_symbol,
    }

    def _sanitize(o):
        if isinstance(o, dict): return {k: _sanitize(v) for k, v in o.items()}
        if isinstance(o, list): return [_sanitize(v) for v in o]
        if isinstance(o, float) and (math.isinf(o) or math.isnan(o)): return None
        return o

    path = REPORTS_DIR / f"live_quant_{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(_sanitize(out), f, indent=2, default=str)
    print(f"\n  Raw results: {path}")


def _print_block(b: dict, mtrl_ref: int) -> None:
    pf = b["profit_factor"]
    pf_str = "inf" if pf is None else f"{pf:.2f}"
    print(f"  Win Rate:             {b['win_rate']:.3f}")
    print(f"  Profit Factor:        {pf_str}")
    print(f"  Sum PnL ($):          {b['sum_pnl']:+.2f}")
    print(f"  Sharpe per trade:     {b['sharpe_per_trade']:+.3f}")
    print(f"  Sharpe annualized:    {b['sharpe_annualized_trade']:+.2f}")
    print(f"  Skew / Kurtosis:      {b['skewness']:+.2f} / {b['kurtosis']:.2f}")
    print(f"  Mean R / Median R:    {b['mean_r_multiple']:+.2f} / {b['median_r_multiple']:+.2f}")
    print(f"  TP1/2/3 hit rates:    {b['tp1_rate']:.0%} / {b['tp2_rate']:.0%} / {b['tp3_rate']:.0%}")
    print(f"  SL / Trail rates:     {b['sl_rate']:.0%} / {b['trail_rate']:.0%}")
    if b["total_trades"] >= 3:
        print(f"  PSR(SR>0):            {b['psr_vs_zero']:.3f}")
        print(f"  Deflated Sharpe:      {b['deflated_sharpe']:.3f}  (null max = {b['expected_max_sr_null']})")


if __name__ == "__main__":
    main()
