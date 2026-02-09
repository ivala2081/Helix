"""
Generate self-contained HTML dashboard for the trading strategy.
Runs backtest + all validations, embeds results in a single HTML file.

Run: python3 generate_dashboard.py
Output: reports/dashboard.html
"""

import json
import math
import time
from copy import deepcopy
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from strategy import run_backtest, STRATEGY_PARAMS
from backtester import Backtester, walk_forward_test
from validate_strategy import (
    test_multi_asset, test_sensitivity, test_out_of_sample,
    WINNER_PARAMS, load_data,
)
from stake_manager import SizingMethod

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_PATH = Path(__file__).parent / "reports" / "dashboard.html"


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def safe_run(name, func, *args, **kwargs):
    """Run a function, return result or error dict."""
    try:
        return {"status": "ok", "data": func(*args, **kwargs)}
    except Exception as e:
        print(f"  WARNING: {name} failed: {e}")
        return {"status": "error", "error": str(e), "data": None}


def sanitize_value(v):
    """Make a single value JSON-safe."""
    if isinstance(v, float) and (math.isinf(v) or math.isnan(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v) if not (math.isinf(v) or math.isnan(v)) else None
    if isinstance(v, np.ndarray):
        return v.tolist()
    if isinstance(v, dict):
        return sanitize_metrics(v)
    return v


def sanitize_metrics(m: dict) -> dict:
    """Replace inf/nan with None for JSON serialization."""
    return {k: sanitize_value(v) for k, v in m.items()}


def trade_to_dict(t) -> dict:
    """Convert Trade dataclass to JSON-safe dict."""
    return {
        "entry_bar": t.entry_bar,
        "entry_price": float(t.entry_price),
        "entry_date": str(t.entry_date),
        "exit_bar": t.exit_bar,
        "exit_price": float(t.exit_price) if t.exit_price else None,
        "exit_date": str(t.exit_date) if t.exit_date else None,
        "direction": t.direction,
        "size": float(t.size),
        "stop_loss": float(t.stop_loss),
        "take_profit_1": float(t.take_profit_1),
        "take_profit_2": float(t.take_profit_2),
        "take_profit_3": float(t.take_profit_3),
        "pnl": float(t.pnl) if t.pnl is not None else None,
        "pnl_pct": float(t.pnl_pct) if t.pnl_pct is not None else None,
        "bars_held": t.bars_held,
        "exit_reason": t.exit_reason,
        "signal_score": float(t.signal_score),
        "risk_amount": float(t.risk_amount),
        "max_favorable": float(t.max_favorable),
        "max_adverse": float(t.max_adverse),
    }


def downsample_equity(equity_curve, dates, close_prices, initial_capital, target_points=800):
    """Downsample equity curve, compute drawdown, and buy-and-hold benchmark."""
    equity = np.array(equity_curve)
    running_max = np.maximum.accumulate(equity)
    drawdown_pct = (equity - running_max) / running_max * 100

    # Buy-and-hold: invest initial_capital at bar 0 price
    closes = np.array(close_prices, dtype=float)
    bnh = initial_capital * (closes / closes[0])

    n = len(equity)
    step = max(1, n // target_points)
    indices = list(range(0, n, step))
    if indices[-1] != n - 1:
        indices.append(n - 1)

    return {
        "values": [round(float(equity[i]), 2) for i in indices],
        "buy_hold": [round(float(bnh[i]), 2) for i in indices],
        "dates": [str(dates[i])[:16] for i in indices],
        "drawdown_pct": [round(float(drawdown_pct[i]), 3) for i in indices],
    }


def prepare_ohlcv(df, resample_interval="4h"):
    """Resample OHLCV data for Lightweight Charts."""
    df_r = df.set_index("date").resample(resample_interval).agg({
        "open": "first", "high": "max", "low": "min",
        "close": "last", "volume": "sum"
    }).dropna()

    return [{
        "time": int(idx.timestamp()),
        "open": round(float(row["open"]), 2),
        "high": round(float(row["high"]), 2),
        "low": round(float(row["low"]), 2),
        "close": round(float(row["close"]), 2),
        "volume": round(float(row["volume"]), 2),
    } for idx, row in df_r.iterrows()]


def prepare_trade_markers(trades):
    """Create markers for Lightweight Charts."""
    markers = []
    for t in trades:
        entry_ts = int(pd.Timestamp(t.entry_date).timestamp())
        # Round to nearest 4h boundary for resampled chart
        entry_ts = (entry_ts // 14400) * 14400

        markers.append({
            "time": entry_ts,
            "position": "belowBar" if t.direction == "LONG" else "aboveBar",
            "color": "#26a69a" if t.direction == "LONG" else "#ef5350",
            "shape": "arrowUp" if t.direction == "LONG" else "arrowDown",
            "text": f"{'L' if t.direction == 'LONG' else 'S'}",
        })

        if t.exit_date:
            exit_ts = int(pd.Timestamp(t.exit_date).timestamp())
            exit_ts = (exit_ts // 14400) * 14400
            color = "#26a69a" if t.pnl and t.pnl > 0 else "#ef5350"
            markers.append({
                "time": exit_ts,
                "position": "aboveBar" if t.direction == "LONG" else "belowBar",
                "color": color,
                "shape": "circle",
                "text": t.exit_reason or "X",
            })

    markers.sort(key=lambda m: m["time"])
    # Dedupe markers on same timestamp
    seen = set()
    unique = []
    for m in markers:
        key = (m["time"], m["shape"], m["position"])
        if key not in seen:
            seen.add(key)
            unique.append(m)
    return unique


def compute_monthly_returns(trades, initial_capital):
    """Compute monthly returns grid."""
    monthly = {}
    for t in trades:
        if t.pnl is None or t.exit_date is None:
            continue
        dt = pd.Timestamp(t.exit_date)
        year, month = str(dt.year), dt.month
        if year not in monthly:
            monthly[year] = {}
        monthly[year][month] = monthly[year].get(month, 0.0) + t.pnl

    # Convert to percentage
    for year in monthly:
        for month in monthly[year]:
            monthly[year][month] = round(monthly[year][month] / initial_capital * 100, 2)

    return monthly


def run_monte_carlo_with_histogram(trades, initial_capital=10_000, n_sims=10_000):
    """Monte Carlo simulation with raw histogram data."""
    pnls = np.array([t.pnl for t in trades if t.pnl is not None])
    n_trades = len(pnls)

    np.random.seed(42)
    sim_max_dds = np.zeros(n_sims)

    for sim in range(n_sims):
        shuffled = np.random.permutation(pnls)
        equity = initial_capital + np.cumsum(shuffled)
        equity = np.insert(equity, 0, initial_capital)
        running_max = np.maximum.accumulate(equity)
        drawdowns = (equity - running_max) / running_max * 100
        sim_max_dds[sim] = abs(drawdowns.min())

    # Total return is always the same regardless of order
    total_return = float(pnls.sum() / initial_capital * 100)

    # Histogram for max DD
    dd_counts, dd_edges = np.histogram(sim_max_dds, bins=50)
    dd_centers = [(dd_edges[i] + dd_edges[i + 1]) / 2 for i in range(len(dd_counts))]

    percentiles = {}
    for p in [1, 5, 10, 25, 50, 75, 90, 95, 99]:
        percentiles[str(p)] = round(float(np.percentile(sim_max_dds, p)), 2)

    return {
        "n_trades": n_trades,
        "n_simulations": n_sims,
        "total_return": total_return,
        "median_dd": round(float(np.median(sim_max_dds)), 2),
        "p95_dd": round(float(np.percentile(sim_max_dds, 95)), 2),
        "p99_dd": round(float(np.percentile(sim_max_dds, 99)), 2),
        "prob_negative": 0.0,  # return is fixed
        "prob_dd_15": round(float((sim_max_dds >= 15).mean() * 100), 2),
        "prob_dd_25": round(float((sim_max_dds >= 25).mean() * 100), 2),
        "dd_histogram": {
            "centers": [round(c, 2) for c in dd_centers],
            "counts": dd_counts.tolist(),
        },
        "percentiles": percentiles,
    }


def run_walk_forward(df, params):
    """Run walk-forward and extract serializable results."""
    wf = walk_forward_test(df, params, n_folds=5, train_pct=0.6)
    # Strip full_metrics from folds (too large)
    folds = []
    for f in wf["folds"]:
        folds.append({
            "fold": f["fold"],
            "train_trades": f["train_trades"],
            "test_trades": f["test_trades"],
            "train_pnl": round(f["train_pnl"], 2),
            "test_pnl": round(f["test_pnl"], 2),
            "train_return_pct": round(f["train_return_pct"], 2),
            "test_return_pct": round(f["test_return_pct"], 2),
            "test_profitable": f["test_profitable"],
        })
    return {
        "folds": folds,
        "passing_folds": wf["passing_folds"],
        "total_folds": wf["total_folds"],
        "pass_rate": round(wf["pass_rate"], 2),
        "avg_test_return_pct": round(wf["avg_test_return_pct"], 2),
    }


def collect_multi_asset(multi_results):
    """Extract clean multi-asset comparison data."""
    assets = {}
    wf_data = {}
    for key, val in multi_results.items():
        if key.endswith("_wf"):
            symbol = key.replace("_wf", "")
            wf_data[symbol] = {
                "passing_folds": val.get("passing_folds", 0),
                "total_folds": val.get("total_folds", 5),
            }
        elif isinstance(val, dict) and "total_trades" in val:
            assets[key] = {
                "trades": val["total_trades"],
                "return_pct": round(val.get("total_return_pct", 0), 2),
                "sharpe": round(val.get("sharpe_ratio", 0), 2),
                "max_dd": round(val.get("max_drawdown_pct", 0), 2),
                "win_rate": round(val.get("win_rate", 0) * 100, 1),
                "profit_factor": round(val.get("profit_factor", 0), 2),
                "payoff": round(val.get("payoff_ratio", 0), 2),
            }
    # Merge WF data into assets
    for symbol in assets:
        if symbol in wf_data:
            assets[symbol]["wf_pass"] = wf_data[symbol]["passing_folds"]
            assets[symbol]["wf_total"] = wf_data[symbol]["total_folds"]
    return assets


def collect_sensitivity(sens_results):
    """Extract clean sensitivity data."""
    clean = {}
    for param_name, results in sens_results.items():
        clean[param_name] = [
            {
                "value": r["value"],
                "return_pct": round(r.get("return", 0), 2),
                "sharpe": round(r.get("sharpe", 0), 2),
                "max_dd": round(r.get("max_dd", 0), 2),
                "trades": r.get("trades", 0),
                "pf": round(r.get("pf", 0), 2),
            }
            for r in results
        ]
    return clean


def collect_oos(oos_results):
    """Extract OOS comparison data."""
    tm = oos_results["train_metrics"]
    tsm = oos_results["test_metrics"]

    compare = []
    for name, key in [
        ("Return %", "total_return_pct"),
        ("Sharpe", "sharpe_ratio"),
        ("Win Rate %", "win_rate"),
        ("Profit Factor", "profit_factor"),
        ("Max DD %", "max_drawdown_pct"),
        ("Trades", "total_trades"),
        ("Expectancy $", "expectancy"),
    ]:
        tv = tm.get(key, 0)
        tsv = tsm.get(key, 0)
        if key == "win_rate":
            tv *= 100
            tsv *= 100
        change = (tsv - tv) / abs(tv) * 100 if tv != 0 else 0
        compare.append({
            "name": name,
            "train": round(tv, 2) if isinstance(tv, float) else tv,
            "test": round(tsv, 2) if isinstance(tsv, float) else tsv,
            "change_pct": round(change, 1),
        })

    return {
        "oos_profitable": oos_results["oos_profitable"],
        "comparison": compare,
    }


# ═══════════════════════════════════════════════════════════════
# V3 DATA FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def compute_treasury_simulation(trades, initial_capital, data_duration_years):
    """Treasury simulation: replay trade-by-trade at multiple leverage levels."""
    leverage_levels = [1, 2, 3, 5, 10, 20]
    FUNDING_RATE_PER_8H = 0.0001  # 0.01% per 8h (crypto perp avg)

    pnls = [t.pnl for t in trades if t.pnl is not None]
    wins = [p for p in pnls if p > 0]
    losses = [abs(p) for p in pnls if p <= 0]
    win_rate = len(wins) / len(pnls) if pnls else 0
    avg_win = sum(wins) / len(wins) if wins else 0
    avg_loss = sum(losses) / len(losses) if losses else 1
    payoff_ratio = avg_win / avg_loss if avg_loss > 0 else 0
    risk_pct = 0.02

    # Kelly criterion
    kelly_f = max(win_rate - (1 - win_rate) / payoff_ratio, 0) if payoff_ratio > 0 else 0
    optimal_leverage = kelly_f / risk_pct if risk_pct > 0 and kelly_f > 0 else 1
    half_kelly_leverage = optimal_leverage / 2

    results = {}
    for lev in leverage_levels:
        equity = initial_capital
        peak_equity = initial_capital
        equity_curve = [equity]
        equity_dates = [str(trades[0].entry_date)[:16] if trades else ""]
        monthly_pnls = {}
        max_dd_pct = 0.0
        liquidated = False
        total_funding = 0.0

        for trade in trades:
            if liquidated:
                equity_curve.append(0)
                equity_dates.append(str(trade.exit_date or trade.entry_date)[:16])
                continue

            duration_hours = trade.bars_held or 0
            # Funding cost only for leveraged positions
            notional = trade.entry_price * trade.size * lev
            funding_cost = notional * FUNDING_RATE_PER_8H * (duration_hours / 8) if lev > 1 else 0
            total_funding += funding_cost

            leveraged_pnl = trade.pnl * lev - funding_cost
            equity += leveraged_pnl

            if trade.exit_date:
                mk = str(trade.exit_date)[:7]
                monthly_pnls[mk] = monthly_pnls.get(mk, 0) + leveraged_pnl

            peak_equity = max(peak_equity, equity)
            if peak_equity > 0:
                dd = (peak_equity - equity) / peak_equity * 100
                max_dd_pct = max(max_dd_pct, dd)

            if equity <= 0:
                liquidated = True
                equity = 0

            equity_curve.append(equity)
            equity_dates.append(str(trade.exit_date or trade.entry_date)[:16])

        final_equity = equity_curve[-1]
        total_return_pct = (final_equity - initial_capital) / initial_capital * 100

        # CAGR
        if data_duration_years > 0 and final_equity > 0:
            cagr = ((final_equity / initial_capital) ** (1 / data_duration_years) - 1) * 100
        else:
            cagr = -100 if final_equity <= 0 else 0

        # Monthly stats
        monthly_vals = list(monthly_pnls.values())
        avg_monthly = sum(monthly_vals) / len(monthly_vals) if monthly_vals else 0
        if len(monthly_vals) > 1:
            marr = np.array(monthly_vals)
            sharpe = (marr.mean() / marr.std()) * np.sqrt(12) if marr.std() > 0 else 0
            downside = marr[marr < 0]
            sortino = (marr.mean() / downside.std()) * np.sqrt(12) if len(downside) > 0 and downside.std() > 0 else 0
        else:
            sharpe, sortino = 0, 0

        # Time to 2x
        time_to_2x = None
        for idx, eq in enumerate(equity_curve):
            if eq >= initial_capital * 2 and idx < len(trades):
                t_start = pd.Timestamp(trades[0].entry_date)
                t_end = pd.Timestamp(trades[min(idx, len(trades) - 1)].exit_date or trades[min(idx, len(trades) - 1)].entry_date)
                time_to_2x = round((t_end - t_start).days / 30.44, 1)
                break

        # Downsample equity curve
        step = max(1, len(equity_curve) // 200)
        ds_idx = list(range(0, len(equity_curve), step))
        if ds_idx[-1] != len(equity_curve) - 1:
            ds_idx.append(len(equity_curve) - 1)

        results[str(lev)] = {
            "leverage": lev,
            "final_equity": round(final_equity, 2),
            "total_return_pct": round(total_return_pct, 2),
            "cagr": round(cagr, 2),
            "max_dd_pct": round(max_dd_pct, 2),
            "sharpe": round(sharpe, 2),
            "sortino": round(sortino, 2),
            "avg_monthly_income": round(avg_monthly, 2),
            "time_to_2x_months": time_to_2x,
            "liquidated": liquidated,
            "total_funding_cost": round(total_funding, 2),
            "equity_curve": [round(equity_curve[i], 2) for i in ds_idx],
            "equity_dates": [equity_dates[min(i, len(equity_dates) - 1)] for i in ds_idx],
        }

    # Risk of ruin Monte Carlo (5K sims per leverage)
    n_mc = 5000
    np.random.seed(42)
    risk_of_ruin = {}
    for lev in leverage_levels:
        ruin_count = 0
        for _ in range(n_mc):
            shuffled = np.random.permutation(pnls)
            eq = initial_capital
            for p in shuffled:
                eq += p * lev
                if eq <= 0:
                    ruin_count += 1
                    break
        risk_of_ruin[str(lev)] = round(ruin_count / n_mc * 100, 2)

    # Capital projection table
    starting_capitals = [1000, 5000, 10000, 25000, 50000, 100000]
    hk_lev = max(1, min(20, round(half_kelly_leverage)))
    proj_levs = [1, 3, hk_lev]
    capital_projections = []
    for cap in starting_capitals:
        row = {"starting": cap, "columns": []}
        for pl in proj_levs:
            lev_key = str(pl)
            if lev_key in results:
                mult = results[lev_key]["final_equity"] / initial_capital
                mi = results[lev_key]["avg_monthly_income"] * (cap / initial_capital)
            else:
                # Interpolate from closest
                mult = 1 + (results["1"]["total_return_pct"] / 100 * pl)
                mi = results["1"]["avg_monthly_income"] * pl * (cap / initial_capital)
            row["columns"].append({
                "leverage": pl,
                "final": round(cap * mult, 2),
                "monthly": round(mi, 2),
            })
        capital_projections.append(row)

    return {
        "leverage_results": results,
        "kelly_fraction": round(kelly_f, 4),
        "optimal_leverage": round(optimal_leverage, 2),
        "half_kelly_leverage": round(half_kelly_leverage, 2),
        "win_rate": round(win_rate, 4),
        "payoff_ratio": round(payoff_ratio, 4),
        "risk_of_ruin": risk_of_ruin,
        "capital_projections": capital_projections,
        "projection_leverages": proj_levs,
        "data_duration_years": round(data_duration_years, 2),
        "total_trades": len(pnls),
    }


def compute_duration_analysis(trades):
    """Analyze PnL by trade duration buckets."""
    buckets = [
        (0, 5, "0-5h"), (5, 10, "5-10h"), (10, 20, "10-20h"),
        (20, 50, "20-50h"), (50, 100, "50-100h"),
        (100, 200, "100-200h"), (200, float("inf"), "200h+"),
    ]
    result = []
    for lo, hi, label in buckets:
        bt = [t for t in trades if t.bars_held is not None and lo <= t.bars_held < hi]
        count = len(bt)
        total_pnl = sum(t.pnl for t in bt if t.pnl is not None)
        avg_pnl = total_pnl / count if count > 0 else 0
        wr = len([t for t in bt if t.pnl and t.pnl > 0]) / count * 100 if count > 0 else 0
        result.append({
            "label": label, "count": count,
            "total_pnl": round(total_pnl, 2),
            "avg_pnl": round(avg_pnl, 2),
            "win_rate": round(wr, 1),
        })
    return result


def compute_yearly_performance(trades, initial_capital):
    """Year-by-year breakdown."""
    yearly = {}
    for t in trades:
        if t.pnl is None or t.exit_date is None:
            continue
        year = str(pd.Timestamp(t.exit_date).year)
        if year not in yearly:
            yearly[year] = []
        yearly[year].append(t.pnl)

    result = {}
    for year, pnls in sorted(yearly.items()):
        wins = [p for p in pnls if p > 0]
        losses_sum = abs(sum(p for p in pnls if p <= 0))
        result[year] = {
            "trades": len(pnls),
            "return_pct": round(sum(pnls) / initial_capital * 100, 2),
            "total_pnl": round(sum(pnls), 2),
            "win_rate": round(len(wins) / len(pnls) * 100, 1) if pnls else 0,
            "expectancy": round(sum(pnls) / len(pnls), 2) if pnls else 0,
            "profit_factor": round(sum(wins) / losses_sum, 2) if losses_sum > 0 else 999,
        }
    return result


def compute_profit_concentration(trades):
    """Profit concentration in top N trades."""
    profitable = sorted(
        [t for t in trades if t.pnl is not None and t.pnl > 0],
        key=lambda t: t.pnl, reverse=True
    )
    total_profit = sum(t.pnl for t in profitable)
    result = {}
    for n in [5, 10, 20]:
        top = profitable[:n]
        tp = sum(t.pnl for t in top)
        result[f"top_{n}"] = {
            "count": min(n, len(profitable)),
            "profit": round(tp, 2),
            "pct_of_total": round(tp / total_profit * 100, 1) if total_profit > 0 else 0,
        }
    return result


def compute_r_multiple_distribution(trades):
    """R-multiple histogram data."""
    r_mults = [t.pnl / t.risk_amount for t in trades if t.risk_amount > 0 and t.pnl is not None]
    if not r_mults:
        return None
    r_arr = np.array(r_mults)
    bins = np.arange(-3, 6.5, 0.5)
    counts, edges = np.histogram(r_arr, bins=bins)
    centers = [(edges[i] + edges[i + 1]) / 2 for i in range(len(counts))]
    return {
        "centers": [round(c, 2) for c in centers],
        "counts": counts.tolist(),
        "mean_r": round(float(r_arr.mean()), 3),
        "median_r": round(float(np.median(r_arr)), 3),
    }


# ═══════════════════════════════════════════════════════════════
# HTML TEMPLATE
# ═══════════════════════════════════════════════════════════════

def build_html(data: dict) -> str:
    """Build the complete HTML dashboard."""
    data_json = json.dumps(data, default=str)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trading Dashboard &mdash; BTC 1H MS+FVG Strategy</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="https://unpkg.com/lightweight-charts@4/dist/lightweight-charts.standalone.production.js"></script>
<style>
:root {{
    --bg-primary: #0d1117;
    --bg-card: #161b22;
    --bg-hover: #1c2333;
    --border: #30363d;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --text-muted: #484f58;
    --green: #26a69a;
    --red: #ef5350;
    --blue: #58a6ff;
    --yellow: #ffa726;
    --purple: #bc8cff;
    --cyan: #39d2c0;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:var(--bg-primary); color:var(--text-primary); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }}
header {{
    background:var(--bg-card);
    border-bottom:1px solid var(--border);
    padding:16px 24px;
    display:flex;
    align-items:center;
    justify-content:space-between;
}}
header h1 {{ font-size:18px; font-weight:600; }}
header h1 span {{ color:var(--blue); }}
header .meta {{ font-size:12px; color:var(--text-secondary); }}

.dashboard {{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:16px;
    padding:16px;
    max-width:1600px;
    margin:0 auto;
}}
.full-width {{ grid-column: 1 / -1; }}

.panel {{
    background:var(--bg-card);
    border:1px solid var(--border);
    border-radius:8px;
    padding:20px;
    overflow:hidden;
}}
.panel-title {{
    font-size:13px;
    font-weight:600;
    color:var(--text-secondary);
    text-transform:uppercase;
    letter-spacing:0.5px;
    margin-bottom:16px;
    padding-bottom:8px;
    border-bottom:1px solid var(--border);
}}

/* KPI Cards */
.kpi-row {{ display:flex; gap:12px; flex-wrap:wrap; }}
.kpi-card {{
    flex:1 1 130px;
    text-align:center;
    padding:16px 12px;
    background:var(--bg-primary);
    border:1px solid var(--border);
    border-radius:8px;
}}
.kpi-value {{ font-size:26px; font-weight:700; display:block; margin-bottom:4px; }}
.kpi-label {{ font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; }}
.positive {{ color:var(--green); }}
.negative {{ color:var(--red); }}
.neutral {{ color:var(--blue); }}

/* Monthly table */
.monthly-table {{ width:100%; border-collapse:collapse; font-size:12px; }}
.monthly-table th,.monthly-table td {{
    padding:6px 8px;
    text-align:center;
    border:1px solid var(--border);
}}
.monthly-table th {{ background:var(--bg-primary); color:var(--text-secondary); font-weight:600; }}
.monthly-table td {{ min-width:55px; }}
.monthly-table .empty {{ color:var(--text-muted); }}
.year-cell {{ font-weight:600; color:var(--text-primary); background:var(--bg-primary); }}

/* Charts */
.chart-container {{ position:relative; }}

/* Tables */
.data-table {{ width:100%; border-collapse:collapse; font-size:12px; margin-top:12px; }}
.data-table th,.data-table td {{ padding:8px 10px; text-align:left; border-bottom:1px solid var(--border); }}
.data-table th {{ color:var(--text-secondary); font-weight:600; text-transform:uppercase; font-size:10px; }}
.data-table td {{ color:var(--text-primary); }}

.badge {{
    display:inline-block;
    padding:2px 8px;
    border-radius:4px;
    font-size:11px;
    font-weight:600;
}}
.badge-pass {{ background:rgba(38,166,154,0.2); color:var(--green); }}
.badge-fail {{ background:rgba(239,83,80,0.2); color:var(--red); }}

.sub-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }}

.stat-row {{ display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border); font-size:13px; }}
.stat-label {{ color:var(--text-secondary); }}
.stat-value {{ font-weight:600; }}

.error-msg {{
    padding:20px;
    text-align:center;
    color:var(--text-muted);
    font-style:italic;
}}

/* Color-coded KPI borders */
.kpi-card.kpi-good {{ border-left:3px solid var(--green); }}
.kpi-card.kpi-warn {{ border-left:3px solid var(--yellow); }}
.kpi-card.kpi-bad {{ border-left:3px solid var(--red); }}
.kpi-card.kpi-info {{ border-left:3px solid var(--blue); }}

/* Treasury panel */
.treasury-grid {{ display:grid; grid-template-columns:2fr 1fr; gap:16px; }}
.info-box {{
    background:var(--bg-primary);
    border:1px solid var(--border);
    border-radius:8px;
    padding:16px;
    margin-bottom:12px;
}}
.info-box-title {{ font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; font-weight:600; }}
.warning-box {{
    background:rgba(255,167,38,0.08);
    border:1px solid rgba(255,167,38,0.3);
    border-radius:8px;
    padding:12px;
    margin-top:12px;
}}
.warning-title {{ font-size:11px; color:var(--yellow); font-weight:600; margin-bottom:6px; }}

@media (max-width:1200px) {{
    .treasury-grid {{ grid-template-columns:1fr; }}
}}
@media (max-width:1024px) {{
    .dashboard {{ grid-template-columns:1fr; }}
    .sub-grid {{ grid-template-columns:1fr; }}
}}
</style>
</head>
<body>

<header>
    <h1><span>BTC 1H</span> &mdash; Market Structure + FVG Strategy</h1>
    <div class="meta">Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")} | Data: Jan 2023 &ndash; Feb 2026</div>
</header>

<main class="dashboard">

    <!-- 1. KPI Cards -->
    <section id="kpi-cards" class="full-width">
        <div class="kpi-row" id="kpi-container"></div>
    </section>

    <!-- 2. Price Chart -->
    <section id="price-section" class="panel full-width">
        <div class="panel-title">Price Chart with Trade Signals</div>
        <div id="lw-chart" style="height:450px;"></div>
    </section>

    <!-- 3. Equity + Drawdown -->
    <section id="equity-section" class="panel full-width">
        <div class="panel-title">Equity Curve &amp; Drawdown</div>
        <div style="height:250px;"><canvas id="equity-chart"></canvas></div>
        <div style="height:130px;margin-top:8px;"><canvas id="dd-chart"></canvas></div>
    </section>

    <!-- 4. Monthly Returns -->
    <section id="monthly-section" class="panel full-width">
        <div class="panel-title">Monthly Returns</div>
        <div id="monthly-container"></div>
    </section>

    <!-- 5. Trade Analysis -->
    <section id="trade-section" class="panel">
        <div class="panel-title">Trade Analysis</div>
        <div style="height:220px;"><canvas id="pnl-hist"></canvas></div>
        <div class="sub-grid" style="margin-top:12px;">
            <div style="height:200px;"><canvas id="exit-pie"></canvas></div>
            <div style="height:200px;"><canvas id="dir-pie"></canvas></div>
        </div>
        <div id="trade-stats" style="margin-top:12px;"></div>
        <div style="height:180px;margin-top:16px;"><canvas id="r-multiple-hist"></canvas></div>
        <div id="profit-concentration" style="margin-top:12px;"></div>
    </section>

    <!-- 6. Monte Carlo -->
    <section id="mc-section" class="panel">
        <div class="panel-title">Monte Carlo Simulation</div>
        <div id="mc-content"></div>
    </section>

    <!-- 7. Multi-Asset + Sensitivity -->
    <section id="multi-section" class="panel">
        <div class="panel-title">Multi-Asset &amp; Sensitivity</div>
        <div id="multi-content"></div>
    </section>

    <!-- 8. Walk-Forward + OOS -->
    <section id="wf-section" class="panel">
        <div class="panel-title">Walk-Forward &amp; Out-of-Sample</div>
        <div id="wf-content"></div>
    </section>

    <!-- 9. Treasury Simulation -->
    <section id="treasury-section" class="panel full-width">
        <div class="panel-title">Treasury Simulation &mdash; Capital Growth with Leverage</div>
        <div id="treasury-content">
            <div class="treasury-grid">
                <div><div style="height:350px;"><canvas id="treasury-equity-chart"></canvas></div></div>
                <div><div id="kelly-info"></div><div id="treasury-summary"></div></div>
            </div>
            <div style="margin-top:20px;height:280px;"><canvas id="risk-return-chart"></canvas></div>
            <div id="leverage-table" style="margin-top:20px;"></div>
            <div style="margin-top:20px;height:250px;"><canvas id="monthly-income-chart"></canvas></div>
            <div id="capital-proj-table" style="margin-top:20px;"></div>
        </div>
    </section>

    <!-- 10. Duration Analysis -->
    <section id="duration-section" class="panel">
        <div class="panel-title">Trade Duration Analysis</div>
        <div style="height:200px;"><canvas id="dur-count-chart"></canvas></div>
        <div style="height:200px;margin-top:12px;"><canvas id="dur-pnl-chart"></canvas></div>
        <div id="dur-table" style="margin-top:12px;"></div>
    </section>

    <!-- 11. Yearly Performance -->
    <section id="yearly-section" class="panel">
        <div class="panel-title">Yearly Performance Breakdown</div>
        <div style="height:220px;"><canvas id="yearly-chart"></canvas></div>
        <div id="yearly-table" style="margin-top:12px;"></div>
    </section>

</main>

<script>
const DATA = {data_json};

// ── Chart.js defaults ──
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#1c2333';
Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.boxWidth = 12;

// ═══════════════════════════════════════════════════════
// 1. KPI CARDS
// ═══════════════════════════════════════════════════════
function renderKPIs() {{
    const m = DATA.metrics;
    const kpis = [
        {{ label:'Total Return', value:(m.total_return_pct||0).toFixed(1)+'%', cls:m.total_return_pct>0?'positive':'negative', border:m.total_return_pct>20?'kpi-good':'kpi-warn' }},
        {{ label:'CAGR', value:(m.annualized_return_pct||0).toFixed(1)+'%', cls:m.annualized_return_pct>0?'positive':'negative', border:m.annualized_return_pct>15?'kpi-good':'kpi-warn' }},
        {{ label:'Sharpe Ratio', value:(m.sharpe_ratio||0).toFixed(2), cls:m.sharpe_ratio>1.5?'positive':'neutral', border:m.sharpe_ratio>2?'kpi-good':m.sharpe_ratio>1?'kpi-warn':'kpi-bad' }},
        {{ label:'Sortino Ratio', value:(m.sortino_ratio||0).toFixed(2), cls:m.sortino_ratio>2?'positive':'neutral', border:'kpi-info' }},
        {{ label:'Max Drawdown', value:(m.max_drawdown_pct||0).toFixed(1)+'%', cls:'negative', border:m.max_drawdown_pct<10?'kpi-good':m.max_drawdown_pct<20?'kpi-warn':'kpi-bad' }},
        {{ label:'Win Rate', value:((m.win_rate||0)*100).toFixed(1)+'%', cls:m.win_rate>0.55?'positive':'neutral', border:m.win_rate>0.6?'kpi-good':'kpi-warn' }},
        {{ label:'Profit Factor', value:m.profit_factor?m.profit_factor.toFixed(2):'N/A', cls:m.profit_factor>1.5?'positive':'neutral', border:m.profit_factor>1.5?'kpi-good':'kpi-warn' }},
        {{ label:'Calmar Ratio', value:(m.calmar_ratio||0).toFixed(2), cls:m.calmar_ratio>2?'positive':'neutral', border:m.calmar_ratio>2?'kpi-good':'kpi-warn' }},
        {{ label:'Expectancy', value:'$'+(m.expectancy||0).toFixed(0), cls:m.expectancy>0?'positive':'negative', border:m.expectancy>20?'kpi-good':'kpi-warn' }},
        {{ label:'Payoff Ratio', value:m.payoff_ratio?m.payoff_ratio.toFixed(2):'N/A', cls:m.payoff_ratio>1?'positive':'neutral', border:m.payoff_ratio>1?'kpi-good':m.payoff_ratio>0.8?'kpi-warn':'kpi-bad' }},
        {{ label:'Total Trades', value:m.total_trades||0, cls:'neutral', border:'kpi-info' }},
        {{ label:'Avg Hold', value:(m.avg_bars_held||0).toFixed(0)+'h', cls:'neutral', border:'kpi-info' }},
    ];
    const c = document.getElementById('kpi-container');
    c.innerHTML = kpis.map(k=>`<div class="kpi-card ${{k.border}}"><span class="kpi-value ${{k.cls}}">${{k.value}}</span><span class="kpi-label">${{k.label}}</span></div>`).join('');
}}

// ═══════════════════════════════════════════════════════
// 2. PRICE CHART (Lightweight Charts)
// ═══════════════════════════════════════════════════════
function renderPriceChart() {{
    const container = document.getElementById('lw-chart');
    if (!DATA.ohlcv || DATA.ohlcv.length === 0) {{
        container.innerHTML = '<div class="error-msg">No OHLCV data available</div>';
        return;
    }}
    const chart = LightweightCharts.createChart(container, {{
        width: container.clientWidth,
        height: 450,
        layout: {{ background: {{ type:'solid', color:'#161b22' }}, textColor:'#8b949e' }},
        grid: {{ vertLines:{{ color:'#1c2333' }}, horzLines:{{ color:'#1c2333' }} }},
        crosshair: {{ mode: LightweightCharts.CrosshairMode.Normal }},
        timeScale: {{ borderColor:'#30363d', timeVisible:true }},
        rightPriceScale: {{ borderColor:'#30363d' }},
    }});

    const candles = chart.addCandlestickSeries({{
        upColor:'#26a69a', downColor:'#ef5350',
        borderUpColor:'#26a69a', borderDownColor:'#ef5350',
        wickUpColor:'#26a69a', wickDownColor:'#ef5350',
    }});
    candles.setData(DATA.ohlcv);

    // Volume
    const vol = chart.addHistogramSeries({{
        priceFormat:{{ type:'volume' }},
        priceScaleId:'vol',
    }});
    chart.priceScale('vol').applyOptions({{
        scaleMargins:{{ top:0.85, bottom:0 }},
    }});
    vol.setData(DATA.ohlcv.map(c=>({{
        time:c.time,
        value:c.volume,
        color:c.close>=c.open?'rgba(38,166,154,0.25)':'rgba(239,83,80,0.25)',
    }})));

    // Trade markers
    if (DATA.trade_markers && DATA.trade_markers.length > 0) {{
        candles.setMarkers(DATA.trade_markers);
    }}

    new ResizeObserver(entries=>{{
        chart.applyOptions({{ width:entries[0].contentRect.width }});
    }}).observe(container);
}}

// ═══════════════════════════════════════════════════════
// 3. EQUITY + DRAWDOWN
// ═══════════════════════════════════════════════════════
function renderEquity() {{
    const eq = DATA.equity;
    if (!eq) return;

    // Equity line + Buy & Hold
    new Chart(document.getElementById('equity-chart'), {{
        type:'line',
        data:{{
            labels:eq.dates,
            datasets:[{{
                label:'Strategy',
                data:eq.values,
                borderColor:'#58a6ff',
                backgroundColor:'rgba(88,166,255,0.08)',
                fill:true, borderWidth:2, pointRadius:0, tension:0.1,
            }},{{
                label:'Buy & Hold',
                data:eq.buy_hold,
                borderColor:'#ffa726',
                backgroundColor:'transparent',
                fill:false, borderWidth:1.5, pointRadius:0, tension:0.1,
                borderDash:[6,3],
            }}]
        }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{ legend:{{ display:true, labels:{{ font:{{ size:11 }}, padding:12 }} }} }},
            scales:{{
                x:{{ ticks:{{ maxTicksLimit:8, maxRotation:0 }}, grid:{{ color:'#1c2333' }} }},
                y:{{ ticks:{{ callback:v=>'$'+v.toLocaleString() }}, grid:{{ color:'#1c2333' }} }},
            }},
        }},
    }});

    // Drawdown area
    new Chart(document.getElementById('dd-chart'), {{
        type:'line',
        data:{{
            labels:eq.dates,
            datasets:[{{
                label:'Drawdown (%)',
                data:eq.drawdown_pct,
                borderColor:'#ef5350',
                backgroundColor:'rgba(239,83,80,0.2)',
                fill:true, borderWidth:1, pointRadius:0,
            }}]
        }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{ legend:{{ display:false }} }},
            scales:{{
                x:{{ ticks:{{ maxTicksLimit:8, maxRotation:0 }}, grid:{{ color:'#1c2333' }} }},
                y:{{ reverse:true, ticks:{{ callback:v=>v.toFixed(1)+'%' }}, grid:{{ color:'#1c2333' }} }},
            }},
        }},
    }});
}}

