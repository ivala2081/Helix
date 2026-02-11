"""
Price Action Indicators Module
Three complete indicator systems:
  1. Market Structure (swing points, BOS, CHoCH, trend detection)
  2. FVG (Fair Value Gap detection, tracking, fill monitoring)
  3. SMC (Order Blocks, Liquidity Zones, Imbalance)
  4. Classic PA (Support/Resistance, Candlestick Patterns)

Each system produces signals that can be scored and combined.
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Trend(Enum):
    BULLISH = 1
    BEARISH = -1
    NEUTRAL = 0


class SignalType(Enum):
    LONG = 1
    SHORT = -1
    NONE = 0


@dataclass
class Signal:
    type: SignalType
    strength: float       # 0.0 to 1.0
    source: str           # which indicator system generated it
    entry_price: float
    stop_loss: float
    bar_index: int
    reason: str


# ═══════════════════════════════════════════════════════════════
# 1. MARKET STRUCTURE
# ═══════════════════════════════════════════════════════════════

class MarketStructure:
    """
    Detects swing highs/lows, BOS (Break of Structure), CHoCH (Change of Character).
    Tracks market trend via HH/HL (bullish) and LH/LL (bearish) sequences.
    """

    def __init__(self, swing_lookback: int = 5):
        self.swing_lookback = swing_lookback

    def calculate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add market structure columns to dataframe."""
        df = df.copy()
        n = len(df)
        lb = self.swing_lookback

        # ── Swing point detection ──
        df["swing_high"] = np.nan
        df["swing_low"] = np.nan

        for i in range(lb, n - lb):
            window_high = df["high"].iloc[i - lb:i + lb + 1]
            window_low = df["low"].iloc[i - lb:i + lb + 1]

            if df["high"].iloc[i] == window_high.max():
                df.iloc[i, df.columns.get_loc("swing_high")] = df["high"].iloc[i]

            if df["low"].iloc[i] == window_low.min():
                df.iloc[i, df.columns.get_loc("swing_low")] = df["low"].iloc[i]

        # ── Forward-fill last known swing points ──
        df["last_swing_high"] = df["swing_high"].ffill()
        df["last_swing_low"] = df["swing_low"].ffill()
        df["prev_swing_high"] = df["swing_high"].ffill().shift(1)
        df["prev_swing_low"] = df["swing_low"].ffill().shift(1)

        # Build swing point history for structure classification
        sh_indices = df.index[df["swing_high"].notna()].tolist()
        sl_indices = df.index[df["swing_low"].notna()].tolist()

        # ── Classify structure: HH, HL, LH, LL ──
        df["structure"] = ""

        # Track last two swing highs and lows
        prev_sh = None
        prev_sl = None
        sh_types = {}  # index -> "HH" or "LH"
        sl_types = {}  # index -> "HL" or "LL"

        for idx in sh_indices:
            val = df["swing_high"].iloc[idx]
            if prev_sh is not None:
                sh_types[idx] = "HH" if val > prev_sh else "LH"
            prev_sh = val

        for idx in sl_indices:
            val = df["swing_low"].iloc[idx]
            if prev_sl is not None:
                sl_types[idx] = "HL" if val > prev_sl else "LL"
            prev_sl = val

        # ── Trend detection from structure ──
        # Bullish = HH + HL, Bearish = LH + LL
        df["ms_trend"] = Trend.NEUTRAL.value

        # Combine all swing events in order
        all_events = []
        for idx, stype in sh_types.items():
            all_events.append((idx, stype))
        for idx, stype in sl_types.items():
            all_events.append((idx, stype))
        all_events.sort(key=lambda x: x[0])

        current_trend = Trend.NEUTRAL
        last_sh_type = None
        last_sl_type = None

        for idx, stype in all_events:
            if stype in ("HH", "LH"):
                last_sh_type = stype
            else:
                last_sl_type = stype

            if last_sh_type == "HH" and last_sl_type == "HL":
                current_trend = Trend.BULLISH
            elif last_sh_type == "LH" and last_sl_type == "LL":
                current_trend = Trend.BEARISH
            elif last_sh_type == "LH" and last_sl_type == "HL":
                current_trend = Trend.NEUTRAL  # transition / CHoCH

            # Fill trend from this event to next
            df.iloc[idx, df.columns.get_loc("ms_trend")] = current_trend.value

        # Forward fill trend
        df["ms_trend"] = df["ms_trend"].replace(0, np.nan)
        # Only ffill the actual trend values that were set at swing points
        for i in range(1, len(df)):
            if df["ms_trend"].iloc[i] == Trend.NEUTRAL.value or pd.isna(df["ms_trend"].iloc[i]):
                df.iloc[i, df.columns.get_loc("ms_trend")] = df["ms_trend"].iloc[i - 1]

        df["ms_trend"] = df["ms_trend"].fillna(Trend.NEUTRAL.value).astype(int)

        # ── Trend maturity (consecutive same-direction swing confirmations) ──
        df["ms_trend_maturity"] = 0
        consec_bull = 0
        consec_bear = 0
        for idx, stype in all_events:
            if stype in ("HH", "HL"):
                consec_bull += 1
                consec_bear = 0
            elif stype in ("LH", "LL"):
                consec_bear += 1
                consec_bull = 0
            maturity = max(consec_bull, consec_bear)
            df.iloc[idx, df.columns.get_loc("ms_trend_maturity")] = maturity
        df["ms_trend_maturity"] = df["ms_trend_maturity"].replace(0, np.nan).ffill().fillna(0).astype(int)

        # ── BOS and CHoCH detection ──
        df["bos"] = 0  # 1 = bullish BOS, -1 = bearish BOS
        df["choch"] = 0  # 1 = bullish CHoCH, -1 = bearish CHoCH

        last_confirmed_sh = None
        last_confirmed_sl = None
        prev_trend = Trend.NEUTRAL

        for i in range(lb, n):
            # Update last confirmed swings
            if not pd.isna(df["swing_high"].iloc[i]):
                last_confirmed_sh = df["swing_high"].iloc[i]
            if not pd.isna(df["swing_low"].iloc[i]):
                last_confirmed_sl = df["swing_low"].iloc[i]

            if last_confirmed_sh is None or last_confirmed_sl is None:
                continue

            cur_trend = Trend(df["ms_trend"].iloc[i]) if df["ms_trend"].iloc[i] != 0 else Trend.NEUTRAL

            # Bullish BOS: close breaks above last swing high in uptrend
            if cur_trend == Trend.BULLISH and df["close"].iloc[i] > last_confirmed_sh:
                df.iloc[i, df.columns.get_loc("bos")] = 1

            # Bearish BOS: close breaks below last swing low in downtrend
            if cur_trend == Trend.BEARISH and df["close"].iloc[i] < last_confirmed_sl:
                df.iloc[i, df.columns.get_loc("bos")] = -1

            # CHoCH: trend changes direction
            if cur_trend != prev_trend and cur_trend != Trend.NEUTRAL and prev_trend != Trend.NEUTRAL:
                if cur_trend == Trend.BULLISH:
                    df.iloc[i, df.columns.get_loc("choch")] = 1
                elif cur_trend == Trend.BEARISH:
                    df.iloc[i, df.columns.get_loc("choch")] = -1

            prev_trend = cur_trend

        return df

    def get_signals(self, df: pd.DataFrame, bar_index: int) -> list[Signal]:
        """Generate entry signals from market structure at given bar."""
        signals = []
        if bar_index < self.swing_lookback * 2:
            return signals

        row = df.iloc[bar_index]
        trend = row["ms_trend"]
        atr = row.get("atr_14", row["high"] - row["low"])
        if atr is None or pd.isna(atr) or atr <= 0:
            return signals

        maturity = int(row.get("ms_trend_maturity", 1))

        # Context modifiers for dynamic signal strength
        body_size = abs(row["close"] - row["open"])
        body_modifier = min(body_size / atr / 1.5, 0.15)  # up to +0.15 for strong candles
        maturity_modifier = min((maturity - 1) * 0.05, 0.15)  # up to +0.15 for mature trends

        # BOS signal — continuation entry (dynamic strength)
        if row["bos"] == 1:
            strength = min(0.55 + maturity_modifier + body_modifier, 0.90)
            sl = row["last_swing_low"] if not pd.isna(row.get("last_swing_low")) else row["low"] - 2 * atr
            signals.append(Signal(
                type=SignalType.LONG, strength=strength, source="market_structure",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bullish BOS — uptrend continuation",
            ))
        elif row["bos"] == -1:
            strength = min(0.55 + maturity_modifier + body_modifier, 0.90)
            sl = row["last_swing_high"] if not pd.isna(row.get("last_swing_high")) else row["high"] + 2 * atr
            signals.append(Signal(
                type=SignalType.SHORT, strength=strength, source="market_structure",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bearish BOS — downtrend continuation",
            ))

        # CHoCH signal — reversal entry (lower base, body modifier only)
        if row["choch"] == 1:
            strength = min(0.40 + body_modifier, 0.60)
            sl = row["low"] - 1.5 * atr
            signals.append(Signal(
                type=SignalType.LONG, strength=strength, source="market_structure",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bullish CHoCH — potential trend reversal",
            ))
        elif row["choch"] == -1:
            strength = min(0.40 + body_modifier, 0.60)
            sl = row["high"] + 1.5 * atr
            signals.append(Signal(
                type=SignalType.SHORT, strength=strength, source="market_structure",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bearish CHoCH — potential trend reversal",
            ))

        return signals


