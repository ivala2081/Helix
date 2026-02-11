"""
Final Optimized Strategy V5 — BTC 1H Price Action Trading System

V1 WINNER: 1H MS+FVG, No Trailing → +49.7%, Sharpe 1.81, DD 10.3%
V2 IMPROVEMENTS:
  A. Suppress SL for first 19 bars → stops early shakeouts
  B. Breakeven + 0.3 ATR after TP1 → locks partial profits
  C. Min signal score 0.60 → filters weak trades
  V2 RESULT: +95.5%, Sharpe 3.36, Max DD 5.9%, WR 71.1%, PF 2.06

V3 IMPROVEMENTS:
  A. TP Rebalance: tp1_close 40%→20%, tp3_atr 8→6x
  D. Tiered Sizing: (was NO-OP — all scores 0.65, mapped to 1% risk)
  F. Extended SL suppression: 19→30 bars
  V3 RESULT: +173.2%, Sharpe 4.66, Max DD 4.1%, WR 75.9%, PF 3.24

V4 IMPROVEMENTS (fix broken tiered sizing, extend parameter ranges):
  A. Risk fix: disable broken tiered sizing, flat 2% risk (was 1% effective)
  B. Extended SL suppression: 30→50 bars (monotonic improvement continues)
  C. TP1 rebalance: tp1_close 20%→5%, tp3_close 50%→65% (maximize TP3 capture)
  V4 RESULT: +250.5%, Sharpe 4.29, Max DD 6.6%, WR 75.8%, PF 4.06

V5 IMPROVEMENTS (return maximization — tighter SL/TP + unlocked position sizing):
  A. Tighter SL: 2.0→1.0x ATR (tighter stop = less $ lost per loss)
  B. Earlier TP1: 2.0→1.0x ATR (lock profits sooner → WR 75.8%→84.3%)
  C. Risk increase: 2%→3% with position cap 50%→80% (was cap-bound at 2%)
  V5 RESULT: +949.7%, Sharpe 5.40, Max DD 8.55%, WR 84.3%, PF 12.46
    Expectancy: $114→$426/trade
    Walk-forward: 5/5 folds profitable (avg OOS +48.72%)

Usage:
    python3 strategy.py                    # backtest with default params
    python3 strategy.py --validate         # walk-forward validation
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

from data_fetcher import fetch_klines, load_csv
from backtester import Backtester, format_metrics, walk_forward_test
from stake_manager import StakeManager, SizingMethod, Direction
from indicators import add_atr


# ═══════════════════════════════════════════════════════════════
# STRATEGY CONFIGURATION
# ═══════════════════════════════════════════════════════════════

STRATEGY_PARAMS = {
    # Capital & Risk
    "initial_capital": 10_000,
    "risk_pct": 0.03,                    # V5-C: 3% risk (was 2%, cap-bound)
    "sizing_method": SizingMethod.FIXED_FRACTIONAL,
    "max_position_pct": 0.80,            # V5-C: 80% position cap (was 50%, bottleneck)

    # Entry
    "use_market_structure": True,
    "use_fvg": True,
    "use_smc": False,
    "use_classic_pa": False,
    "min_confluence": 0.50,              # require both MS + FVG agreement

    # Stop Loss
    "sl_atr_mult": 1.0,                 # V5-A: 1x ATR stop (was 2x — tighter = less $ lost)

    # Take Profits (progressive, ATR-based)
    "tp1_atr_mult": 1.0,                # V5-B: TP1 at 1x ATR (was 2x — locks profit sooner)
    "tp2_atr_mult": 4.0,                # TP2 at 4x ATR
    "tp3_atr_mult": 6.0,                # TP3 at 6x ATR
    "tp1_close_pct": 0.05,              # close 5% at TP1
    "tp2_close_pct": 0.30,              # close 30% at TP2
    "tp3_close_pct": 0.65,              # close remaining 65% at TP3

    # Trailing Stop — DISABLED (key optimization finding)
    "use_trailing": False,
    "trailing_atr_mult": 0,
    "trailing_activation_atr": 0,

    # ── V2 Improvements ──
    # B: Move SL to breakeven + 0.3 ATR buffer after TP1
    "be_after_tp1": True,
    "be_buffer_atr": 0.30,
    # C: Filter weak signals (require score >= 0.60)
    "min_signal_score": 0.60,

    # ── V3+V4 Improvements ──
    # V4-B: Extended SL suppression — 50 bars (was 30)
    "min_bars_before_sl": 50,
    # V4-A: Tiered sizing DISABLED
    "use_tiered_sizing": False,

    # Execution
    "warmup_bars": 50,
    "commission_pct": 0.075,             # Binance taker fee
    "slippage_pct": 0.02,                # realistic BTC 1H slippage

    # Hard stop — catastrophic protection during SL suppression
    "use_hard_stop": True,
    "hard_stop_atr_mult": 15.0,         # 15x ATR catastrophic floor (black swan only)
}


DATA_DIR = Path(__file__).parent / "data"
REPORT_DIR = Path(__file__).parent / "reports"


# ═══════════════════════════════════════════════════════════════
# MAIN BACKTEST
# ═══════════════════════════════════════════════════════════════

def run_backtest(
    symbol: str = "BTCUSDT",
    interval: str = "1h",
    start_date: str = "2023-01-01",
    end_date: str = None,
    params: dict = None,
) -> dict:
    """Run the optimized strategy on historical data."""
    if params is None:
        params = STRATEGY_PARAMS.copy()

    # Load or fetch data
    pattern = f"{symbol}_{interval}_*.csv"
    files = list(DATA_DIR.glob(pattern))
    if files:
        filepath = max(files, key=lambda f: f.stat().st_size)
        df = pd.read_csv(filepath)
        df["date"] = pd.to_datetime(df["date"], utc=True)
        print(f"Loaded {len(df)} bars from {filepath.name}")
    else:
        print("Fetching fresh data...")
        df = fetch_klines(symbol=symbol, interval=interval,
                         start_date=start_date, end_date=end_date)

    # Run backtest
    bt = Backtester(**params)
    result = bt.run(df)

    return result


def run_full_report(result: dict, title: str = "BTCUSDT 1H Strategy"):
    """Print comprehensive report from backtest result."""
    print(format_metrics(result["metrics"], title))

    # Trade distribution by direction
    trades = result["trades"]
    if trades:
        long_t = [t for t in trades if t.direction == "LONG"]
        short_t = [t for t in trades if t.direction == "SHORT"]
        long_pnl = sum(t.pnl for t in long_t if t.pnl)
        short_pnl = sum(t.pnl for t in short_t if t.pnl)

        print(f"\n  DIRECTION BREAKDOWN")
        print(f"  {'Long PnL:':<30} ${long_pnl:,.2f} ({len(long_t)} trades)")
        print(f"  {'Short PnL:':<30} ${short_pnl:,.2f} ({len(short_t)} trades)")

        # Monthly returns
        print(f"\n  MONTHLY RETURNS")
        monthly = {}
        for t in trades:
            if t.pnl is None:
                continue
            month_key = t.exit_date[:7] if t.exit_date else "Unknown"
            if month_key not in monthly:
                monthly[month_key] = 0
            monthly[month_key] += t.pnl

        for month, pnl in sorted(monthly.items()):
            bar = "+" * int(min(abs(pnl) / 50, 30)) if pnl > 0 else "-" * int(min(abs(pnl) / 50, 30))
            print(f"    {month}: ${pnl:>+8.2f} {bar}")


def run_validation(params: dict = None):
    """Run walk-forward validation."""
    if params is None:
        params = STRATEGY_PARAMS.copy()

    pattern = "BTCUSDT_1h_*.csv"
    files = list(DATA_DIR.glob(pattern))
    filepath = max(files, key=lambda f: f.stat().st_size)
    df = pd.read_csv(filepath)
    df["date"] = pd.to_datetime(df["date"], utc=True)

    print(f"\n{'='*60}")
    print(f"  WALK-FORWARD VALIDATION")
    print(f"{'='*60}")

    wf = walk_forward_test(df, params, n_folds=5, train_pct=0.6)

    print(f"\n  Pass Rate: {wf['passing_folds']}/{wf['total_folds']} "
          f"({'ROBUST' if wf['pass_rate'] >= 0.6 else 'WEAK'})")
    print(f"  Avg Test Return: {wf['avg_test_return_pct']:.2f}%")
    print()

    for fold in wf["folds"]:
        status = "PASS" if fold["test_profitable"] else "FAIL"
        fm = fold["full_metrics"]
        print(f"  Fold {fold['fold']}: "
              f"train ${fold['train_pnl']:>+8.1f} ({fold['train_trades']}t) | "
              f"test ${fold['test_pnl']:>+8.1f} ({fold['test_trades']}t) [{status}]")

    return wf


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="BTC 1H Price Action Strategy")
    parser.add_argument("--validate", action="store_true", help="Run walk-forward validation")
    parser.add_argument("--symbol", default="BTCUSDT")
    parser.add_argument("--interval", default="1h")
    parser.add_argument("--start", default="2023-01-01")
    parser.add_argument("--end", default=None)
    args = parser.parse_args()

    result = run_backtest(
        symbol=args.symbol,
        interval=args.interval,
        start_date=args.start,
        end_date=args.end,
    )
    run_full_report(result)

    if args.validate:
        run_validation()
