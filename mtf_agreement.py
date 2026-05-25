"""
V6 Multi-TF Agreement — 30M trend bias gate.

Requires that 1H entry signals be aligned with the trend on a lower timeframe
(30M by default). Reduces false positives by ensuring the 1H signal isn't
counter-trend on shorter horizons.

Trend on 30M is classified using the same MS swing logic as V5: count the
direction of the last N confirmed swings. If N consecutive swings agree
(HH+HL = bullish, LH+LL = bearish), trend is set. Otherwise NEUTRAL.

A 1H LONG signal is allowed only when 30M trend is BULLISH.
A 1H SHORT signal is allowed only when 30M trend is BEARISH.
A 1H signal in NEUTRAL 30M is BLOCKED (no clear bias).

Usage
-----
    mtf = MtfAgreement(min_trend_bars=6)
    # Feed 30M bars as they close:
    for bar_30m in candles_30m:
        mtf.update_30m(bar_30m)
    # Then check at 1H signal time:
    if not mtf.allows("LONG"):
        skip_signal()
"""
from __future__ import annotations

from collections import deque
from typing import Literal, Optional


Trend = Literal["BULLISH", "BEARISH", "NEUTRAL"]


class MtfAgreement:
    """
    Lightweight 30M trend classifier using swing-direction tally.

    A `swing high` is a local-max close in a 5-bar window; `swing low` mirror.
    Counts last `min_trend_bars` swings; if all agree, trend is set.
    Falls back to NEUTRAL otherwise.
    """

    def __init__(self, min_trend_bars: int = 6, swing_lookback: int = 5):
        self.min_trend_bars = min_trend_bars
        self.swing_lookback = swing_lookback
        self._closes: deque[float] = deque(maxlen=max(120, swing_lookback * 4))
        self._swings: deque[tuple[str, float]] = deque(maxlen=min_trend_bars * 4)
        self._last_trend: Trend = "NEUTRAL"

    def update_30m(self, close_price: float) -> None:
        """Feed a new 30M bar's close price."""
        if close_price <= 0:
            return
        self._closes.append(close_price)
        if len(self._closes) < self.swing_lookback * 2 + 1:
            return
        # Identify a swing at position -swing_lookback (the bar that's now
        # `swing_lookback` bars ago — we have enough future bars to confirm).
        seq = list(self._closes)
        center = len(seq) - self.swing_lookback - 1
        if center < self.swing_lookback:
            return
        c = seq[center]
        left = seq[center - self.swing_lookback : center]
        right = seq[center + 1 : center + 1 + self.swing_lookback]
        if all(c > x for x in left) and all(c > x for x in right):
            self._swings.append(("HIGH", c))
        elif all(c < x for x in left) and all(c < x for x in right):
            self._swings.append(("LOW", c))
        else:
            return
        self._update_trend()

    def _update_trend(self) -> None:
        if len(self._swings) < self.min_trend_bars:
            self._last_trend = "NEUTRAL"
            return
        recent = list(self._swings)[-self.min_trend_bars :]
        # Classify each consecutive pair (current vs previous of same type)
        highs = [s[1] for s in recent if s[0] == "HIGH"]
        lows = [s[1] for s in recent if s[0] == "LOW"]
        if len(highs) >= 2 and len(lows) >= 2:
            hh = all(highs[i] > highs[i - 1] for i in range(1, len(highs)))
            hl = all(lows[i] > lows[i - 1] for i in range(1, len(lows)))
            lh = all(highs[i] < highs[i - 1] for i in range(1, len(highs)))
            ll = all(lows[i] < lows[i - 1] for i in range(1, len(lows)))
            if hh and hl:
                self._last_trend = "BULLISH"
            elif lh and ll:
                self._last_trend = "BEARISH"
            else:
                self._last_trend = "NEUTRAL"
        else:
            self._last_trend = "NEUTRAL"

    @property
    def current_trend(self) -> Trend:
        return self._last_trend

    def allows(self, direction: Literal["LONG", "SHORT"]) -> bool:
        """True iff the 1H signal direction agrees with 30M trend bias."""
        t = self._last_trend
        if t == "NEUTRAL":
            return False
        if direction == "LONG":
            return t == "BULLISH"
        return t == "BEARISH"


def make_default() -> MtfAgreement:
    return MtfAgreement(min_trend_bars=6, swing_lookback=5)
