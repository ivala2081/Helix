"""
V6 Adaptive Sizing — trailing-Sharpe modulated risk per trade.

Replaces V5's fixed risk_pct=0.03 with a state-aware sizing that:
  - shrinks risk after a losing streak (recent Sharpe negative)
  - grows risk after a winning streak (recent Sharpe positive)
  - clamps to [min_risk, max_risk]
  - defaults to baseline during warmup (fewer than window trades)

Formula
-------
    sharpe_n = mean(R_last_N) / std(R_last_N)
    risk_pct = baseline + sharpe_n * coefficient
    risk_pct = clamp(risk_pct, min, max)

Usage
-----
    az = AdaptiveSizing(baseline=0.015, coef=0.005, window=20, lo=0.005, hi=0.025)
    az.record_trade(r_multiple=+1.5)
    risk = az.current_risk_pct()  # used at next entry
"""
from __future__ import annotations

import math
from collections import deque


class AdaptiveSizing:
    def __init__(
        self,
        baseline: float = 0.015,
        coef: float = 0.005,
        window: int = 20,
        lo: float = 0.005,
        hi: float = 0.025,
    ):
        if not (lo <= baseline <= hi):
            raise ValueError("baseline must be within [lo, hi]")
        self.baseline = baseline
        self.coef = coef
        self.window = window
        self.lo = lo
        self.hi = hi
        self._r_history: deque[float] = deque(maxlen=window)

    def record_trade(self, r_multiple: float) -> None:
        """Record a completed trade's R-multiple. Affects next-trade sizing."""
        if r_multiple is None:
            return
        if isinstance(r_multiple, float) and (math.isnan(r_multiple) or math.isinf(r_multiple)):
            return
        self._r_history.append(float(r_multiple))

    def current_sharpe(self) -> float:
        """Trailing Sharpe (per-trade) on the rolling window. 0 during warmup."""
        n = len(self._r_history)
        if n < max(5, self.window // 4):
            return 0.0
        vals = list(self._r_history)
        mean = sum(vals) / n
        if n < 2:
            return 0.0
        var = sum((v - mean) ** 2 for v in vals) / (n - 1)
        std = math.sqrt(var)
        return mean / std if std > 0 else 0.0

    def current_risk_pct(self) -> float:
        """Risk fraction for the next trade. Clamped to [lo, hi]."""
        if len(self._r_history) < max(5, self.window // 4):
            return self.baseline
        s = self.current_sharpe()
        risk = self.baseline + s * self.coef
        return max(self.lo, min(self.hi, risk))

    def reset(self) -> None:
        self._r_history.clear()


def make_default() -> AdaptiveSizing:
    return AdaptiveSizing(
        baseline=0.015, coef=0.005, window=20, lo=0.005, hi=0.025,
    )
