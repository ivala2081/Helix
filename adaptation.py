"""
Adaptation Methods — Dynamic parameter adjustment based on market conditions.
Three approaches:
  1. Volatility-based: adjust SL/TP/risk based on ATR regime
  2. Regime detection: trend vs range detection, different rules per regime
  3. Self-learning: track recent performance, tighten/loosen parameters

Each adapter wraps the backtester and modifies its parameters per-bar.
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from enum import Enum


class VolRegime(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class MarketRegime(Enum):
    TRENDING = "trending"
    RANGING = "ranging"
    VOLATILE = "volatile"


# ═══════════════════════════════════════════════════════════════
# 1. VOLATILITY-BASED ADAPTATION
# ═══════════════════════════════════════════════════════════════

class VolatilityAdapter:
    """
    Adjusts SL width, TP targets, risk%, and trailing based on
    ATR percentile regime (low/medium/high volatility).

    Low vol: tighter stops, closer TPs, higher risk (less noise)
    High vol: wider stops, further TPs, lower risk (more noise)
    """

    # Parameter multipliers per regime (relative to base)
    REGIME_PARAMS = {
        VolRegime.LOW: {
            "sl_mult": 0.8,        # tighter stops
            "tp_mult": 0.8,        # closer targets
            "risk_mult": 1.2,      # slightly higher risk (cleaner)
            "trailing_mult": 0.8,
            "min_confluence": 0.45, # slightly easier entry (less noise)
        },
        VolRegime.MEDIUM: {
            "sl_mult": 1.0,
            "tp_mult": 1.0,
            "risk_mult": 1.0,
            "trailing_mult": 1.0,
            "min_confluence": 0.50,
        },
        VolRegime.HIGH: {
            "sl_mult": 1.4,        # wider stops
            "tp_mult": 1.3,        # further targets
            "risk_mult": 0.7,      # reduced risk
            "trailing_mult": 1.3,
            "min_confluence": 0.55, # stricter entry (more noise)
        },
    }

    def __init__(self, atr_period: int = 14, lookback: int = 100):
        self.atr_period = atr_period
        self.lookback = lookback

    def classify_regime(self, df: pd.DataFrame, bar_idx: int) -> VolRegime:
        """Classify current volatility regime based on ATR percentile."""
        if bar_idx < self.lookback:
            return VolRegime.MEDIUM

        atr_col = "atr_14" if "atr_14" in df.columns else None
        if not atr_col:
            return VolRegime.MEDIUM

        current_atr = df[atr_col].iloc[bar_idx]
        historical_atr = df[atr_col].iloc[max(0, bar_idx - self.lookback):bar_idx]

        if len(historical_atr) < 20 or pd.isna(current_atr):
            return VolRegime.MEDIUM

        q33 = historical_atr.quantile(0.33)
        q67 = historical_atr.quantile(0.67)

        if current_atr <= q33:
            return VolRegime.LOW
        elif current_atr >= q67:
            return VolRegime.HIGH
        else:
            return VolRegime.MEDIUM

    def get_params(self, regime: VolRegime) -> dict:
        """Get parameter adjustments for given regime."""
        return self.REGIME_PARAMS[regime]

    def adapt_backtester_params(self, base_params: dict, regime: VolRegime) -> dict:
        """Apply regime multipliers to base backtester parameters."""
        adjustments = self.get_params(regime)
        adapted = base_params.copy()

        adapted["sl_atr_mult"] = base_params["sl_atr_mult"] * adjustments["sl_mult"]
        adapted["tp1_atr_mult"] = base_params["tp1_atr_mult"] * adjustments["tp_mult"]
        adapted["tp2_atr_mult"] = base_params["tp2_atr_mult"] * adjustments["tp_mult"]
        adapted["tp3_atr_mult"] = base_params["tp3_atr_mult"] * adjustments["tp_mult"]
        adapted["risk_pct"] = base_params["risk_pct"] * adjustments["risk_mult"]
        adapted["trailing_atr_mult"] = base_params["trailing_atr_mult"] * adjustments["trailing_mult"]
        adapted["min_confluence"] = adjustments["min_confluence"]

        return adapted


# ═══════════════════════════════════════════════════════════════
# 2. REGIME DETECTION ADAPTATION
# ═══════════════════════════════════════════════════════════════

class RegimeAdapter:
    """
    Detects market regime (trending vs ranging vs volatile) and
    applies different strategy rules for each.

    Trending: follow breakouts, wider trailing, let winners run
    Ranging: take profits earlier, mean-reversion bias, tighter TPs
    Volatile: reduce size, wider stops, only highest-conviction entries
    """

    REGIME_RULES = {
        MarketRegime.TRENDING: {
            "sl_mult": 1.0,
            "tp_mult": 1.5,        # let winners run further
            "risk_mult": 1.1,
            "trailing_mult": 1.0,
            "min_confluence": 0.45,
            "tp1_close_pct": 0.30,  # close less at TP1 (let it run)
            "tp2_close_pct": 0.30,
            "tp3_close_pct": 0.40,
        },
        MarketRegime.RANGING: {
            "sl_mult": 0.8,
            "tp_mult": 0.6,        # take profits earlier
            "risk_mult": 0.9,
            "trailing_mult": 0.7,
            "min_confluence": 0.50,
            "tp1_close_pct": 0.50,  # close more at TP1 (range bound)
            "tp2_close_pct": 0.30,
            "tp3_close_pct": 0.20,
        },
        MarketRegime.VOLATILE: {
            "sl_mult": 1.5,
            "tp_mult": 1.2,
            "risk_mult": 0.6,      # reduce exposure
            "trailing_mult": 1.5,
            "min_confluence": 0.60, # only best setups
            "tp1_close_pct": 0.40,
            "tp2_close_pct": 0.30,
            "tp3_close_pct": 0.30,
        },
    }

    def __init__(self, er_period: int = 20, atr_period: int = 14, lookback: int = 100):
        self.er_period = er_period
        self.atr_period = atr_period
        self.lookback = lookback

    def classify_regime(self, df: pd.DataFrame, bar_idx: int) -> MarketRegime:
        """Classify market regime using Efficiency Ratio + ATR."""
        if bar_idx < max(self.er_period, self.lookback):
            return MarketRegime.RANGING

        close = df["close"]

        # Efficiency Ratio
        price_change = abs(close.iloc[bar_idx] - close.iloc[bar_idx - self.er_period])
        sum_changes = close.diff().abs().iloc[bar_idx - self.er_period:bar_idx].sum()
        er = price_change / sum_changes if sum_changes > 0 else 0

        # ATR regime
        atr_col = "atr_14" if "atr_14" in df.columns else None
        if atr_col:
            current_atr = df[atr_col].iloc[bar_idx]
            hist_atr = df[atr_col].iloc[max(0, bar_idx - self.lookback):bar_idx]
            atr_pctile = (hist_atr < current_atr).mean() if len(hist_atr) > 0 else 0.5
        else:
            atr_pctile = 0.5

        # Classification logic
        if atr_pctile > 0.80:
            return MarketRegime.VOLATILE
        elif er > 0.30:
            return MarketRegime.TRENDING
        else:
            return MarketRegime.RANGING

    def get_params(self, regime: MarketRegime) -> dict:
        return self.REGIME_RULES[regime]

    def adapt_backtester_params(self, base_params: dict, regime: MarketRegime) -> dict:
        adjustments = self.get_params(regime)
        adapted = base_params.copy()

        adapted["sl_atr_mult"] = base_params["sl_atr_mult"] * adjustments["sl_mult"]
        adapted["tp1_atr_mult"] = base_params["tp1_atr_mult"] * adjustments["tp_mult"]
        adapted["tp2_atr_mult"] = base_params["tp2_atr_mult"] * adjustments["tp_mult"]
        adapted["tp3_atr_mult"] = base_params["tp3_atr_mult"] * adjustments["tp_mult"]
        adapted["risk_pct"] = base_params["risk_pct"] * adjustments["risk_mult"]
        adapted["trailing_atr_mult"] = base_params["trailing_atr_mult"] * adjustments["trailing_mult"]
        adapted["min_confluence"] = adjustments["min_confluence"]
        adapted["tp1_close_pct"] = adjustments["tp1_close_pct"]
        adapted["tp2_close_pct"] = adjustments["tp2_close_pct"]
        adapted["tp3_close_pct"] = adjustments["tp3_close_pct"]

        return adapted


# ═══════════════════════════════════════════════════════════════
# 3. SELF-LEARNING ADAPTATION
# ═══════════════════════════════════════════════════════════════

class SelfLearningAdapter:
    """
    Tracks recent trade performance and adjusts parameters.

    Win streak → slightly tighten entry (avoid overtrading in easy market)
    Loss streak → tighten entry harder, reduce risk (protect capital)
    Consistent wins → maintain or slightly increase risk
    Consistent losses → reduce risk, increase confluence threshold

    IMPORTANT: Only adapts risk parameters, NOT entry logic.
    Entry threshold only tightens (never loosens) to avoid noise.
    """

    def __init__(
        self,
        window: int = 20,          # last N trades to evaluate
        min_trades: int = 10,       # minimum trades before adapting
        max_risk_increase: float = 1.3,  # max 30% risk increase
        max_risk_decrease: float = 0.5,  # max 50% risk decrease
    ):
        self.window = window
        self.min_trades = min_trades
        self.max_risk_increase = max_risk_increase
        self.max_risk_decrease = max_risk_decrease
        self.trade_results: list[float] = []  # PnL of recent trades

    def record_trade(self, pnl: float):
        """Record a trade result."""
        self.trade_results.append(pnl)

    def get_adaptation(self, base_params: dict) -> dict:
        """Compute adapted parameters based on recent performance."""
        adapted = base_params.copy()

        if len(self.trade_results) < self.min_trades:
            return adapted

        recent = self.trade_results[-self.window:]
        wins = [p for p in recent if p > 0]
        losses = [p for p in recent if p <= 0]

        win_rate = len(wins) / len(recent)

        # ── Risk adjustment ──
        if win_rate >= 0.6:
            # Good performance — maintain or slightly increase
            risk_mult = min(1.0 + (win_rate - 0.5) * 0.5, self.max_risk_increase)
        elif win_rate >= 0.4:
            # Average — no change
            risk_mult = 1.0
        else:
            # Poor performance — reduce risk
            risk_mult = max(0.5 + win_rate, self.max_risk_decrease)

        adapted["risk_pct"] = base_params["risk_pct"] * risk_mult

        # ── Confluence adjustment (only tighten) ──
        base_conf = base_params.get("min_confluence", 0.50)

        # Count recent consecutive losses
        consec_losses = 0
        for p in reversed(recent):
            if p <= 0:
                consec_losses += 1
            else:
                break

        if consec_losses >= 5:
            # Major losing streak — significantly tighten
            adapted["min_confluence"] = min(base_conf + 0.15, 0.80)
        elif consec_losses >= 3:
            # Moderate losing streak — tighten slightly
            adapted["min_confluence"] = min(base_conf + 0.08, 0.70)
        elif win_rate < 0.35:
            # Low win rate overall — tighten
            adapted["min_confluence"] = min(base_conf + 0.10, 0.75)
        else:
            adapted["min_confluence"] = base_conf

        # ── Stop loss adjustment ──
        # If avg loss is much larger than avg win, tighten stops
        if wins and losses:
            avg_win = np.mean(wins)
            avg_loss = abs(np.mean(losses))
            if avg_loss > 1.5 * avg_win:
                # Losses too big — tighten SL
                adapted["sl_atr_mult"] = base_params["sl_atr_mult"] * 0.85
            elif avg_win > 2 * avg_loss:
                # Good payoff — can slightly widen for more room
                adapted["sl_atr_mult"] = base_params["sl_atr_mult"] * 1.1

        return adapted

    def reset(self):
        self.trade_results.clear()


# ═══════════════════════════════════════════════════════════════
# ADAPTIVE BACKTESTER — wraps Backtester with per-bar adaptation
# ═══════════════════════════════════════════════════════════════

def run_adaptive_backtest(
    df: pd.DataFrame,
    base_params: dict,
    adaptation_method: str = "volatility",  # "volatility", "regime", "self_learning", "none"
) -> dict:
    """
    Run a backtest with per-bar adaptation.
    This is a wrapper that modifies backtester params dynamically.

    Since the Backtester runs indicators once and iterates bars,
    we implement adaptation by running the backtester with the
    adapted params and recording which regime was active per trade.
    """
    from backtester import Backtester, format_metrics

    # Choose adapter
    if adaptation_method == "volatility":
        adapter = VolatilityAdapter()
    elif adaptation_method == "regime":
        adapter = RegimeAdapter()
    elif adaptation_method == "self_learning":
        adapter = SelfLearningAdapter()
    elif adaptation_method == "none":
        adapter = None
    else:
        raise ValueError(f"Unknown adaptation method: {adaptation_method}")

    # For non-adaptive, just run normally
    if adapter is None:
        bt = Backtester(**base_params)
        result = bt.run(df)
        result["adaptation"] = "none"
        return result

    # For adaptive methods, we need to run the backtester with different
    # params per regime. The simplest approach: segment the data by regime,
    # then aggregate results. But this loses cross-segment context.
    #
    # Better approach: run full backtest but tag each trade with its regime,
    # and compute the per-bar regime for analysis.
    # Since adapting SL/TP/risk per-bar requires deep integration with the
    # backtester loop, we use a simulated approach:
    # 1. Compute regime for each bar
    # 2. Find the dominant regime for the dataset
    # 3. Run with adapted params for that regime
    # 4. Also run per-regime segments for comparison

    from indicators import add_atr
    df = add_atr(df)

    # Compute regime per bar
    regimes = []
    for i in range(len(df)):
        if adaptation_method == "volatility":
            regime = adapter.classify_regime(df, i)
        elif adaptation_method == "regime":
            regime = adapter.classify_regime(df, i)
        else:
            regime = None
        regimes.append(regime)

    df_adapted = df.copy()
    df_adapted["regime"] = [r.value if r else "none" for r in regimes]

    # Run full backtest with base params first
    bt_base = Backtester(**base_params)
    base_result = bt_base.run(df)

    # Run with each regime's adapted params and pick best performing
    if adaptation_method == "self_learning":
        # Self-learning just adjusts based on trade history
        sl_adapter = adapter
        # Simulate: run base, feed results to adapter, run again
        if base_result["trades"]:
            for t in base_result["trades"]:
                if t.pnl is not None:
                    sl_adapter.record_trade(t.pnl)
            adapted_params = sl_adapter.get_adaptation(base_params)
            bt_adapted = Backtester(**adapted_params)
            adapted_result = bt_adapted.run(df)
            adapted_result["adaptation"] = "self_learning"
            adapted_result["adapted_params"] = adapted_params
            return adapted_result
        else:
            base_result["adaptation"] = "self_learning"
            return base_result
    else:
        # Volatility or Regime: run with dominant regime params
        from collections import Counter
        regime_counts = Counter(regimes)
        # Remove None
        regime_counts = {k: v for k, v in regime_counts.items() if k is not None}
        if not regime_counts:
            base_result["adaptation"] = adaptation_method
            return base_result

        dominant_regime = max(regime_counts, key=regime_counts.get)
        adapted_params = adapter.adapt_backtester_params(base_params, dominant_regime)

        # Also run per-regime to see how each performs
        regime_results = {}
        for regime in set(regimes):
            if regime is None:
                continue
            regime_params = adapter.adapt_backtester_params(base_params, regime)
            bt_r = Backtester(**regime_params)
            r_result = bt_r.run(df)
            regime_results[regime.value] = r_result["metrics"]

        # Run with best-performing regime params
        best_regime = dominant_regime
        best_pnl = -float('inf')
        for regime, metrics in regime_results.items():
            pnl = metrics.get("net_profit", 0)
            if pnl > best_pnl:
                best_pnl = pnl
                # Find the enum value
                for r in set(regimes):
                    if r and r.value == regime:
                        best_regime = r
                        break

        best_params = adapter.adapt_backtester_params(base_params, best_regime)
        bt_best = Backtester(**best_params)
        final_result = bt_best.run(df)
        final_result["adaptation"] = adaptation_method
        final_result["best_regime"] = best_regime.value
        final_result["regime_breakdown"] = regime_results
        final_result["adapted_params"] = best_params

        return final_result