// ═══════════════════════════════════════════════════════
// 4. MONTHLY RETURNS
// ═══════════════════════════════════════════════════════
function renderMonthly() {{
    const data = DATA.monthly_returns;
    if (!data) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const years = Object.keys(data).sort();

    let html = '<table class="monthly-table"><thead><tr><th>Year</th>';
    months.forEach(m => html += '<th>'+m+'</th>');
    html += '<th>Total</th></tr></thead><tbody>';

    for (const year of years) {{
        html += '<tr><td class="year-cell">'+year+'</td>';
        let total = 0;
        for (let m = 1; m <= 12; m++) {{
            const val = data[year] && data[year][m];
            if (val !== undefined && val !== null) {{
                total += val;
                const intensity = Math.min(Math.abs(val)/8, 1);
                const bg = val > 0
                    ? 'rgba(38,166,154,'+(0.1+intensity*0.5)+')'
                    : 'rgba(239,83,80,'+(0.1+intensity*0.5)+')';
                html += '<td style="background:'+bg+';color:var(--text-primary)">'+val.toFixed(1)+'%</td>';
            }} else {{
                html += '<td class="empty">-</td>';
            }}
        }}
        const tc = total > 0 ? 'var(--green)' : 'var(--red)';
        html += '<td style="font-weight:700;color:'+tc+'">'+total.toFixed(1)+'%</td></tr>';
    }}
    html += '</tbody></table>';
    document.getElementById('monthly-container').innerHTML = html;
}}

