"""
V6 Regime Filter — entry-side realized-volatility gate.

Live observation showed strategy stalls in low-vol regimes (TP1 hit but TP2/3
unreached, 14/31 trades exit "TP1 then BE-stop"). This module computes a
trailing realized-volatility signal and blocks entries when current RV is in
the bottom percentile of a rolling history window.

Usage
-----
    rs = RegimeState(history_window_bars=365*24, lookback_bars=24*24)
    for bar in candles:
        rs.update(bar)
        if rs.is_low_regime(percentile_floor=0.30):
            # skip entry signal
            continue
"""
from __future__ import annotations

import math
from collections import deque
from typing import Optional


class RegimeState:
    """
    Incremental realized-volatility tracker.

    Maintains a rolling buffer of log returns. RV is std of recent N returns,
    annualized for stability. is_low_regime() compares current RV against a
    longer rolling distribution and returns True if it's below the floor.
    """

    def __init__(
        self,
        history_window_bars: int = 365 * 24,
        lookback_bars: int = 24 * 24,
    ):
        if lookback_bars < 10:
            raise ValueError("lookback_bars too small for meaningful RV")
        if history_window_bars < lookback_bars * 5:
            raise ValueError("history_window_bars must be >= 5× lookback_bars")
        self.lookback_bars = lookback_bars
        self.history_window_bars = history_window_bars
        self._closes: deque[float] = deque(maxlen=history_window_bars + 1)
        self._rv_history: deque[float] = deque(maxlen=history_window_bars)
        self._current_rv: Optional[float] = None

    def update(self, close_price: float) -> None:
        """Feed a new bar's close. Updates current_rv and history buffer."""
        if close_price <= 0:
            return
        self._closes.append(close_price)
        if len(self._closes) < self.lookback_bars + 1:
            return
        # Compute trailing-lookback log-return std
        rets = []
        prev = None
        seq = list(self._closes)[-(self.lookback_bars + 1) :]
        for c in seq:
            if prev is not None and prev > 0 and c > 0:
                rets.append(math.log(c / prev))
            prev = c
        if len(rets) < 5:
            return
        n = len(rets)
        mean = sum(rets) / n
        var = sum((r - mean) ** 2 for r in rets) / (n - 1)
        rv = math.sqrt(var) * math.sqrt(8760)  # annualized
        self._current_rv = rv
        self._rv_history.append(rv)

    @property
    def current_rv(self) -> Optional[float]:
        return self._current_rv

    def has_enough_history(self, min_bars: int = 30 * 24) -> bool:
        """Need at least ~30 days of RV samples to compute meaningful percentiles."""
        return len(self._rv_history) >= min_bars

    def percentile_of_current(self) -> Optional[float]:
        """
        Returns the percentile rank (0..1) of current_rv inside the history
        window. None if not enough history.
        """
        if not self.has_enough_history():
            return None
        if self._current_rv is None:
            return None
        below = sum(1 for x in self._rv_history if x < self._current_rv)
        return below / len(self._rv_history)

    def is_low_regime(self, percentile_floor: float = 0.30) -> bool:
        """
        True iff current RV is in the bottom `percentile_floor` of history.
        Returns False if not enough history yet (don't block entries when
        we can't measure).
        """
        pct = self.percentile_of_current()
        if pct is None:
            return False
        return pct < percentile_floor


# Convenience factory for default V6 settings
def make_default(symbol_interval: str = "1h") -> RegimeState:
    if symbol_interval != "1h":
        raise NotImplementedError("V6 ships with 1H base only")
    return RegimeState(
        history_window_bars=365 * 24,
        lookback_bars=24 * 24,
    )