# ═══════════════════════════════════════════════════════════════
# 2. FAIR VALUE GAP (FVG)
# ═══════════════════════════════════════════════════════════════

@dataclass
class FVG:
    direction: str           # "bullish" or "bearish"
    top: float
    bottom: float
    midpoint: float
    creation_bar: int
    filled: bool = False
    fill_bar: Optional[int] = None
    tested: bool = False     # price touched but didn't fill completely
    test_bar: Optional[int] = None


class FairValueGap:
    """
    Detects and tracks Fair Value Gaps (3-candle imbalance zones).
    Generates entry signals when price returns to unfilled FVGs.
    """

    def __init__(self, max_age_bars: int = 100, min_gap_atr_mult: float = 0.3):
        self.max_age_bars = max_age_bars
        self.min_gap_atr_mult = min_gap_atr_mult

    def calculate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect FVGs and add columns."""
        df = df.copy()
        n = len(df)

        df["bullish_fvg_top"] = np.nan
        df["bullish_fvg_bottom"] = np.nan
        df["bearish_fvg_top"] = np.nan
        df["bearish_fvg_bottom"] = np.nan
        df["fvg_signal"] = 0  # 1 = long (price at bullish FVG), -1 = short (price at bearish FVG)
        df["fvg_gap_size_atr"] = 0.0   # gap size relative to ATR (for dynamic strength)
        df["fvg_age_bars"] = 0          # age of FVG when tested (for freshness modifier)

        active_fvgs: list[FVG] = []

        for i in range(2, n):
            atr = df["atr_14"].iloc[i] if "atr_14" in df.columns and not pd.isna(df["atr_14"].iloc[i]) else (df["high"].iloc[i] - df["low"].iloc[i])
            min_gap = atr * self.min_gap_atr_mult

            prev_high = df["high"].iloc[i - 2]
            prev_low = df["low"].iloc[i - 2]
            curr_low = df["low"].iloc[i]
            curr_high = df["high"].iloc[i]

            # Bullish FVG: bar[i-2].high < bar[i].low (gap up, wick doesn't fill)
            if prev_high < curr_low and (curr_low - prev_high) >= min_gap:
                fvg = FVG(
                    direction="bullish",
                    top=curr_low,
                    bottom=prev_high,
                    midpoint=(curr_low + prev_high) / 2,
                    creation_bar=i - 1,
                )
                active_fvgs.append(fvg)
                df.iloc[i, df.columns.get_loc("bullish_fvg_top")] = fvg.top
                df.iloc[i, df.columns.get_loc("bullish_fvg_bottom")] = fvg.bottom

            # Bearish FVG: bar[i-2].low > bar[i].high (gap down)
            if prev_low > curr_high and (prev_low - curr_high) >= min_gap:
                fvg = FVG(
                    direction="bearish",
                    top=prev_low,
                    bottom=curr_high,
                    midpoint=(prev_low + curr_high) / 2,
                    creation_bar=i - 1,
                )
                active_fvgs.append(fvg)
                df.iloc[i, df.columns.get_loc("bearish_fvg_top")] = fvg.top
                df.iloc[i, df.columns.get_loc("bearish_fvg_bottom")] = fvg.bottom

            # Check if price interacts with any active FVG
            for fvg in active_fvgs:
                if fvg.filled:
                    continue
                age = i - fvg.creation_bar
                if age > self.max_age_bars:
                    fvg.filled = True  # expired
                    continue

                if fvg.direction == "bullish":
                    # Price dips into bullish FVG = buy signal
                    if df["low"].iloc[i] <= fvg.top and df["low"].iloc[i] >= fvg.bottom:
                        if not fvg.tested:
                            fvg.tested = True
                            fvg.test_bar = i
                            df.iloc[i, df.columns.get_loc("fvg_signal")] = 1
                            # Record FVG context for dynamic strength
                            gap_size = fvg.top - fvg.bottom
                            df.iloc[i, df.columns.get_loc("fvg_gap_size_atr")] = gap_size / atr if atr > 0 else 0
                            df.iloc[i, df.columns.get_loc("fvg_age_bars")] = age
                    # FVG filled (price went through completely)
                    if df["low"].iloc[i] < fvg.bottom:
                        fvg.filled = True
                        fvg.fill_bar = i

                elif fvg.direction == "bearish":
                    # Price rises into bearish FVG = sell signal
                    if df["high"].iloc[i] >= fvg.bottom and df["high"].iloc[i] <= fvg.top:
                        if not fvg.tested:
                            fvg.tested = True
                            fvg.test_bar = i
                            df.iloc[i, df.columns.get_loc("fvg_signal")] = -1
                            # Record FVG context for dynamic strength
                            gap_size = fvg.top - fvg.bottom
                            df.iloc[i, df.columns.get_loc("fvg_gap_size_atr")] = gap_size / atr if atr > 0 else 0
                            df.iloc[i, df.columns.get_loc("fvg_age_bars")] = age
                    # FVG filled
                    if df["high"].iloc[i] > fvg.top:
                        fvg.filled = True
                        fvg.fill_bar = i

            # Clean up old filled FVGs
            active_fvgs = [f for f in active_fvgs if not f.filled]

        return df

    def get_signals(self, df: pd.DataFrame, bar_index: int) -> list[Signal]:
        """Generate signals from FVG interactions (dynamic strength)."""
        signals = []
        row = df.iloc[bar_index]
        atr = row.get("atr_14", row["high"] - row["low"])
        if atr is None or pd.isna(atr) or atr <= 0:
            return signals

        if row["fvg_signal"] == 1:
            # Dynamic strength based on gap size and freshness
            gap_atr = row.get("fvg_gap_size_atr", 0.5)
            age = row.get("fvg_age_bars", 50)
            gap_modifier = min(float(gap_atr) * 0.15, 0.20)
            freshness_modifier = max(0.10 - float(age) * 0.002, 0.0)
            strength = min(0.40 + gap_modifier + freshness_modifier, 0.80)

            sl = row["low"] - 1.5 * atr
            signals.append(Signal(
                type=SignalType.LONG, strength=strength, source="fvg",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bullish FVG retest — buying at imbalance zone",
            ))
        elif row["fvg_signal"] == -1:
            gap_atr = row.get("fvg_gap_size_atr", 0.5)
            age = row.get("fvg_age_bars", 50)
            gap_modifier = min(float(gap_atr) * 0.15, 0.20)
            freshness_modifier = max(0.10 - float(age) * 0.002, 0.0)
            strength = min(0.40 + gap_modifier + freshness_modifier, 0.80)

            sl = row["high"] + 1.5 * atr
            signals.append(Signal(
                type=SignalType.SHORT, strength=strength, source="fvg",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bearish FVG retest — selling at imbalance zone",
            ))

        return signals


# ═══════════════════════════════════════════════════════════════
# 3. SMC (Smart Money Concepts)
# ═══════════════════════════════════════════════════════════════

@dataclass
class OrderBlock:
    direction: str          # "bullish" or "bearish"
    top: float
    bottom: float
    creation_bar: int
    mitigated: bool = False
    mitigated_bar: Optional[int] = None


class SMCIndicators:
    """
    Smart Money Concepts: Order Blocks, Liquidity Sweeps, Breaker Blocks.
    Identifies institutional activity zones.
    """

    def __init__(self, swing_lookback: int = 5, ob_max_age: int = 100):
        self.swing_lookback = swing_lookback
        self.ob_max_age = ob_max_age

    def calculate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add SMC columns."""
        df = df.copy()
        n = len(df)

        df["order_block_bull"] = np.nan     # bullish OB zone bottom
        df["order_block_bear"] = np.nan     # bearish OB zone top
        df["liquidity_sweep"] = 0           # 1 = swept lows (bullish), -1 = swept highs (bearish)
        df["smc_signal"] = 0

        active_obs: list[OrderBlock] = []

        # ── Order Block Detection ──
        # Bullish OB: last bearish candle before a strong bullish move
        # Bearish OB: last bullish candle before a strong bearish move
        for i in range(2, n):
            atr = df["atr_14"].iloc[i] if "atr_14" in df.columns and not pd.isna(df["atr_14"].iloc[i]) else abs(df["high"].iloc[i] - df["low"].iloc[i])

            # Strong move up: current close > prev close by > 1.5 ATR
            move_up = df["close"].iloc[i] - df["close"].iloc[i - 1]
            move_down = df["close"].iloc[i - 1] - df["close"].iloc[i]

            if move_up > 1.5 * atr:
                # Bullish OB = the last bearish candle before this move
                for j in range(i - 1, max(i - 5, 0), -1):
                    if df["close"].iloc[j] < df["open"].iloc[j]:  # bearish candle
                        ob = OrderBlock(
                            direction="bullish",
                            top=max(df["open"].iloc[j], df["close"].iloc[j]),
                            bottom=min(df["open"].iloc[j], df["close"].iloc[j]),
                            creation_bar=j,
                        )
                        active_obs.append(ob)
                        df.iloc[j, df.columns.get_loc("order_block_bull")] = ob.bottom
                        break

            if move_down > 1.5 * atr:
                # Bearish OB = the last bullish candle before this move
                for j in range(i - 1, max(i - 5, 0), -1):
                    if df["close"].iloc[j] > df["open"].iloc[j]:  # bullish candle
                        ob = OrderBlock(
                            direction="bearish",
                            top=max(df["open"].iloc[j], df["close"].iloc[j]),
                            bottom=min(df["open"].iloc[j], df["close"].iloc[j]),
                            creation_bar=j,
                        )
                        active_obs.append(ob)
                        df.iloc[j, df.columns.get_loc("order_block_bear")] = ob.top
                        break

            # ── Check OB interactions ──
            for ob in active_obs:
                if ob.mitigated:
                    continue
                age = i - ob.creation_bar
                if age > self.ob_max_age:
                    ob.mitigated = True
                    continue

                if ob.direction == "bullish":
                    # Price returns to bullish OB = buy signal
                    if df["low"].iloc[i] <= ob.top and df["close"].iloc[i] >= ob.bottom:
                        if not ob.mitigated:
                            df.iloc[i, df.columns.get_loc("smc_signal")] = 1
                    # OB mitigated (price broke through)
                    if df["close"].iloc[i] < ob.bottom:
                        ob.mitigated = True
                        ob.mitigated_bar = i

                elif ob.direction == "bearish":
                    if df["high"].iloc[i] >= ob.bottom and df["close"].iloc[i] <= ob.top:
                        if not ob.mitigated:
                            df.iloc[i, df.columns.get_loc("smc_signal")] = -1
                    if df["close"].iloc[i] > ob.top:
                        ob.mitigated = True
                        ob.mitigated_bar = i

            # Clean up
            active_obs = [ob for ob in active_obs if not ob.mitigated]

        # ── Liquidity Sweep Detection ──
        lb = self.swing_lookback
        for i in range(lb + 1, n):
            # Find recent swing low
            recent_low = df["low"].iloc[max(0, i - 20):i].min()
            recent_high = df["high"].iloc[max(0, i - 20):i].max()

            # Sweep low: wick below recent low, close back above = bullish
            if df["low"].iloc[i] < recent_low and df["close"].iloc[i] > recent_low:
                df.iloc[i, df.columns.get_loc("liquidity_sweep")] = 1

            # Sweep high: wick above recent high, close back below = bearish
            if df["high"].iloc[i] > recent_high and df["close"].iloc[i] < recent_high:
                df.iloc[i, df.columns.get_loc("liquidity_sweep")] = -1

        return df

    def get_signals(self, df: pd.DataFrame, bar_index: int) -> list[Signal]:
        """Generate signals from SMC concepts."""
        signals = []
        row = df.iloc[bar_index]
        atr = row.get("atr_14", row["high"] - row["low"])

        # Order Block signals
        if row["smc_signal"] == 1:
            sl = row["low"] - 2 * atr
            signals.append(Signal(
                type=SignalType.LONG, strength=0.65, source="smc",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bullish Order Block retest",
            ))
        elif row["smc_signal"] == -1:
            sl = row["high"] + 2 * atr
            signals.append(Signal(
                type=SignalType.SHORT, strength=0.65, source="smc",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Bearish Order Block retest",
            ))

        # Liquidity sweep signals
        if row["liquidity_sweep"] == 1:
            sl = row["low"] - 1 * atr
            signals.append(Signal(
                type=SignalType.LONG, strength=0.75, source="smc_sweep",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Liquidity sweep below lows — bullish reversal",
            ))
        elif row["liquidity_sweep"] == -1:
            sl = row["high"] + 1 * atr
            signals.append(Signal(
                type=SignalType.SHORT, strength=0.75, source="smc_sweep",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index, reason="Liquidity sweep above highs — bearish reversal",
            ))

        return signals