// ═══════════════════════════════════════════════════════
// 5. TRADE ANALYSIS
// ═══════════════════════════════════════════════════════
function renderTradeAnalysis() {{
    const ts = DATA.trades_summary;
    if (!ts) return;

    // PnL histogram
    const pnls = ts.pnl_values || [];
    if (pnls.length > 0) {{
        const mn = Math.min(...pnls), mx = Math.max(...pnls);
        const nBins = 30, bw = (mx - mn) / nBins || 1;
        const bins = Array(nBins).fill(0);
        const labels = [];
        for (let i = 0; i < nBins; i++) {{
            const lo = mn + i * bw;
            labels.push('$' + lo.toFixed(0));
            pnls.forEach(p => {{ if (p >= lo && p < lo + bw) bins[i]++; }});
        }}

        new Chart(document.getElementById('pnl-hist'), {{
            type:'bar',
            data:{{
                labels,
                datasets:[{{ data:bins, backgroundColor:labels.map((_,i)=>mn+i*bw>=0?'#26a69a':'#ef5350'), borderWidth:0 }}]
            }},
            options:{{
                responsive:true, maintainAspectRatio:false,
                plugins:{{ legend:{{ display:false }}, title:{{ display:true, text:'Trade PnL Distribution', color:'#e6edf3' }} }},
                scales:{{ x:{{ ticks:{{ maxTicksLimit:6, maxRotation:45 }} }}, y:{{ ticks:{{ stepSize:1 }} }} }},
            }},
        }});
    }}

    // Exit reason pie
    const reasons = ts.exit_reasons || {{}};
    const rKeys = Object.keys(reasons);
    const colorMap = {{'Stop Loss':'#ef5350','TP3':'#26a69a','Trailing Stop':'#ffa726','End of data':'#8b949e'}};
    new Chart(document.getElementById('exit-pie'), {{
        type:'doughnut',
        data:{{
            labels:rKeys,
            datasets:[{{
                data:rKeys.map(k=>reasons[k]),
                backgroundColor:rKeys.map(k=>colorMap[k]||'#58a6ff'),
                borderColor:'#161b22', borderWidth:2,
            }}]
        }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{
                legend:{{ position:'bottom', labels:{{ font:{{ size:10 }}, padding:8 }} }},
                title:{{ display:true, text:'Exit Reasons', color:'#e6edf3' }},
            }},
        }},
    }});

    // Direction pie
    const db = ts.direction_breakdown || {{}};
    new Chart(document.getElementById('dir-pie'), {{
        type:'doughnut',
        data:{{
            labels:['Long ($'+((db.long_pnl||0).toFixed(0))+')','Short ($'+((db.short_pnl||0).toFixed(0))+')'],
            datasets:[{{
                data:[db.long_count||0, db.short_count||0],
                backgroundColor:['#26a69a','#ef5350'],
                borderColor:'#161b22', borderWidth:2,
            }}]
        }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{
                legend:{{ position:'bottom', labels:{{ font:{{ size:10 }}, padding:8 }} }},
                title:{{ display:true, text:'Direction Breakdown', color:'#e6edf3' }},
            }},
        }},
    }});

    // Trade stats
    const m = DATA.metrics;
    const statsHtml = [
        ['Avg Win', '$'+(m.avg_win||0).toFixed(2)],
        ['Avg Loss', '$'+(m.avg_loss||0).toFixed(2)],
        ['Largest Win', '$'+(m.largest_win||0).toFixed(2)],
        ['Largest Loss', '$'+(m.largest_loss||0).toFixed(2)],
        ['Avg R-Multiple', (m.avg_r_multiple||0).toFixed(2)+'R'],
        ['Max Consec Wins', m.max_consec_wins||0],
        ['Max Consec Losses', m.max_consec_losses||0],
        ['Avg Bars Held', (m.avg_bars_held||0).toFixed(0)],
    ].map(([l,v])=>'<div class="stat-row"><span class="stat-label">'+l+'</span><span class="stat-value">'+v+'</span></div>').join('');
    document.getElementById('trade-stats').innerHTML = statsHtml;

    // R-multiple histogram
    const rDist = DATA.r_distribution;
    if (rDist && document.getElementById('r-multiple-hist')) {{
        new Chart(document.getElementById('r-multiple-hist'), {{
            type:'bar',
            data:{{
                labels:rDist.centers.map(c=>c.toFixed(1)+'R'),
                datasets:[{{ data:rDist.counts, backgroundColor:rDist.centers.map(c=>c>=0?'#26a69a':'#ef5350'), borderWidth:0 }}]
            }},
            options:{{
                responsive:true, maintainAspectRatio:false,
                plugins:{{ legend:{{ display:false }}, title:{{ display:true, text:'R-Multiple Distribution (Mean: '+rDist.mean_r+'R, Median: '+rDist.median_r+'R)', color:'#e6edf3' }} }},
                scales:{{ x:{{ ticks:{{ maxTicksLimit:10 }} }} }},
            }},
        }});
    }}

    // Profit concentration
    const pc = DATA.profit_concentration;
    if (pc) {{
        let pcHtml = '<div class="warning-box"><div class="warning-title">PROFIT CONCENTRATION</div>';
        for (const [key, d] of Object.entries(pc)) {{
            pcHtml += '<div class="stat-row"><span class="stat-label">'+key.replace('_',' ').toUpperCase()+'</span><span class="stat-value">'+d.pct_of_total+'% ($'+d.profit.toLocaleString()+')</span></div>';
        }}
        pcHtml += '</div>';
        document.getElementById('profit-concentration').innerHTML = pcHtml;
    }}
}}

