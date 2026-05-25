"""
Trade-level path analysis + close-ratio sensitivity on the 31 live trades.

For each trade we infer from R-multiple + exit_reason which TP level was hit
(SL_ONLY / HARD_STOP / TP1_THEN_BE / TP2_THEN_BE / TP3), then simulate what
the same trades' aggregate R would have been under different close-pct configs.

Run: python scripts/analyze_close_ratios.py
"""
import os
from collections import defaultdict
from pathlib import Path

import numpy as np
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


def fetch():
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


def classify(t):
    """Best-effort path inference from R-multiple + exit_reason."""
    r = t.get("r_multiple") or 0
    reason = t.get("exit_reason", "")
    if reason == "TP3":
        return "TP3"
    if reason == "Hard Stop":
        return "HARD_STOP"
    # exit_reason is "Stop Loss"
    if r < -0.8:
        return "SL_ONLY"
    if r > 1.2:
        return "TP2_THEN_BE"
    if r > -0.5:
        return "TP1_THEN_BE"
    return "PARTIAL_LOSS"


def simulate_r(level, c1, c2, c3,
               tp1_r=1.0, tp2_r=4.0, tp3_r=6.0, be_r=0.30,
               sl_r=-1.0, hard_r=-8.0):
    """Compute R under a given (c1, c2, c3) close-pct config for each path."""
    if level == "TP3":
        return c1 * tp1_r + c2 * tp2_r + (1 - c1 - c2) * tp3_r
    if level == "TP2_THEN_BE":
        return c1 * tp1_r + c2 * tp2_r + (1 - c1 - c2) * be_r
    if level == "TP1_THEN_BE":
        return c1 * tp1_r + (1 - c1) * be_r
    if level == "SL_ONLY":
        return sl_r
    if level == "HARD_STOP":
        return hard_r
    return -1.0


def main():
    load_env()
    trades = fetch()
    paths = [{"trade": t, "level": classify(t)} for t in trades]

    print("=" * 80)
    print(f"  TRADE PATH ANALYSIS  n={len(paths)}")
    print("=" * 80)

    # Frequency
    print("\nPath frequency:")
    freq = defaultdict(int)
    for p in paths:
        freq[p["level"]] += 1
    for level, c in sorted(freq.items(), key=lambda x: -x[1]):
        print(f"  {level:>16}  {c:>3}  ({c/len(paths)*100:>4.1f}%)")

    h1 = sum(1 for p in paths if p["level"] in ("TP3", "TP2_THEN_BE", "TP1_THEN_BE"))
    h2 = sum(1 for p in paths if p["level"] in ("TP3", "TP2_THEN_BE"))
    h3 = sum(1 for p in paths if p["level"] == "TP3")
    print(f"\nTP1 hit: {h1}/{len(paths)} ({h1/len(paths)*100:.0f}%)")
    print(f"TP2 hit: {h2}/{len(paths)} ({h2/len(paths)*100:.0f}%)")
    print(f"TP3 hit: {h3}/{len(paths)} ({h3/len(paths)*100:.0f}%)")

    # Variants
    variants = {
        "Current        (5/30/65)": (0.05, 0.30, 0.65),
        "A back-loaded  (5/15/80)": (0.05, 0.15, 0.80),
        "B TP2 heavy    (5/80/15)": (0.05, 0.80, 0.15),
        "C TP1 heavy    (50/30/20)": (0.50, 0.30, 0.20),
        "D balanced     (30/40/30)": (0.30, 0.40, 0.30),
        "E TP2 all-in   (0/100/0)": (0.00, 1.00, 0.00),
        "F TP1+TP2 only (10/90/0)": (0.10, 0.90, 0.00),
        "G TP1 ONLY     (100/0/0)": (1.00, 0.00, 0.00),
    }

    print("\n" + "=" * 80)
    print("  CLOSE-RATIO SENSITIVITY")
    print("=" * 80)
    print()
    print(f"  {'config':>30} {'sumR':>8} {'meanR':>8} {'wins':>7} {'WR%':>5} {'std':>5} {'Sharpe':>7}")
    print("  " + "-" * 78)
    for name, (c1, c2, c3) in variants.items():
        rs = [simulate_r(p["level"], c1, c2, c3) for p in paths]
        sumR = sum(rs)
        meanR = float(np.mean(rs))
        std = float(np.std(rs, ddof=1)) if len(rs) > 1 else 0
        wins = sum(1 for r in rs if r > 0)
        wr = wins / len(rs)
        sh = meanR / std if std > 0 else 0
        print(
            f"  {name:>30} {sumR:>+8.2f} {meanR:>+8.3f} {wins:>3}/{len(rs):<3} "
            f"{wr*100:>4.1f} {std:>5.2f} {sh:>+7.3f}"
        )

    # Per-symbol delta for best variant
    print("\n\nPer-symbol view — current vs Variant B (5/80/15):")
    print(f"  {'sym':>9} {'n':>3} {'cur_sumR':>9} {'B_sumR':>9} {'delta':>7}")
    by_sym = defaultdict(list)
    for p in paths:
        by_sym[p["trade"]["symbol"]].append(p)
    for sym, sps in sorted(by_sym.items()):
        cur = sum(simulate_r(p["level"], 0.05, 0.30, 0.65) for p in sps)
        var = sum(simulate_r(p["level"], 0.05, 0.80, 0.15) for p in sps)
        print(f"  {sym:>9} {len(sps):>3} {cur:>+9.2f} {var:>+9.2f} {var-cur:>+7.2f}")

    # Statistical reading
    cur_rs = [simulate_r(p["level"], 0.05, 0.30, 0.65) for p in paths]
    actual_rs = [p["trade"].get("r_multiple") or 0 for p in paths]
    se = float(np.std(actual_rs, ddof=1)) / np.sqrt(len(actual_rs))

    print("\n" + "=" * 80)
    print("  STATISTICAL READING")
    print("=" * 80)
    print(f"  n = {len(paths)}")
    print(f"  Actual mean R (live): {np.mean(actual_rs):+.3f}")
    print(f"  Standard error on mean R: ±{se:.3f}R per trade")
    print(f"  95% CI on per-trade mean R: ±{1.96*se:.2f}R")
    print(f"  Any variant whose simulated mean R is within ±{1.96*se:.2f}R of current")
    print(f"  is statistically INDISTINGUISHABLE from current.")
    print()
    print(f"  In other words: with 31 trades you cannot prove ANY of these")
    print(f"  variants is genuinely better — only that the sample under that")
    print(f"  rule would have yielded a different number.")


if __name__ == "__main__":
    main()