# ═══════════════════════════════════════════════════════════════
# 4. CLASSIC PRICE ACTION
# ═══════════════════════════════════════════════════════════════

class ClassicPA:
    """
    Classic price action: Support/Resistance zones, Candlestick patterns.
    """

    def __init__(self, sr_lookback: int = 50, sr_touches: int = 2, sr_tolerance_pct: float = 0.3):
        self.sr_lookback = sr_lookback
        self.sr_touches = sr_touches
        self.sr_tolerance_pct = sr_tolerance_pct

    def calculate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add classic PA columns. Vectorized for performance."""
        df = df.copy()
        n = len(df)

        # ── Vectorized Candlestick Pattern Detection ──
        o = df["open"].values
        h = df["high"].values
        l = df["low"].values
        c = df["close"].values

        body = np.abs(c - o)
        total_range = h - l
        upper_wick = h - np.maximum(o, c)
        lower_wick = np.minimum(o, c) - l

        # Avoid division by zero
        safe_range = np.where(total_range > 0, total_range, 1.0)
        body_ratio = body / safe_range

        prev_o = np.roll(o, 1)
        prev_c = np.roll(c, 1)

        patterns = np.full(n, "", dtype=object)

        # Bullish Engulfing
        bull_eng = ((c > o) & (prev_c < prev_o) & (c > prev_o) & (o < prev_c) & (body_ratio > 0.5) & (total_range > 0))
        patterns = np.where(bull_eng, "bullish_engulfing", patterns)

        # Bearish Engulfing
        bear_eng = ((c < o) & (prev_c > prev_o) & (c < prev_o) & (o > prev_c) & (body_ratio > 0.5) & (total_range > 0))
        patterns = np.where(bear_eng & (patterns == ""), "bearish_engulfing", patterns)

        # Hammer
        safe_body = np.where(body > 0, body, 1.0)
        hammer = ((lower_wick > 2 * body) & (upper_wick < body) & (body_ratio < 0.35) & (c >= o) & (total_range > 0))
        patterns = np.where(hammer & (patterns == ""), "hammer", patterns)

        # Shooting Star
        shooting = ((upper_wick > 2 * body) & (lower_wick < body) & (body_ratio < 0.35) & (c <= o) & (total_range > 0))
        patterns = np.where(shooting & (patterns == ""), "shooting_star", patterns)

        # Pin Bar Bull
        pin_bull = ((lower_wick / safe_range > 0.6) & (body_ratio < 0.25) & (total_range > 0))
        patterns = np.where(pin_bull & (patterns == ""), "pin_bar_bull", patterns)

        # Pin Bar Bear
        pin_bear = ((upper_wick / safe_range > 0.6) & (body_ratio < 0.25) & (total_range > 0))
        patterns = np.where(pin_bear & (patterns == ""), "pin_bar_bear", patterns)

        # Doji
        doji = (body_ratio < 0.1) & (total_range > 0)
        patterns = np.where(doji & (patterns == ""), "doji", patterns)

        # Fix first bar
        patterns[0] = ""
        df["candle_pattern"] = patterns

        # ── Vectorized S/R Detection ──
        # Use rolling min/max of lows/highs for efficient S/R proximity check
        lb = self.sr_lookback
        tolerance_arr = df["close"].values * self.sr_tolerance_pct / 100

        # Rolling support: count how many lows in window are near current close
        at_support = np.zeros(n, dtype=bool)
        at_resistance = np.zeros(n, dtype=bool)

        low_vals = df["low"].values
        high_vals = df["high"].values
        close_vals = df["close"].values

        # For each bar, check if current close is near a level that was touched multiple times
        # Optimized: use rolling approach with step sampling
        for i in range(lb, n):
            price = close_vals[i]
            tol = tolerance_arr[i]

            window_low = low_vals[i - lb:i]
            window_high = high_vals[i - lb:i]

            support_touches = np.sum(np.abs(window_low - price) < tol)
            resistance_touches = np.sum(np.abs(window_high - price) < tol)

            if support_touches >= self.sr_touches and low_vals[i] <= price + tol:
                at_support[i] = True
            if resistance_touches >= self.sr_touches and high_vals[i] >= price - tol:
                at_resistance[i] = True

        df["at_support"] = at_support
        df["at_resistance"] = at_resistance

        # ── Combine patterns with S/R for signals (vectorized) ──
        bullish_patterns = np.isin(patterns, ["bullish_engulfing", "hammer", "pin_bar_bull"])
        bearish_patterns = np.isin(patterns, ["bearish_engulfing", "shooting_star", "pin_bar_bear"])

        pa_signal = np.zeros(n, dtype=int)
        pa_signal = np.where(at_support & bullish_patterns, 1, pa_signal)
        pa_signal = np.where(at_resistance & bearish_patterns, -1, pa_signal)
        df["pa_signal"] = pa_signal

        return df

    def get_signals(self, df: pd.DataFrame, bar_index: int) -> list[Signal]:
        """Generate signals from classic PA."""
        signals = []
        row = df.iloc[bar_index]
        atr = row.get("atr_14", row["high"] - row["low"])

        if row["pa_signal"] == 1:
            sl = row["low"] - 1.5 * atr
            signals.append(Signal(
                type=SignalType.LONG, strength=0.55, source="classic_pa",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index,
                reason=f"Bullish {row['candle_pattern']} at support",
            ))
        elif row["pa_signal"] == -1:
            sl = row["high"] + 1.5 * atr
            signals.append(Signal(
                type=SignalType.SHORT, strength=0.55, source="classic_pa",
                entry_price=row["close"], stop_loss=sl,
                bar_index=bar_index,
                reason=f"Bearish {row['candle_pattern']} at resistance",
            ))

        # Standalone strong patterns (without S/R confirmation, lower strength)
        pattern = row["candle_pattern"]
        if row["pa_signal"] == 0 and pattern:
            if pattern in ("bullish_engulfing", "hammer"):
                sl = row["low"] - 2 * atr
                signals.append(Signal(
                    type=SignalType.LONG, strength=0.35, source="classic_pa",
                    entry_price=row["close"], stop_loss=sl,
                    bar_index=bar_index,
                    reason=f"Standalone {pattern} (no S/R confirmation)",
                ))
            elif pattern in ("bearish_engulfing", "shooting_star"):
                sl = row["high"] + 2 * atr
                signals.append(Signal(
                    type=SignalType.SHORT, strength=0.35, source="classic_pa",
                    entry_price=row["close"], stop_loss=sl,
                    bar_index=bar_index,
                    reason=f"Standalone {pattern} (no S/R confirmation)",
                ))

        return signals


# ═══════════════════════════════════════════════════════════════
# 5. COMBINED SIGNAL AGGREGATOR
# ═══════════════════════════════════════════════════════════════

class SignalAggregator:
    """
    Combines signals from all indicator systems.
    Produces a final confluence score and unified entry/exit signals.
    """

    def __init__(
        self,
        ms_weight: float = 1.0,
        fvg_weight: float = 1.0,
        smc_weight: float = 1.0,
        pa_weight: float = 1.0,
        min_confluence: float = 0.5,
    ):
        self.weights = {
            "market_structure": ms_weight,
            "fvg": fvg_weight,
            "smc": smc_weight,
            "smc_sweep": smc_weight,
            "classic_pa": pa_weight,
        }
        self.min_confluence = min_confluence

    def aggregate(self, all_signals: list[Signal]) -> dict:
        """
        Aggregate signals into a final decision.

        Returns:
            dict with keys: action (LONG/SHORT/NONE), score, best_entry, best_sl, signals
        """
        if not all_signals:
            return {"action": SignalType.NONE, "score": 0.0, "signals": []}

        # Separate long and short signals
        long_signals = [s for s in all_signals if s.type == SignalType.LONG]
        short_signals = [s for s in all_signals if s.type == SignalType.SHORT]

        long_score = sum(s.strength * self.weights.get(s.source, 1.0) for s in long_signals)
        short_score = sum(s.strength * self.weights.get(s.source, 1.0) for s in short_signals)

        # Normalize by total possible weight
        total_weight = sum(self.weights.values())
        long_score_norm = long_score / total_weight if total_weight > 0 else 0
        short_score_norm = short_score / total_weight if total_weight > 0 else 0

        # Determine action
        if long_score_norm >= self.min_confluence and long_score_norm > short_score_norm:
            # Pick the signal with best (tightest) stop for entry
            best = max(long_signals, key=lambda s: s.strength)
            return {
                "action": SignalType.LONG,
                "score": long_score_norm,
                "entry_price": best.entry_price,
                "stop_loss": best.stop_loss,
                "signals": long_signals,
                "reasons": [s.reason for s in long_signals],
            }
        elif short_score_norm >= self.min_confluence and short_score_norm > long_score_norm:
            best = max(short_signals, key=lambda s: s.strength)
            return {
                "action": SignalType.SHORT,
                "score": short_score_norm,
                "entry_price": best.entry_price,
                "stop_loss": best.stop_loss,
                "signals": short_signals,
                "reasons": [s.reason for s in short_signals],
            }
        else:
            return {"action": SignalType.NONE, "score": max(long_score_norm, short_score_norm), "signals": all_signals}


# ═══════════════════════════════════════════════════════════════
# HELPER: Add ATR to a raw dataframe
# ═══════════════════════════════════════════════════════════════

def add_atr(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    """Add ATR column if not present."""
    if "atr_14" not in df.columns:
        df = df.copy()
        tr = pd.concat([
            df["high"] - df["low"],
            (df["high"] - df["close"].shift(1)).abs(),
            (df["low"] - df["close"].shift(1)).abs(),
        ], axis=1).max(axis=1)
        df["atr_14"] = tr.rolling(period).mean()
    return df