// ═══════════════════════════════════════════════════════
// 6. MONTE CARLO
// ═══════════════════════════════════════════════════════
function renderMonteCarlo() {{
    const mc = DATA.monte_carlo;
    if (!mc || mc.status === 'error') {{
        document.getElementById('mc-content').innerHTML = '<div class="error-msg">Monte Carlo data unavailable</div>';
        return;
    }}
    const d = mc.status === 'ok' ? mc.data : mc;
    const container = document.getElementById('mc-content');

    // Histogram
    const histDiv = document.createElement('div');
    histDiv.style.height = '220px';
    const histCanvas = document.createElement('canvas');
    histCanvas.id = 'mc-hist';
    histDiv.appendChild(histCanvas);
    container.appendChild(histDiv);

    if (d.dd_histogram) {{
        new Chart(histCanvas, {{
            type:'bar',
            data:{{
                labels:d.dd_histogram.centers.map(v=>v.toFixed(1)+'%'),
                datasets:[{{
                    label:'Frequency',
                    data:d.dd_histogram.counts,
                    backgroundColor:'rgba(188,140,255,0.7)',
                    borderWidth:0,
                }}]
            }},
            options:{{
                responsive:true, maintainAspectRatio:false,
                plugins:{{
                    legend:{{ display:false }},
                    title:{{ display:true, text:'Max Drawdown Distribution (10K simulations)', color:'#e6edf3' }},
                }},
                scales:{{ x:{{ ticks:{{ maxTicksLimit:8, maxRotation:45 }} }} }},
            }},
        }});
    }}

    // Stats
    let statsHtml = '<div style="margin-top:16px;">';
    statsHtml += [
        ['Median Max DD', d.median_dd+'%'],
        ['95th Pctile DD', d.p95_dd+'%'],
        ['99th Pctile DD', d.p99_dd+'%'],
        ['P(DD >= 15%)', d.prob_dd_15+'%'],
        ['P(DD >= 25%)', d.prob_dd_25+'%'],
        ['P(Negative Return)', d.prob_negative+'%'],
        ['Total Return (fixed)', d.total_return+' %'],
    ].map(([l,v])=>'<div class="stat-row"><span class="stat-label">'+l+'</span><span class="stat-value">'+v+'</span></div>').join('');
    statsHtml += '</div>';

    // Percentile table
    if (d.percentiles) {{
        statsHtml += '<div style="margin-top:12px;"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">MAX DD PERCENTILES</div>';
        statsHtml += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
        for (const [p, v] of Object.entries(d.percentiles)) {{
            statsHtml += '<div style="background:var(--bg-primary);padding:4px 8px;border-radius:4px;font-size:11px;"><span style="color:var(--text-secondary)">p'+p+'</span> '+v+'%</div>';
        }}
        statsHtml += '</div></div>';
    }}

    container.insertAdjacentHTML('beforeend', statsHtml);
}}

