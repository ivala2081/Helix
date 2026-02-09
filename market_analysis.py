"""
BTC Market Analysis — Comprehensive statistical analysis of BTC price behavior.
Analyzes volatility regimes, trending vs ranging, time effects, volume patterns,
return distributions, and price action characteristics across multiple timeframes.

Run: python3 market_analysis.py
"""

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent / "data"
REPORT_DIR = Path(__file__).parent / "reports"


# ═══════════════════════════════════════════════════════════════
# 1. DATA LOADING
# ═══════════════════════════════════════════════════════════════

def load_data(symbol: str = "BTCUSDT", interval: str = "4h") -> pd.DataFrame:
    """Load the most recent CSV for a given symbol/interval."""
    pattern = f"{symbol}_{interval}_*.csv"
    files = list(DATA_DIR.glob(pattern))
    if not files:
        raise FileNotFoundError(f"No data files matching {pattern} in {DATA_DIR}")
    filepath = max(files, key=lambda f: f.stat().st_size)  # largest file
    df = pd.read_csv(filepath)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    return df


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add commonly needed derived columns."""
    df = df.copy()
    # Returns
    df["returns"] = df["close"].pct_change()
    df["log_returns"] = np.log(df["close"] / df["close"].shift(1))

    # Candle properties
    df["body"] = df["close"] - df["open"]
    df["body_pct"] = df["body"] / df["open"] * 100
    df["range"] = df["high"] - df["low"]
    df["range_pct"] = df["range"] / df["open"] * 100
    df["upper_wick"] = df["high"] - df[["open", "close"]].max(axis=1)
    df["lower_wick"] = df[["open", "close"]].min(axis=1) - df["low"]

    # ATR (14-period)
    tr = pd.concat([
        df["high"] - df["low"],
        (df["high"] - df["close"].shift(1)).abs(),
        (df["low"] - df["close"].shift(1)).abs(),
    ], axis=1).max(axis=1)
    df["tr"] = tr
    df["atr_14"] = tr.rolling(14).mean()
    df["atr_pct"] = df["atr_14"] / df["close"] * 100

    # Volume metrics
    df["vol_sma_20"] = df["volume"].rolling(20).mean()
    df["vol_ratio"] = df["volume"] / df["vol_sma_20"]

    # Time components
    df["hour"] = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.dayofweek  # 0=Mon, 6=Sun
    df["month"] = df["date"].dt.month

    return df.dropna().reset_index(drop=True)


# ═══════════════════════════════════════════════════════════════
# 2. RETURN DISTRIBUTION ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_returns(df: pd.DataFrame, interval: str) -> dict:
    """Analyze return distribution characteristics."""
    returns = df["returns"].dropna()
    log_ret = df["log_returns"].dropna()

    # Basic stats
    stats = {
        "interval": interval,
        "n_candles": len(df),
        "mean_return_pct": returns.mean() * 100,
        "median_return_pct": returns.median() * 100,
        "std_return_pct": returns.std() * 100,
        "skewness": returns.skew(),
        "kurtosis": returns.kurtosis(),  # excess kurtosis (normal = 0)
    }

    # Fat tails — what % of returns exceed 2σ and 3σ
    sigma = returns.std()
    stats["pct_beyond_2sigma"] = (returns.abs() > 2 * sigma).mean() * 100
    stats["pct_beyond_3sigma"] = (returns.abs() > 3 * sigma).mean() * 100
    # Normal distribution: 4.55% beyond 2σ, 0.27% beyond 3σ
    stats["fat_tail_ratio_2s"] = stats["pct_beyond_2sigma"] / 4.55
    stats["fat_tail_ratio_3s"] = stats["pct_beyond_3sigma"] / 0.27 if stats["pct_beyond_3sigma"] > 0 else 0

    # Percentiles
    for p in [1, 5, 10, 25, 75, 90, 95, 99]:
        stats[f"p{p}_return_pct"] = returns.quantile(p / 100) * 100

    # Max moves
    stats["max_gain_pct"] = returns.max() * 100
    stats["max_loss_pct"] = returns.min() * 100

    # Autocorrelation — does momentum exist?
    for lag in [1, 2, 3, 5, 10]:
        stats[f"autocorr_lag{lag}"] = returns.autocorrelation(lag) if hasattr(returns, 'autocorrelation') else returns.autocorr(lag)

    return stats


# ═══════════════════════════════════════════════════════════════
# 3. VOLATILITY REGIME ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_volatility_regimes(df: pd.DataFrame, interval: str) -> dict:
    """Classify volatility into regimes and analyze transitions."""
    atr_pct = df["atr_pct"].dropna()

    # Define regimes by percentile
    q33 = atr_pct.quantile(0.33)
    q67 = atr_pct.quantile(0.67)

    df = df.copy()
    df["vol_regime"] = pd.cut(
        df["atr_pct"],
        bins=[-np.inf, q33, q67, np.inf],
        labels=["low", "medium", "high"]
    )

    stats = {
        "interval": interval,
        "atr_pct_mean": atr_pct.mean(),
        "atr_pct_median": atr_pct.median(),
        "atr_pct_q33": q33,
        "atr_pct_q67": q67,
    }

    # Time spent in each regime
    for regime in ["low", "medium", "high"]:
        mask = df["vol_regime"] == regime
        stats[f"{regime}_pct_time"] = mask.mean() * 100
        stats[f"{regime}_mean_return"] = df.loc[mask, "returns"].mean() * 100 if mask.sum() > 0 else 0
        stats[f"{regime}_std_return"] = df.loc[mask, "returns"].std() * 100 if mask.sum() > 0 else 0

    # Regime duration — how long does each regime last?
    regime_runs = []
    current_regime = None
    current_length = 0
    for regime in df["vol_regime"]:
        if regime == current_regime:
            current_length += 1
        else:
            if current_regime is not None:
                regime_runs.append((current_regime, current_length))
            current_regime = regime
            current_length = 1
    if current_regime is not None:
        regime_runs.append((current_regime, current_length))

    for regime in ["low", "medium", "high"]:
        lengths = [l for r, l in regime_runs if r == regime]
        if lengths:
            stats[f"{regime}_avg_duration_bars"] = np.mean(lengths)
            stats[f"{regime}_max_duration_bars"] = max(lengths)
            stats[f"{regime}_median_duration_bars"] = np.median(lengths)
        else:
            stats[f"{regime}_avg_duration_bars"] = 0
            stats[f"{regime}_max_duration_bars"] = 0
            stats[f"{regime}_median_duration_bars"] = 0

    # Regime transition matrix
    transitions = {}
    for i in range(len(df) - 1):
        from_r = df["vol_regime"].iloc[i]
        to_r = df["vol_regime"].iloc[i + 1]
        key = f"{from_r}_to_{to_r}"
        transitions[key] = transitions.get(key, 0) + 1

    total_transitions = sum(transitions.values())
    for key, count in transitions.items():
        stats[f"transition_{key}_pct"] = count / total_transitions * 100

    return stats


# ═══════════════════════════════════════════════════════════════
# 4. TRENDING VS RANGING ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_trend_ranging(df: pd.DataFrame, interval: str) -> dict:
    """Detect trending vs ranging periods using multiple methods."""
    df = df.copy()

    # Method 1: Efficiency Ratio (ER)
    # ER = |price_change| / sum(|bar_changes|) over N bars
    # ER = 1 means perfectly trending, ER → 0 means choppy
    for period in [10, 20, 50]:
        price_change = (df["close"] - df["close"].shift(period)).abs()
        sum_changes = df["close"].diff().abs().rolling(period).sum()
        df[f"er_{period}"] = price_change / sum_changes

    # Method 2: ADX (Average Directional Index)
    high = df["high"]
    low = df["low"]
    close = df["close"]

    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
    minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0)

    atr_14 = df["tr"].rolling(14).mean()
    plus_di = 100 * (plus_dm.rolling(14).mean() / atr_14)
    minus_di = 100 * (minus_dm.rolling(14).mean() / atr_14)
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di)
    df["adx"] = dx.rolling(14).mean()

    # Method 3: Choppiness Index
    # CI = 100 * LOG10(SUM(ATR,14) / (HH - LL)) / LOG10(14)
    atr_sum = df["tr"].rolling(14).sum()
    hh = df["high"].rolling(14).max()
    ll = df["low"].rolling(14).min()
    df["chop_index"] = 100 * np.log10(atr_sum / (hh - ll)) / np.log10(14)

    stats = {"interval": interval}

    # ER analysis
    for period in [10, 20, 50]:
        er = df[f"er_{period}"].dropna()
        stats[f"er_{period}_mean"] = er.mean()
        stats[f"er_{period}_median"] = er.median()
        stats[f"er_{period}_trending_pct"] = (er > 0.3).mean() * 100  # ER > 0.3 = trending
        stats[f"er_{period}_ranging_pct"] = (er < 0.2).mean() * 100  # ER < 0.2 = ranging

    # ADX analysis
    adx = df["adx"].dropna()
    stats["adx_mean"] = adx.mean()
    stats["adx_median"] = adx.median()
    stats["adx_strong_trend_pct"] = (adx > 25).mean() * 100   # ADX > 25 = trending
    stats["adx_weak_pct"] = (adx < 20).mean() * 100           # ADX < 20 = ranging

    # Choppiness analysis
    chop = df["chop_index"].dropna()
    stats["chop_mean"] = chop.mean()
    stats["chop_trending_pct"] = (chop < 38.2).mean() * 100  # low chop = trending
    stats["chop_ranging_pct"] = (chop > 61.8).mean() * 100   # high chop = ranging

    # Returns during trending vs ranging (using ER_20)
    er20 = df[f"er_20"]
    trending_mask = er20 > 0.3
    ranging_mask = er20 < 0.2

    if trending_mask.sum() > 0:
        stats["trending_mean_abs_return"] = df.loc[trending_mask, "returns"].abs().mean() * 100
        stats["trending_mean_return"] = df.loc[trending_mask, "returns"].mean() * 100
    if ranging_mask.sum() > 0:
        stats["ranging_mean_abs_return"] = df.loc[ranging_mask, "returns"].abs().mean() * 100
        stats["ranging_mean_return"] = df.loc[ranging_mask, "returns"].mean() * 100

    return stats


# ═══════════════════════════════════════════════════════════════
# 5. TIME-OF-DAY / DAY-OF-WEEK EFFECTS
# ═══════════════════════════════════════════════════════════════

def analyze_time_effects(df: pd.DataFrame, interval: str) -> dict:
    """Analyze if certain hours or days produce better/worse returns."""
    stats = {"interval": interval}

    # Hour-of-day analysis
    hourly = df.groupby("hour").agg(
        mean_return=("returns", "mean"),
        std_return=("returns", "std"),
        mean_volume=("volume", "mean"),
        mean_range_pct=("range_pct", "mean"),
        count=("returns", "count"),
    )

    stats["best_hour"] = int(hourly["mean_return"].idxmax())
    stats["best_hour_return_pct"] = hourly["mean_return"].max() * 100
    stats["worst_hour"] = int(hourly["mean_return"].idxmin())
    stats["worst_hour_return_pct"] = hourly["mean_return"].min() * 100
    stats["highest_vol_hour"] = int(hourly["mean_volume"].idxmax())
    stats["highest_range_hour"] = int(hourly["mean_range_pct"].idxmax())

    # Store all hourly stats
    for hour in hourly.index:
        stats[f"hour_{hour:02d}_return_pct"] = hourly.loc[hour, "mean_return"] * 100
        stats[f"hour_{hour:02d}_range_pct"] = hourly.loc[hour, "mean_range_pct"]
        stats[f"hour_{hour:02d}_vol_ratio"] = hourly.loc[hour, "mean_volume"] / hourly["mean_volume"].mean()

    # Day-of-week analysis
    day_names = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
    daily = df.groupby("day_of_week").agg(
        mean_return=("returns", "mean"),
        std_return=("returns", "std"),
        mean_volume=("volume", "mean"),
        mean_range_pct=("range_pct", "mean"),
    )

    for dow in daily.index:
        name = day_names[dow]
        stats[f"{name}_return_pct"] = daily.loc[dow, "mean_return"] * 100
        stats[f"{name}_range_pct"] = daily.loc[dow, "mean_range_pct"]
        stats[f"{name}_vol_ratio"] = daily.loc[dow, "mean_volume"] / daily["mean_volume"].mean()

    stats["best_day"] = day_names[daily["mean_return"].idxmax()]
    stats["worst_day"] = day_names[daily["mean_return"].idxmin()]

    return stats


# ═══════════════════════════════════════════════════════════════
# 6. VOLUME ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_volume(df: pd.DataFrame, interval: str) -> dict:
    """Analyze volume patterns and their predictive power."""
    df = df.copy()
    stats = {"interval": interval}

    # Volume-return relationship
    # Does high volume predict larger moves?
    high_vol = df["vol_ratio"] > 1.5
    low_vol = df["vol_ratio"] < 0.5
    normal_vol = (df["vol_ratio"] >= 0.5) & (df["vol_ratio"] <= 1.5)

    stats["high_vol_pct"] = high_vol.mean() * 100
    stats["low_vol_pct"] = low_vol.mean() * 100

    if high_vol.sum() > 0:
        stats["high_vol_abs_return_pct"] = df.loc[high_vol, "returns"].abs().mean() * 100
        stats["high_vol_range_pct"] = df.loc[high_vol, "range_pct"].mean()
    if low_vol.sum() > 0:
        stats["low_vol_abs_return_pct"] = df.loc[low_vol, "returns"].abs().mean() * 100
        stats["low_vol_range_pct"] = df.loc[low_vol, "range_pct"].mean()
    if normal_vol.sum() > 0:
        stats["normal_vol_abs_return_pct"] = df.loc[normal_vol, "returns"].abs().mean() * 100

    # Volume precedes price? (does vol spike predict next bar move)
    df["next_abs_return"] = df["returns"].abs().shift(-1)
    vol_return_corr = df[["vol_ratio", "next_abs_return"]].dropna().corr().iloc[0, 1]
    stats["vol_predicts_next_move_corr"] = vol_return_corr

    # Volume confirms direction? (up bar with high vol vs down bar with high vol)
    up_bars = df["returns"] > 0
    down_bars = df["returns"] < 0
    if up_bars.sum() > 0:
        stats["up_bar_avg_vol_ratio"] = df.loc[up_bars, "vol_ratio"].mean()
    if down_bars.sum() > 0:
        stats["down_bar_avg_vol_ratio"] = df.loc[down_bars, "vol_ratio"].mean()

    # Volume trend — is volume declining or increasing over time?
    vol_half1 = df["volume"].iloc[:len(df)//2].mean()
    vol_half2 = df["volume"].iloc[len(df)//2:].mean()
    stats["volume_trend_change_pct"] = (vol_half2 - vol_half1) / vol_half1 * 100

    return stats


# ═══════════════════════════════════════════════════════════════
# 7. FAIR VALUE GAP (FVG) ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_fvg(df: pd.DataFrame, interval: str) -> dict:
    """Detect Fair Value Gaps and analyze fill rates."""
    df = df.copy()
    stats = {"interval": interval}

    bullish_fvgs = []  # gap up: bar[i-1].high < bar[i+1].low
    bearish_fvgs = []  # gap down: bar[i-1].low > bar[i+1].high

    for i in range(1, len(df) - 1):
        prev_high = df["high"].iloc[i - 1]
        prev_low = df["low"].iloc[i - 1]
        next_high = df["high"].iloc[i + 1]
        next_low = df["low"].iloc[i + 1]
        curr_high = df["high"].iloc[i]
        curr_low = df["low"].iloc[i]

        # Bullish FVG: previous candle's high < next candle's low (gap up)
        if prev_high < next_low:
            gap_size = next_low - prev_high
            gap_pct = gap_size / df["close"].iloc[i] * 100
            bullish_fvgs.append({
                "bar_idx": i,
                "gap_top": next_low,
                "gap_bottom": prev_high,
                "gap_size": gap_size,
                "gap_pct": gap_pct,
                "date": df["date"].iloc[i],
            })

        # Bearish FVG: previous candle's low > next candle's high (gap down)
        if prev_low > next_high:
            gap_size = prev_low - next_high
            gap_pct = gap_size / df["close"].iloc[i] * 100
            bearish_fvgs.append({
                "bar_idx": i,
                "gap_top": prev_low,
                "gap_bottom": next_high,
                "gap_size": gap_size,
                "gap_pct": gap_pct,
                "date": df["date"].iloc[i],
            })

    stats["bullish_fvg_count"] = len(bullish_fvgs)
    stats["bearish_fvg_count"] = len(bearish_fvgs)
    stats["total_fvg_count"] = len(bullish_fvgs) + len(bearish_fvgs)
    stats["fvg_per_100_bars"] = stats["total_fvg_count"] / len(df) * 100

    # Analyze fill rates — does price come back to fill the gap?
    for fvg_type, fvgs in [("bullish", bullish_fvgs), ("bearish", bearish_fvgs)]:
        if not fvgs:
            stats[f"{fvg_type}_fill_rate"] = 0
            stats[f"{fvg_type}_avg_fill_bars"] = 0
            stats[f"{fvg_type}_avg_gap_pct"] = 0
            continue

        filled = 0
        fill_bars = []
        gap_pcts = []

        for fvg in fvgs:
            idx = fvg["bar_idx"]
            gap_pcts.append(fvg["gap_pct"])

            # Look forward up to 50 bars for fill
            was_filled = False
            for j in range(idx + 2, min(idx + 52, len(df))):
                if fvg_type == "bullish":
                    # Bullish FVG filled when price drops to gap_bottom
                    if df["low"].iloc[j] <= fvg["gap_bottom"]:
                        was_filled = True
                        fill_bars.append(j - idx)
                        break
                else:
                    # Bearish FVG filled when price rises to gap_top
                    if df["high"].iloc[j] >= fvg["gap_top"]:
                        was_filled = True
                        fill_bars.append(j - idx)
                        break

            if was_filled:
                filled += 1

        stats[f"{fvg_type}_fill_rate"] = filled / len(fvgs) * 100
        stats[f"{fvg_type}_avg_fill_bars"] = np.mean(fill_bars) if fill_bars else 0
        stats[f"{fvg_type}_median_fill_bars"] = np.median(fill_bars) if fill_bars else 0
        stats[f"{fvg_type}_avg_gap_pct"] = np.mean(gap_pcts)

    return stats


# ═══════════════════════════════════════════════════════════════
# 8. MARKET STRUCTURE ANALYSIS
# ═══════════════════════════════════════════════════════════════

def find_swing_points(df: pd.DataFrame, lookback: int = 5) -> pd.DataFrame:
    """Detect swing highs and lows using N-bar lookback."""
    df = df.copy()
    df["swing_high"] = False
    df["swing_low"] = False

    for i in range(lookback, len(df) - lookback):
        # Swing high: highest high in window
        if df["high"].iloc[i] == df["high"].iloc[i - lookback:i + lookback + 1].max():
            df.loc[df.index[i], "swing_high"] = True

        # Swing low: lowest low in window
        if df["low"].iloc[i] == df["low"].iloc[i - lookback:i + lookback + 1].min():
            df.loc[df.index[i], "swing_low"] = True

    return df


def analyze_market_structure(df: pd.DataFrame, interval: str) -> dict:
    """Analyze market structure: swing points, BOS, CHoCH frequency."""
    df = find_swing_points(df, lookback=5)
    stats = {"interval": interval}

    # Collect swing highs and lows
    swing_highs = df[df["swing_high"]][["date", "high"]].rename(columns={"high": "price"})
    swing_lows = df[df["swing_low"]][["date", "low"]].rename(columns={"low": "price"})

    stats["swing_high_count"] = len(swing_highs)
    stats["swing_low_count"] = len(swing_lows)
    stats["swings_per_100_bars"] = (len(swing_highs) + len(swing_lows)) / len(df) * 100

    # Classify structure: HH, HL, LH, LL
    hh_count = 0
    lh_count = 0
    hl_count = 0
    ll_count = 0

    sh_prices = swing_highs["price"].values
    sl_prices = swing_lows["price"].values

    for i in range(1, len(sh_prices)):
        if sh_prices[i] > sh_prices[i - 1]:
            hh_count += 1
        else:
            lh_count += 1

    for i in range(1, len(sl_prices)):
        if sl_prices[i] > sl_prices[i - 1]:
            hl_count += 1
        else:
            ll_count += 1

    total_sh = max(hh_count + lh_count, 1)
    total_sl = max(hl_count + ll_count, 1)

    stats["hh_pct"] = hh_count / total_sh * 100
    stats["lh_pct"] = lh_count / total_sh * 100
    stats["hl_pct"] = hl_count / total_sl * 100
    stats["ll_pct"] = ll_count / total_sl * 100

    # Uptrend = HH + HL, Downtrend = LH + LL
    stats["uptrend_structure_pct"] = (hh_count + hl_count) / (total_sh + total_sl) * 100
    stats["downtrend_structure_pct"] = (lh_count + ll_count) / (total_sh + total_sl) * 100

    # Average swing size
    if len(sh_prices) > 1:
        swing_sizes = []
        # Combine and sort all swing points by time for swing-to-swing measurement
        all_swings = pd.concat([
            swing_highs.assign(type="high"),
            swing_lows.assign(type="low"),
        ]).sort_values("date")

        for i in range(1, len(all_swings)):
            size = abs(all_swings["price"].iloc[i] - all_swings["price"].iloc[i - 1])
            pct = size / all_swings["price"].iloc[i - 1] * 100
            swing_sizes.append(pct)

        stats["avg_swing_size_pct"] = np.mean(swing_sizes)
        stats["median_swing_size_pct"] = np.median(swing_sizes)
        stats["max_swing_size_pct"] = max(swing_sizes)

    # BOS (Break of Structure) count — price breaks previous swing point
    bos_count = 0
    choch_count = 0

    # Track last confirmed trend direction
    # BOS = continuation break, CHoCH = reversal break
    if len(sh_prices) > 2 and len(sl_prices) > 2:
        # Simplified: count how often price breaks the last swing high (bullish BOS)
        # or last swing low (bearish BOS)
        for i in range(2, min(len(sh_prices), len(sl_prices))):
            if sh_prices[i] > sh_prices[i - 1] and sl_prices[i] > sl_prices[i - 1]:
                bos_count += 1  # bullish continuation
            elif sh_prices[i] < sh_prices[i - 1] and sl_prices[i] < sl_prices[i - 1]:
                bos_count += 1  # bearish continuation
            else:
                choch_count += 1  # mixed = change of character

    stats["bos_count"] = bos_count
    stats["choch_count"] = choch_count
    if bos_count + choch_count > 0:
        stats["bos_vs_choch_ratio"] = bos_count / (bos_count + choch_count)
    else:
        stats["bos_vs_choch_ratio"] = 0

    return stats


# ═══════════════════════════════════════════════════════════════
# 9. REPORT GENERATION
# ═══════════════════════════════════════════════════════════════

def format_section(title: str, stats: dict, key_filter: str = None) -> str:
    """Format a stats dict as a readable report section."""
    lines = [f"\n{'='*60}", f" {title}", f"{'='*60}"]
    for key, val in stats.items():
        if key == "interval":
            continue
        if key_filter and key_filter not in key:
            continue
        if isinstance(val, float):
            lines.append(f"  {key:.<45} {val:>10.4f}")
        else:
            lines.append(f"  {key:.<45} {str(val):>10}")
    return "\n".join(lines)


def run_full_analysis(intervals: list[str] = None) -> str:
    """Run complete analysis across all timeframes and generate report."""
    if intervals is None:
        intervals = ["15m", "30m", "1h", "4h"]

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_lines = []
    report_lines.append("=" * 70)
    report_lines.append("  BTC MARKET ANALYSIS — COMPREHENSIVE REPORT")
    report_lines.append(f"  Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    report_lines.append("=" * 70)

    all_results = {}

    for interval in intervals:
        try:
            print(f"\nAnalyzing {interval}...")
            df = load_data("BTCUSDT", interval)
            df = add_derived_columns(df)
            print(f"  Loaded {len(df)} candles")

            results = {}

            print(f"  [1/7] Return distribution...")
            results["returns"] = analyze_returns(df, interval)

            print(f"  [2/7] Volatility regimes...")
            results["volatility"] = analyze_volatility_regimes(df, interval)

            print(f"  [3/7] Trend vs ranging...")
            results["trend"] = analyze_trend_ranging(df, interval)

            print(f"  [4/7] Time effects...")
            results["time"] = analyze_time_effects(df, interval)

            print(f"  [5/7] Volume patterns...")
            results["volume"] = analyze_volume(df, interval)

            print(f"  [6/7] Fair Value Gaps...")
            results["fvg"] = analyze_fvg(df, interval)

            print(f"  [7/7] Market structure...")
            results["structure"] = analyze_market_structure(df, interval)

            all_results[interval] = results

            # Build report sections
            report_lines.append(f"\n\n{'#'*70}")
            report_lines.append(f"  TIMEFRAME: {interval.upper()}")
            report_lines.append(f"  Candles: {len(df)} | Date range: {df['date'].iloc[0].strftime('%Y-%m-%d')} to {df['date'].iloc[-1].strftime('%Y-%m-%d')}")
            report_lines.append(f"{'#'*70}")

            report_lines.append(format_section(f"RETURN DISTRIBUTION ({interval})", results["returns"]))
            report_lines.append(format_section(f"VOLATILITY REGIMES ({interval})", results["volatility"]))
            report_lines.append(format_section(f"TRENDING vs RANGING ({interval})", results["trend"]))
            report_lines.append(format_section(f"TIME EFFECTS ({interval})", results["time"]))
            report_lines.append(format_section(f"VOLUME PATTERNS ({interval})", results["volume"]))
            report_lines.append(format_section(f"FAIR VALUE GAPS ({interval})", results["fvg"]))
            report_lines.append(format_section(f"MARKET STRUCTURE ({interval})", results["structure"]))

        except FileNotFoundError as e:
            print(f"  Skipping {interval}: {e}")
            report_lines.append(f"\n{interval}: DATA NOT AVAILABLE")

    # ── Cross-timeframe comparison ──
    report_lines.append(f"\n\n{'#'*70}")
    report_lines.append("  CROSS-TIMEFRAME COMPARISON")
    report_lines.append(f"{'#'*70}")

    # Compare key metrics across timeframes
    comparison_keys = [
        ("returns", "mean_return_pct", "Mean Return %"),
        ("returns", "std_return_pct", "Return Volatility %"),
        ("returns", "skewness", "Skewness"),
        ("returns", "kurtosis", "Kurtosis (fat tails)"),
        ("returns", "autocorr_lag1", "Autocorrelation (lag 1)"),
        ("volatility", "atr_pct_mean", "Mean ATR %"),
        ("trend", "adx_strong_trend_pct", "% Time Trending (ADX>25)"),
        ("trend", "chop_ranging_pct", "% Time Ranging (Chop>61.8)"),
        ("fvg", "fvg_per_100_bars", "FVGs per 100 bars"),
        ("fvg", "bullish_fill_rate", "Bullish FVG Fill Rate %"),
        ("fvg", "bearish_fill_rate", "Bearish FVG Fill Rate %"),
        ("structure", "avg_swing_size_pct", "Avg Swing Size %"),
        ("structure", "bos_vs_choch_ratio", "BOS vs CHoCH Ratio"),
        ("volume", "vol_predicts_next_move_corr", "Volume→Next Move Correlation"),
    ]

    header = f"  {'Metric':<35}" + "".join(f"{tf:>10}" for tf in all_results.keys())
    report_lines.append(f"\n{header}")
    report_lines.append("  " + "-" * (35 + 10 * len(all_results)))

    for section, key, label in comparison_keys:
        row = f"  {label:<35}"
        for tf, results in all_results.items():
            if section in results and key in results[section]:
                val = results[section][key]
                row += f"{val:>10.4f}"
            else:
                row += f"{'N/A':>10}"
        report_lines.append(row)

    # ── Key Findings / Recommendations ──
    report_lines.append(f"\n\n{'='*70}")
    report_lines.append("  KEY FINDINGS & STRATEGY IMPLICATIONS")
    report_lines.append(f"{'='*70}")

    # Auto-generate findings
    findings = []

    for tf, results in all_results.items():
        r = results.get("returns", {})
        if r.get("kurtosis", 0) > 3:
            findings.append(f"  [{tf}] Heavy fat tails (kurtosis={r['kurtosis']:.1f}) — use wider stops, expect outlier moves")
        if abs(r.get("autocorr_lag1", 0)) > 0.05:
            direction = "momentum" if r["autocorr_lag1"] > 0 else "mean-reverting"
            findings.append(f"  [{tf}] Significant lag-1 autocorrelation ({r['autocorr_lag1']:.4f}) — {direction} tendency")

        t = results.get("trend", {})
        ranging_pct = t.get("chop_ranging_pct", 0)
        if ranging_pct > 50:
            findings.append(f"  [{tf}] Mostly ranging ({ranging_pct:.0f}% choppy) — trend following will struggle, consider mean reversion")

        fvg = results.get("fvg", {})
        bull_fill = fvg.get("bullish_fill_rate", 0)
        bear_fill = fvg.get("bearish_fill_rate", 0)
        if bull_fill > 60 or bear_fill > 60:
            findings.append(f"  [{tf}] High FVG fill rates (bull={bull_fill:.0f}%, bear={bear_fill:.0f}%) — FVG entries viable")

    if findings:
        report_lines.extend(findings)
    else:
        report_lines.append("  No strong statistical findings. Market is relatively efficient at these timeframes.")

    full_report = "\n".join(report_lines)

    # Save report
    report_path = REPORT_DIR / f"btc_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(report_path, "w") as f:
        f.write(full_report)
    print(f"\nReport saved to {report_path}")

    return full_report


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    report = run_full_analysis(["15m", "30m", "1h", "4h"])
    print(report)
