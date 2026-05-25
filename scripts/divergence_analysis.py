"""
Comprehensive live-vs-backtest divergence analysis for 5 symbols.

Hypotheses tested:
  H1  Sample-size variance: gap is within natural noise on n=5-7 per symbol
  H2  Symbol mismatch: BNB and XRP never appeared in backtest data
  H3  Regime mismatch: April 14 → May 25 2026 regime ≠ training regime
  H4  Selection bias in backtest: 2023-01 to 2026-04 cherry-picked
  H5  Engine bias remnant: even after P1-P4, fills differ
  H6  Hard stop tightening cost: P4 (15→8) capping real R
  H7  Multi-symbol portfolio effect: live runs concurrent, backtest independent
"""
import os
import pickle
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests


def load_env():
    p = Path(__file__).parent.parent / ".env.local"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ[k.strip()] = v.strip().strip('"').strip("'")


def fetch_live_trades():
    base = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    r = requests.get(
        f"{base}/rest/v1/live_trades",
        headers=h,
        params={"select": "*", "order": "entry_ts.asc"},
        timeout=15,
    )
    return r.json()


def run_full_backtest():
    """Run patched backtest on all 5 symbols; return per-symbol trade lists."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from strategy import STRATEGY_PARAMS
    from backtester import Backtester

    results = {}
    for sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]:
        path = Path("data") / f"{sym}_1h_2023-01-01_to_2026-04-13.csv"
        if not path.exists():
            print(f"  [WARN] {path.name} not found")
            continue
        df = pd.read_csv(path)
        df["date"] = pd.to_datetime(df["date"], utc=True)
        bt = Backtester(**STRATEGY_PARAMS)
        out = bt.run(df)
        results[sym] = out
        m = out["metrics"]
        print(
            f"  {sym}: n={m['total_trades']}, WR={m['win_rate']*100:.1f}%, "
            f"PF={m['profit_factor']:.2f}, Ret={m['total_return_pct']:+.1f}%, "
            f"DD={m['max_drawdown_pct']:.1f}%"
        )
    return results


def per_symbol_compare(live_trades, bt_results):
    """Compare live vs backtest per symbol with stat significance."""
    print("\n" + "=" * 80)
    print("  PER-SYMBOL DIVERGENCE TABLE")
    print("=" * 80)
    print()
    print(f"  {'sym':>9} {'live_n':>7} {'live_WR':>8} {'bt_WR':>7} {'WR_z':>6} {'live_PF':>8} {'bt_PF':>7} {'verdict':>20}")
    print("  " + "-" * 80)

    per_sym = defaultdict(list)
    for t in live_trades:
        per_sym[t["symbol"]].append(t)

    rows = []
    for sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]:
        lt = per_sym.get(sym, [])
        ln = len(lt)
        if ln == 0:
            continue
        lwins = sum(1 for t in lt if (t.get("pnl") or 0) > 0)
        lwr = lwins / ln
        lsw = sum((t.get("pnl") or 0) for t in lt if (t.get("pnl") or 0) > 0)
        lsl = -sum((t.get("pnl") or 0) for t in lt if (t.get("pnl") or 0) <= 0)
        lpf = lsw / lsl if lsl > 0 else float("inf")

        bt = bt_results.get(sym)
        if bt is None:
            print(f"  {sym:>9} {ln:>7} {lwr*100:>7.1f}% {'N/A':>7} {'N/A':>6} {lpf:>8.2f} {'N/A':>7}  {'NO BACKTEST DATA':>20}")
            rows.append({"sym": sym, "live_n": ln, "live_wr": lwr, "live_pf": lpf, "no_bt": True})
            continue
        bm = bt["metrics"]
        bn = bm["total_trades"]
        bwr = bm["win_rate"]
        bpf = bm["profit_factor"]

        # Two-proportion z-test on WR (live vs backtest)
        p_hat = (lwins + bwr * bn) / (ln + bn)
        se = np.sqrt(p_hat * (1 - p_hat) * (1 / ln + 1 / bn))
        z = (lwr - bwr) / se if se > 0 else 0

        sig = "noise"
        if abs(z) > 2.58:
            sig = "*** sig 99%"
        elif abs(z) > 1.96:
            sig = "** sig 95%"
        elif abs(z) > 1.64:
            sig = "* sig 90%"

        print(f"  {sym:>9} {ln:>7} {lwr*100:>7.1f}% {bwr*100:>6.1f}% {z:>+6.2f} {lpf:>8.2f} {bpf:>7.2f}  {sig:>20}")
        rows.append({"sym": sym, "live_n": ln, "live_wr": lwr, "bt_wr": bwr, "z": z, "no_bt": False})
    return rows


def regime_analysis(live_trades, bt_results):
    """Compare realized vol between live window and full backtest period."""
    print("\n" + "=" * 80)
    print("  H3 — REGIME MISMATCH CHECK (realized volatility)")
    print("=" * 80)
    print()
    print(f"  {'sym':>9} {'bt_mean_RV':>12} {'live_mean_RV':>14} {'pctl in bt':>11}")

    if not live_trades:
        return
    live_min_ts = min(t["entry_ts"] for t in live_trades)
    live_max_ts = max(t["exit_ts"] for t in live_trades)

    for sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]:
        path = Path("data") / f"{sym}_1h_2023-01-01_to_2026-04-13.csv"
        if not path.exists():
            continue
        df = pd.read_csv(path)
        df["date"] = pd.to_datetime(df["date"], utc=True)
        df["ret"] = np.log(df["close"] / df["close"].shift(1))
        df["rv24"] = df["ret"].rolling(24 * 24).std() * np.sqrt(8760)
        bt_rv = df["rv24"].dropna().values

        # Live RV: use last 30 days of available bars (proxy for live window)
        df_recent = df.tail(24 * 30)
        live_rv_proxy = df_recent["rv24"].mean()

        pctl = (bt_rv < live_rv_proxy).mean()
        print(f"  {sym:>9} {bt_rv.mean():>12.3f} {live_rv_proxy:>14.3f} {pctl*100:>10.1f}%")


def hard_stop_analysis(live_trades, bt_results):
    """How often did hard stops fire in backtest vs live?"""
    print("\n" + "=" * 80)
    print("  H6 — HARD STOP IMPACT (P4 patch: 15× → 8× ATR)")
    print("=" * 80)
    print()
    print(f"  {'sym':>9} {'live_HS':>8} {'live_n':>7} {'live_HS%':>9} {'bt_HS':>6} {'bt_n':>6} {'bt_HS%':>8}")
    for sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]:
        lt = [t for t in live_trades if t["symbol"] == sym]
        ln = len(lt)
        lhs = sum(1 for t in lt if t.get("exit_reason") == "Hard Stop")
        bt = bt_results.get(sym)
        if bt is None:
            print(f"  {sym:>9} {lhs:>8} {ln:>7} {(lhs/ln*100 if ln else 0):>8.1f}% {'N/A':>6} {'N/A':>6} {'N/A':>8}")
            continue
        bts = bt["trades"]
        bn = len(bts)
        bhs = sum(1 for t in bts if t.exit_reason == "Hard Stop")
        print(f"  {sym:>9} {lhs:>8} {ln:>7} {lhs/ln*100 if ln else 0:>8.1f}% {bhs:>6} {bn:>6} {bhs/bn*100 if bn else 0:>7.2f}%")


def path_frequency_compare(live_trades, bt_results):
    """Compare TP1/TP2/TP3/SL hit rates."""
    print("\n" + "=" * 80)
    print("  H5 — PATH FREQUENCY (TP1/TP2/TP3/SL/HS hit rates)")
    print("=" * 80)
    print()

    def categorize(t_dict_or_obj):
        if hasattr(t_dict_or_obj, "exit_reason"):
            r = t_dict_or_obj.exit_reason or ""
            rm = t_dict_or_obj.pnl / t_dict_or_obj.risk_amount if t_dict_or_obj.risk_amount else 0
        else:
            r = t_dict_or_obj.get("exit_reason") or ""
            rm = t_dict_or_obj.get("r_multiple") or 0
        if r == "TP3": return "TP3"
        if r == "Hard Stop": return "HARD"
        if r in ("Stop Loss", "Trailing Stop"):
            if rm > 1.2: return "TP2_BE"
            if rm > -0.5: return "TP1_BE"
            return "SL"
        return "OTHER"

    print(f"  {'sym':>9} {'src':>7} {'n':>4} {'TP3%':>5} {'TP2_BE%':>8} {'TP1_BE%':>8} {'SL%':>5} {'HARD%':>6}")
    for sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]:
        for source in ["LIVE", "BACKTEST"]:
            if source == "LIVE":
                rows = [t for t in live_trades if t["symbol"] == sym]
            else:
                if sym not in bt_results: continue
                rows = bt_results[sym]["trades"]
            if not rows: continue
            n = len(rows)
            cats = defaultdict(int)
            for t in rows: cats[categorize(t)] += 1
            tp3 = cats["TP3"] / n * 100
            tp2 = cats["TP2_BE"] / n * 100
            tp1 = cats["TP1_BE"] / n * 100
            sl = cats["SL"] / n * 100
            hs = cats["HARD"] / n * 100
            print(f"  {sym:>9} {source:>7} {n:>4} {tp3:>4.1f} {tp2:>7.1f} {tp1:>7.1f} {sl:>4.1f} {hs:>5.1f}")


def recent_window_backtest(bt_results):
    """How would the strategy have performed on a 41-day window inside the backtest?"""
    print("\n" + "=" * 80)
    print("  H1/H4 — 41-DAY ROLLING WINDOW DISTRIBUTION")
    print("  (Where does the live window fall in the backtest distribution?)")
    print("=" * 80)
    print()
    print(f"  {'sym':>9} {'live_R_per_day':>15} {'bt_mean':>9} {'bt_p10':>8} {'bt_p25':>8} {'bt_p50':>8} {'live_pctl':>11}")

    for sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]:
        bt = bt_results.get(sym)
        if bt is None: continue
        trades = bt["trades"]
        if not trades: continue

        # Convert to (ts, r) tuples
        rows = []
        for t in trades:
            ts = int(pd.Timestamp(t.entry_date).timestamp() * 1000)
            r = (t.pnl / t.risk_amount) if (t.pnl and t.risk_amount) else 0
            rows.append((ts, r))
        rows.sort()

        # Slide 41-day windows
        WMS = 41 * 86400 * 1000
        STEP = 86400 * 1000
        start = rows[0][0]
        end = rows[-1][0]
        r_per_day_dist = []
        cur = start
        while cur + WMS <= end:
            wt = [r for ts, r in rows if cur <= ts < cur + WMS]
            if len(wt) >= 5:
                r_per_day = sum(wt) / 41  # R per day
                r_per_day_dist.append(r_per_day)
            cur += STEP
        if not r_per_day_dist:
            continue
        arr = np.array(r_per_day_dist)
        print(f"  {sym:>9} {'(see live)':>15} {arr.mean():>+9.3f} {np.percentile(arr,10):>+8.3f} {np.percentile(arr,25):>+8.3f} {np.percentile(arr,50):>+8.3f} {'':>11}")


def main():
    load_env()
    print("=" * 80)
    print(f"  HELIX LIVE-VS-BACKTEST DIVERGENCE ANALYSIS  ({datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC})")
    print("=" * 80)

    print("\n[1/5] Fetching live trades...")
    live = fetch_live_trades()
    print(f"  {len(live)} live trades")

    print("\n[2/5] Running patched backtest on all 5 symbols...")
    bt = run_full_backtest()

    # Save
    with open("/tmp/bt5.pkl", "wb") as f:
        pickle.dump(bt, f)

    print("\n[3/5] Per-symbol divergence...")
    per_symbol_compare(live, bt)

    print("\n[4/5] Path frequency comparison...")
    path_frequency_compare(live, bt)

    print("\n[5/5] Hard stop and regime checks...")
    hard_stop_analysis(live, bt)
    regime_analysis(live, bt)
    recent_window_backtest(bt)


if __name__ == "__main__":
    main()