// ═══════════════════════════════════════════════════════
// 7. MULTI-ASSET + SENSITIVITY
// ═══════════════════════════════════════════════════════
function renderMultiSensitivity() {{
    const container = document.getElementById('multi-content');
    let html = '';

    // Multi-asset bar chart
    const ma = DATA.multi_asset;
    if (ma && ma.status !== 'error') {{
        const d = ma.status === 'ok' ? ma.data : ma;
        const symbols = Object.keys(d);
        if (symbols.length > 0) {{
            html += '<div style="height:200px;"><canvas id="multi-chart"></canvas></div>';
            // Table
            html += '<table class="data-table"><thead><tr><th>Asset</th><th>Return</th><th>Sharpe</th><th>Max DD</th><th>WR</th><th>PF</th><th>WF</th></tr></thead><tbody>';
            symbols.forEach(s => {{
                const a = d[s];
                const retCls = a.return_pct > 0 ? 'positive' : 'negative';
                const wf = a.wf_pass !== undefined ? a.wf_pass+'/'+a.wf_total : '-';
                html += '<tr><td>'+s.replace('USDT','')+'</td><td class="'+retCls+'">'+a.return_pct+'%</td><td>'+a.sharpe+'</td><td>'+a.max_dd+'%</td><td>'+a.win_rate+'%</td><td>'+a.profit_factor+'</td><td>'+wf+'</td></tr>';
            }});
            html += '</tbody></table>';
        }}
    }}

    // Sensitivity charts
    const sens = DATA.sensitivity;
    if (sens && sens.status !== 'error') {{
        const d = sens.status === 'ok' ? sens.data : sens;
        const params = Object.keys(d);
        if (params.length > 0) {{
            html += '<div style="margin-top:20px;font-size:13px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Sensitivity Analysis</div>';
            params.forEach((p, idx) => {{
                html += '<div style="height:160px;margin-bottom:8px;"><canvas id="sens-'+idx+'"></canvas></div>';
            }});
        }}
    }}

    container.innerHTML = html;

    // Render multi-asset chart
    if (ma && ma.status !== 'error') {{
        const d = ma.status === 'ok' ? ma.data : ma;
        const symbols = Object.keys(d);
        if (symbols.length > 0 && document.getElementById('multi-chart')) {{
            new Chart(document.getElementById('multi-chart'), {{
                type:'bar',
                data:{{
                    labels:symbols.map(s=>s.replace('USDT','')),
                    datasets:[
                        {{ label:'Return %', data:symbols.map(s=>d[s].return_pct), backgroundColor:symbols.map(s=>d[s].return_pct>0?'#26a69a':'#ef5350'), yAxisID:'y' }},
                        {{ label:'Sharpe', data:symbols.map(s=>d[s].sharpe), backgroundColor:'rgba(88,166,255,0.6)', yAxisID:'y1' }},
                    ]
                }},
                options:{{
                    responsive:true, maintainAspectRatio:false,
                    plugins:{{ title:{{ display:true, text:'Multi-Asset Comparison', color:'#e6edf3' }} }},
                    scales:{{
                        y:{{ position:'left', title:{{ display:true, text:'Return %', color:'#8b949e' }} }},
                        y1:{{ position:'right', title:{{ display:true, text:'Sharpe', color:'#8b949e' }}, grid:{{ display:false }} }},
                    }},
                }},
            }});
        }}
    }}

    // Render sensitivity line charts
    if (sens && sens.status !== 'error') {{
        const d = sens.status === 'ok' ? sens.data : sens;
        Object.keys(d).forEach((p, idx) => {{
            const canvas = document.getElementById('sens-'+idx);
            if (!canvas) return;
            const results = d[p];
            new Chart(canvas, {{
                type:'line',
                data:{{
                    labels:results.map(r=>String(r.value)),
                    datasets:[
                        {{ label:'Return %', data:results.map(r=>r.return_pct), borderColor:'#58a6ff', backgroundColor:'transparent', pointRadius:4, borderWidth:2, yAxisID:'y' }},
                        {{ label:'Sharpe', data:results.map(r=>r.sharpe), borderColor:'#ffa726', backgroundColor:'transparent', pointRadius:4, borderWidth:2, yAxisID:'y1' }},
                    ]
                }},
                options:{{
                    responsive:true, maintainAspectRatio:false,
                    plugins:{{ title:{{ display:true, text:p, color:'#e6edf3', font:{{ size:12 }} }}, legend:{{ labels:{{ font:{{ size:10 }} }} }} }},
                    scales:{{
                        x:{{ title:{{ display:true, text:'Parameter Value', color:'#8b949e' }} }},
                        y:{{ position:'left', grid:{{ color:'#1c2333' }} }},
                        y1:{{ position:'right', grid:{{ display:false }} }},
                    }},
                }},
            }});
        }});
    }}
}}

// ═══════════════════════════════════════════════════════
// 8. WALK-FORWARD + OOS
// ═══════════════════════════════════════════════════════
function renderWFOOS() {{
    const container = document.getElementById('wf-content');
    let html = '';

    // Walk-forward
    const wf = DATA.walk_forward;
    if (wf && wf.status !== 'error') {{
        const d = wf.status === 'ok' ? wf.data : wf;
        const passRate = d.passing_folds + '/' + d.total_folds;
        const badgeCls = d.passing_folds >= 3 ? 'badge-pass' : 'badge-fail';

        html += '<div style="margin-bottom:12px;">Walk-Forward: <span class="badge '+badgeCls+'">'+passRate+' folds pass</span> &nbsp; Avg OOS Return: <strong>'+(d.avg_test_return_pct||0)+'%</strong></div>';
        html += '<div style="height:200px;"><canvas id="wf-chart"></canvas></div>';

        // Fold table
        html += '<table class="data-table"><thead><tr><th>Fold</th><th>Train</th><th>Test</th><th>Status</th></tr></thead><tbody>';
        (d.folds || []).forEach(f => {{
            const st = f.test_profitable ? '<span class="badge badge-pass">PASS</span>' : '<span class="badge badge-fail">FAIL</span>';
            html += '<tr><td>'+f.fold+'</td><td>'+f.train_trades+'t ('+f.train_return_pct+'%)</td><td>'+f.test_trades+'t ('+f.test_return_pct+'%)</td><td>'+st+'</td></tr>';
        }});
        html += '</tbody></table>';
    }}

    // OOS
    const oos = DATA.oos;
    if (oos && oos.status !== 'error') {{
        const d = oos.status === 'ok' ? oos.data : oos;
        const badgeCls = d.oos_profitable ? 'badge-pass' : 'badge-fail';
        const label = d.oos_profitable ? 'PROFITABLE' : 'UNPROFITABLE';

        html += '<div style="margin-top:20px;margin-bottom:8px;font-size:13px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;">Out-of-Sample <span class="badge '+badgeCls+'">'+label+'</span></div>';
        html += '<table class="data-table"><thead><tr><th>Metric</th><th>Train</th><th>OOS</th><th>Change</th></tr></thead><tbody>';
        (d.comparison || []).forEach(c => {{
            const changeCls = c.name === 'Max DD %'
                ? (c.change_pct < 0 ? 'positive' : 'negative')
                : (c.change_pct > 0 ? 'positive' : 'negative');
            const arrow = c.change_pct > 0 ? '&#9650;' : '&#9660;';
            html += '<tr><td>'+c.name+'</td><td>'+c.train+'</td><td>'+c.test+'</td><td class="'+changeCls+'">'+arrow+' '+Math.abs(c.change_pct)+'%</td></tr>';
        }});
        html += '</tbody></table>';
    }}

    container.innerHTML = html;

    // Render WF bar chart
    if (wf && wf.status !== 'error') {{
        const d = wf.status === 'ok' ? wf.data : wf;
        const canvas = document.getElementById('wf-chart');
        if (canvas && d.folds) {{
            new Chart(canvas, {{
                type:'bar',
                data:{{
                    labels:d.folds.map(f=>'Fold '+f.fold),
                    datasets:[
                        {{ label:'Train %', data:d.folds.map(f=>f.train_return_pct), backgroundColor:'rgba(88,166,255,0.6)' }},
                        {{ label:'Test %', data:d.folds.map(f=>f.test_return_pct), backgroundColor:d.folds.map(f=>f.test_profitable?'#26a69a':'#ef5350') }},
                    ]
                }},
                options:{{
                    responsive:true, maintainAspectRatio:false,
                    plugins:{{ title:{{ display:true, text:'Walk-Forward Fold Performance', color:'#e6edf3' }} }},
                }},
            }});
        }}
    }}
}}

// ═══════════════════════════════════════════════════════
// 9. TREASURY SIMULATION
// ═══════════════════════════════════════════════════════
function renderTreasury() {{
    const t = DATA.treasury;
    if (!t || t.status === 'error') {{
        document.getElementById('treasury-content').innerHTML = '<div class="error-msg">Treasury simulation unavailable</div>';
        return;
    }}
    const d = t.status === 'ok' ? t.data : t;
    const levs = d.leverage_results;
    const colors = {{'1':'#58a6ff','2':'#26a69a','3':'#ffa726','5':'#bc8cff','10':'#ef5350','20':'#ff6b6b'}};

    // Equity overlay chart
    const datasets = Object.entries(levs).map(([lev, data]) => ({{
        label: lev+'x' + (data.liquidated ? ' (LIQ)' : ''),
        data: data.equity_curve,
        borderColor: colors[lev] || '#8b949e',
        backgroundColor: 'transparent',
        borderWidth: lev==='1' ? 2.5 : 1.5,
        borderDash: data.liquidated ? [5,3] : [],
        pointRadius: 0, tension: 0.1,
    }}));
    const labels = levs['1'] ? levs['1'].equity_dates : [];

    new Chart(document.getElementById('treasury-equity-chart'), {{
        type:'line',
        data:{{ labels, datasets }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{
                title:{{ display:true, text:'Capital Growth by Leverage Level', color:'#e6edf3' }},
                legend:{{ labels:{{ font:{{ size:10 }}, padding:8 }} }},
            }},
            scales:{{
                x:{{ ticks:{{ maxTicksLimit:8, maxRotation:0 }}, grid:{{ color:'#1c2333' }} }},
                y:{{ type:'logarithmic', ticks:{{ callback:v=>'$'+Number(v).toLocaleString() }}, grid:{{ color:'#1c2333' }} }},
            }},
        }},
    }});

    // Kelly info
    let kHtml = '<div class="info-box"><div class="info-box-title">Kelly Criterion Analysis</div>';
    kHtml += [
        ['Win Rate', (d.win_rate*100).toFixed(1)+'%'],
        ['Payoff Ratio', d.payoff_ratio.toFixed(3)],
        ['Kelly Fraction (f*)', (d.kelly_fraction*100).toFixed(1)+'%'],
        ['Optimal Leverage', '<span class="positive">'+d.optimal_leverage.toFixed(1)+'x</span>'],
        ['Half-Kelly (Recommended)', '<span style="color:var(--cyan);font-weight:700">'+d.half_kelly_leverage.toFixed(1)+'x</span>'],
    ].map(([l,v])=>'<div class="stat-row"><span class="stat-label">'+l+'</span><span class="stat-value">'+v+'</span></div>').join('');
    kHtml += '</div>';
    document.getElementById('kelly-info').innerHTML = kHtml;

    // Recommended leverage summary (3x or closest)
    const rec = levs['3'] || levs['2'] || levs['1'];
    if (rec) {{
        let sHtml = '<div class="info-box"><div class="info-box-title">3x Leverage Projection ($10K start)</div>';
        sHtml += [
            ['Final Equity', '$'+rec.final_equity.toLocaleString()],
            ['CAGR', rec.cagr+'%'],
            ['Max Drawdown', '<span class="negative">'+rec.max_dd_pct+'%</span>'],
            ['Sharpe', rec.sharpe],
            ['Monthly Income', '$'+rec.avg_monthly_income.toLocaleString()],
            ['Time to 2x', rec.time_to_2x_months ? rec.time_to_2x_months+' months' : 'N/A'],
            ['Funding Cost', '$'+rec.total_funding_cost.toLocaleString()],
            ['Risk of Ruin', (d.risk_of_ruin['3']||0)+'%'],
        ].map(([l,v])=>'<div class="stat-row"><span class="stat-label">'+l+'</span><span class="stat-value">'+v+'</span></div>').join('');
        sHtml += '</div>';
        document.getElementById('treasury-summary').innerHTML = sHtml;
    }}

    // Risk vs Return bubble chart
    const bubbleDatasets = Object.entries(levs).map(([lev, data]) => ({{
        label: lev+'x',
        data: [{{ x:data.max_dd_pct, y:data.cagr, r:Math.max(Math.abs(data.sharpe)*4, 5) }}],
        backgroundColor: (colors[lev]||'#8b949e')+'99',
        borderColor: colors[lev]||'#8b949e',
        borderWidth: 2,
    }}));

    new Chart(document.getElementById('risk-return-chart'), {{
        type:'bubble',
        data:{{ datasets:bubbleDatasets }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{ title:{{ display:true, text:'Risk vs Return by Leverage (bubble size = Sharpe)', color:'#e6edf3' }} }},
            scales:{{
                x:{{ title:{{ display:true, text:'Max Drawdown %', color:'#8b949e' }}, grid:{{ color:'#1c2333' }} }},
                y:{{ title:{{ display:true, text:'CAGR %', color:'#8b949e' }}, grid:{{ color:'#1c2333' }} }},
            }},
        }},
    }});

    // Leverage comparison table
    let tHtml = '<table class="data-table"><thead><tr><th>Leverage</th><th>Final ($10K)</th><th>CAGR</th><th>Max DD</th><th>Sharpe</th><th>Monthly $</th><th>2x Time</th><th>Funding</th><th>Ruin %</th><th>Status</th></tr></thead><tbody>';
    Object.entries(levs).forEach(([lev, data]) => {{
        const badge = data.liquidated ? '<span class="badge badge-fail">LIQUIDATED</span>' : '<span class="badge badge-pass">OK</span>';
        const retCls = data.cagr > 0 ? 'positive' : 'negative';
        tHtml += '<tr><td><strong>'+lev+'x</strong></td><td>$'+data.final_equity.toLocaleString()+'</td><td class="'+retCls+'">'+data.cagr+'%</td><td class="negative">'+data.max_dd_pct+'%</td><td>'+data.sharpe+'</td><td>$'+Math.round(data.avg_monthly_income).toLocaleString()+'</td><td>'+(data.time_to_2x_months||'-')+'mo</td><td>$'+Math.round(data.total_funding_cost).toLocaleString()+'</td><td>'+(d.risk_of_ruin[lev]||0)+'%</td><td>'+badge+'</td></tr>';
    }});
    tHtml += '</tbody></table>';
    document.getElementById('leverage-table').innerHTML = tHtml;

    // Monthly income chart at different capitals
    const caps = [1000,5000,10000,25000,50000,100000];
    const s1 = (levs['1']||{{}}).avg_monthly_income || 0;
    const s3 = (levs['3']||{{}}).avg_monthly_income || 0;
    new Chart(document.getElementById('monthly-income-chart'), {{
        type:'bar',
        data:{{
            labels:caps.map(c=>'$'+(c/1000)+'K'),
            datasets:[
                {{ label:'1x Monthly', data:caps.map(c=>Math.round(s1*(c/10000))), backgroundColor:'#58a6ff88' }},
                {{ label:'3x Monthly', data:caps.map(c=>Math.round(s3*(c/10000))), backgroundColor:'#ffa72688' }},
            ],
        }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{ title:{{ display:true, text:'Estimated Monthly Income by Starting Capital', color:'#e6edf3' }} }},
            scales:{{ y:{{ ticks:{{ callback:v=>'$'+v.toLocaleString() }}, grid:{{ color:'#1c2333' }} }} }},
        }},
    }});

    // Capital projection table
    if (d.capital_projections && d.projection_leverages) {{
        const pLevs = d.projection_leverages;
        let pHtml = '<div class="info-box-title">Capital Projection Table</div>';
        pHtml += '<table class="data-table"><thead><tr><th>Starting Capital</th>';
        pLevs.forEach(l => {{ pHtml += '<th>'+l+'x Final</th><th>'+l+'x Monthly</th>'; }});
        pHtml += '</tr></thead><tbody>';
        d.capital_projections.forEach(row => {{
            pHtml += '<tr><td><strong>$'+row.starting.toLocaleString()+'</strong></td>';
            row.columns.forEach(col => {{
                pHtml += '<td>$'+Math.round(col.final).toLocaleString()+'</td>';
                pHtml += '<td>$'+Math.round(col.monthly).toLocaleString()+'</td>';
            }});
            pHtml += '</tr>';
        }});
        pHtml += '</tbody></table>';
        document.getElementById('capital-proj-table').innerHTML = pHtml;
    }}
}}

// ═══════════════════════════════════════════════════════
// 10. DURATION ANALYSIS
// ═══════════════════════════════════════════════════════
function renderDuration() {{
    const da = DATA.duration_analysis;
    if (!da || da.length === 0) return;
    const labels = da.map(d=>d.label);

    new Chart(document.getElementById('dur-count-chart'), {{
        type:'bar',
        data:{{ labels, datasets:[{{ label:'Trade Count', data:da.map(d=>d.count), backgroundColor:'#58a6ff88', borderWidth:0 }}] }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{ title:{{ display:true, text:'Trades by Duration', color:'#e6edf3' }}, legend:{{ display:false }} }},
        }},
    }});

    new Chart(document.getElementById('dur-pnl-chart'), {{
        type:'bar',
        data:{{
            labels,
            datasets:[
                {{ label:'Total PnL', data:da.map(d=>d.total_pnl), backgroundColor:da.map(d=>d.total_pnl>=0?'#26a69a':'#ef5350'), yAxisID:'y' }},
                {{ label:'Avg PnL', data:da.map(d=>d.avg_pnl), type:'line', borderColor:'#ffa726', backgroundColor:'transparent', pointRadius:4, borderWidth:2, yAxisID:'y1' }},
            ]
        }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{ title:{{ display:true, text:'PnL by Duration Bucket', color:'#e6edf3' }} }},
            scales:{{
                y:{{ position:'left', ticks:{{ callback:v=>'$'+v }}, grid:{{ color:'#1c2333' }} }},
                y1:{{ position:'right', ticks:{{ callback:v=>'$'+v }}, grid:{{ display:false }} }},
            }},
        }},
    }});

    let html = '<table class="data-table"><thead><tr><th>Duration</th><th>Trades</th><th>Total PnL</th><th>Avg PnL</th><th>Win Rate</th></tr></thead><tbody>';
    da.forEach(d => {{
        const cls = d.total_pnl >= 0 ? 'positive' : 'negative';
        html += '<tr><td>'+d.label+'</td><td>'+d.count+'</td><td class="'+cls+'">$'+d.total_pnl.toLocaleString()+'</td><td>$'+d.avg_pnl.toFixed(0)+'</td><td>'+d.win_rate+'%</td></tr>';
    }});
    html += '</tbody></table>';
    document.getElementById('dur-table').innerHTML = html;
}}

// ═══════════════════════════════════════════════════════
// 11. YEARLY PERFORMANCE
// ═══════════════════════════════════════════════════════
function renderYearly() {{
    const yp = DATA.yearly_performance;
    if (!yp) return;
    const years = Object.keys(yp).sort();

    new Chart(document.getElementById('yearly-chart'), {{
        type:'bar',
        data:{{
            labels:years,
            datasets:[
                {{ label:'Return %', data:years.map(y=>yp[y].return_pct), backgroundColor:years.map(y=>yp[y].return_pct>0?'#26a69a':'#ef5350'), yAxisID:'y' }},
                {{ label:'Expectancy $', data:years.map(y=>yp[y].expectancy), type:'line', borderColor:'#ffa726', backgroundColor:'transparent', pointRadius:5, borderWidth:2, yAxisID:'y1' }},
            ]
        }},
        options:{{
            responsive:true, maintainAspectRatio:false,
            plugins:{{ title:{{ display:true, text:'Year-by-Year Performance', color:'#e6edf3' }} }},
            scales:{{
                y:{{ position:'left', title:{{ display:true, text:'Return %', color:'#8b949e' }}, grid:{{ color:'#1c2333' }} }},
                y1:{{ position:'right', title:{{ display:true, text:'Expectancy $', color:'#8b949e' }}, grid:{{ display:false }} }},
            }},
        }},
    }});

    let html = '<table class="data-table"><thead><tr><th>Year</th><th>Trades</th><th>Return</th><th>Win Rate</th><th>Expectancy</th><th>PF</th></tr></thead><tbody>';
    years.forEach(y => {{
        const d = yp[y];
        const cls = d.return_pct > 0 ? 'positive' : 'negative';
        html += '<tr><td><strong>'+y+'</strong></td><td>'+d.trades+'</td><td class="'+cls+'">'+d.return_pct+'%</td><td>'+d.win_rate+'%</td><td>$'+d.expectancy+'</td><td>'+d.profit_factor+'</td></tr>';
    }});
    html += '</tbody></table>';
    document.getElementById('yearly-table').innerHTML = html;
}}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {{
    renderKPIs();
    renderPriceChart();
    renderEquity();
    renderMonthly();
    renderTradeAnalysis();
    renderMonteCarlo();
    renderMultiSensitivity();
    renderWFOOS();
    renderTreasury();
    renderDuration();
    renderYearly();
}});
</script>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("  GENERATING TRADING DASHBOARD")
    print("=" * 60)
    t0 = time.time()

    # 1. Primary backtest
    print("\n[1/7] Running primary backtest...")
    result = run_backtest()
    trades = result["trades"]
    metrics = result["metrics"]
    print(f"  {metrics['total_trades']} trades, {metrics['total_return_pct']:+.2f}% return")

    # Load raw data for candlestick chart
    df = load_data("BTCUSDT")
    dates = df["date"].tolist()

    # 2. Monte Carlo
    print("[2/7] Running Monte Carlo simulation...")
    mc = safe_run("Monte Carlo", run_monte_carlo_with_histogram, trades)

    # 3. Multi-asset
    print("[3/7] Running multi-asset test...")
    multi = safe_run("Multi-asset", test_multi_asset)
    if multi["status"] == "ok":
        multi["data"] = collect_multi_asset(multi["data"])

    # 4. Sensitivity
    print("[4/7] Running sensitivity analysis...")
    sens = safe_run("Sensitivity", test_sensitivity)
    if sens["status"] == "ok":
        sens["data"] = collect_sensitivity(sens["data"])

    # 5. OOS
    print("[5/7] Running out-of-sample test...")
    oos = safe_run("OOS", test_out_of_sample)
    if oos["status"] == "ok":
        oos["data"] = collect_oos(oos["data"])

    # 6. Walk-forward
    print("[6/7] Running walk-forward validation...")
    wf = safe_run("Walk-forward", run_walk_forward, df, WINNER_PARAMS)

    # 6b. Treasury simulation
    print("[6b/8] Computing treasury simulation...")
    date_range = (df["date"].iloc[-1] - df["date"].iloc[0])
    data_duration_years = date_range.total_seconds() / (365.25 * 24 * 3600)
    treasury = safe_run("Treasury", compute_treasury_simulation,
                        trades, STRATEGY_PARAMS["initial_capital"], data_duration_years)

    # 6c. Additional analyses
    print("[6c/8] Computing duration, yearly, concentration analysis...")
    duration_analysis = compute_duration_analysis(trades)
    yearly_performance = compute_yearly_performance(trades, STRATEGY_PARAMS["initial_capital"])
    profit_concentration = compute_profit_concentration(trades)
    r_distribution = compute_r_multiple_distribution(trades)

    # 7. Assemble data
    print("[7/8] Assembling dashboard data...")

    # Prepare data structures
    ohlcv = prepare_ohlcv(df, "4h")
    trade_markers = prepare_trade_markers(trades)
    close_prices = df["close"].tolist()
    equity = downsample_equity(result["equity_curve"], dates, close_prices, STRATEGY_PARAMS["initial_capital"], 800)
    monthly = compute_monthly_returns(trades, STRATEGY_PARAMS["initial_capital"])

    # Trades summary
    long_trades = [t for t in trades if t.direction == "LONG"]
    short_trades = [t for t in trades if t.direction == "SHORT"]
    trades_summary = {
        "pnl_values": [round(float(t.pnl), 2) for t in trades if t.pnl is not None],
        "exit_reasons": metrics.get("exit_reasons", {}),
        "direction_breakdown": {
            "long_count": len(long_trades),
            "short_count": len(short_trades),
            "long_pnl": round(sum(t.pnl for t in long_trades if t.pnl), 2),
            "short_pnl": round(sum(t.pnl for t in short_trades if t.pnl), 2),
        },
    }

    # Strategy params (JSON-safe)
    params_clean = {}
    for k, v in STRATEGY_PARAMS.items():
        if isinstance(v, SizingMethod):
            params_clean[k] = v.name
        else:
            params_clean[k] = v

    dashboard_data = {
        "generated_at": datetime.now().isoformat(),
        "strategy_params": params_clean,
        "metrics": sanitize_metrics(metrics),
        "ohlcv": ohlcv,
        "trade_markers": trade_markers,
        "equity": equity,
        "monthly_returns": monthly,
        "trades_summary": trades_summary,
        "trades": [trade_to_dict(t) for t in trades],
        "monte_carlo": mc,
        "multi_asset": multi,
        "sensitivity": sens,
        "oos": oos,
        "walk_forward": wf,
        "treasury": treasury,
        "duration_analysis": duration_analysis,
        "yearly_performance": yearly_performance,
        "profit_concentration": profit_concentration,
        "r_distribution": r_distribution,
    }

    # Generate HTML
    html = build_html(dashboard_data)

    # Write
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        f.write(html)

    elapsed = time.time() - t0
    file_size = OUTPUT_PATH.stat().st_size / 1024
    print(f"\n{'=' * 60}")
    print(f"  Dashboard generated: {OUTPUT_PATH}")
    print(f"  File size: {file_size:.0f} KB | Time: {elapsed:.0f}s")
    print(f"  Open in browser: file://{OUTPUT_PATH.resolve()}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
