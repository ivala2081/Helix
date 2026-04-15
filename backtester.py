"""
Backtester Engine — Event-driven backtester with comprehensive metrics.
Supports multiple PA indicator systems, adaptation methods, and
walk-forward validation.
"""

import numpy as np
import pandas as pd
from collections import deque
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

from stake_manager import StakeManager, SizingMethod, Direction
from indicators import (
    MarketStructure, FairValueGap, SMCIndicators, ClassicPA,
    SignalAggregator, SignalType, Signal, add_atr,
)


# ═══════════════════════════════════════════════════════════════
# TRADE RECORD
# ═══════════════════════════════════════════════════════════════

@dataclass
class Trade:
    entry_bar: int
    entry_price: float
    entry_date: str
    direction: str          # "LONG" or "SHORT"
    size: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    take_profit_3: float
    risk_amount: float
    signal_score: float
    signal_reasons: list[str]
    exit_bar: Optional[int] = None
    exit_price: Optional[float] = None
    exit_date: Optional[str] = None
    exit_reason: Optional[str] = None
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None
    bars_held: Optional[int] = None
    max_favorable: float = 0.0      # max unrealized profit
    max_adverse: float = 0.0        # max unrealized loss (drawdown)
    partial_pnl: float = 0.0        # accumulated PnL from partial closes
    # Commission tracking
    entry_commission: float = 0.0   # total entry commission charged
    exit_commission: float = 0.0    # total exit commission charged
    total_commission: float = 0.0   # entry + exit
    # Hard stop / suppression tracking (Phase 2)
    hard_stop: Optional[float] = None
    max_adverse_during_suppression: float = 0.0  # % adverse move during SL suppression


# ═══════════════════════════════════════════════════════════════
# BACKTESTER
# ═══════════════════════════════════════════════════════════════

class Backtester:
    def __init__(
        self,
        initial_capital: float = 10_000.0,
        risk_pct: float = 0.02,
        sizing_method: SizingMethod = SizingMethod.FIXED_FRACTIONAL,
        # TP multipliers (ATR-based)
        tp1_atr_mult: float = 2.0,
        tp2_atr_mult: float = 4.0,
        tp3_atr_mult: float = 8.0,
        # TP close percentages
        tp1_close_pct: float = 0.40,
        tp2_close_pct: float = 0.30,
        tp3_close_pct: float = 0.30,
        # Stop loss (ATR-based)
        sl_atr_mult: float = 2.0,
        # Trailing stop
        use_trailing: bool = True,
        trailing_atr_mult: float = 2.5,
        trailing_activation_atr: float = 2.0,   # activate after price moves this many ATR in favor
        # Indicator systems to use
        use_market_structure: bool = True,
        use_fvg: bool = True,
        use_smc: bool = True,
        use_classic_pa: bool = True,
        # Signal thresholds
        min_confluence: float = 0.5,
        # Warm-up period
        warmup_bars: int = 50,
        # Commission
        commission_pct: float = 0.075,    # 0.075% per trade (Binance taker)
        slippage_pct: float = 0.0,        # slippage per fill (% of price, applied to market/stop fills)
        # ── Improvement params ──
        min_bars_before_sl: int = 0,      # suppress SL check for first N bars after entry
        be_after_tp1: bool = False,       # move SL to breakeven after TP1 hit
        be_buffer_atr: float = 0.1,       # buffer above/below breakeven (ATR fraction)
        min_signal_score: float = 0.0,    # minimum aggregated signal score to enter
        use_regime_filter: bool = False,  # skip ranging markets
        regime_lookback: int = 50,        # bars to look back for regime detection
        regime_min_er: float = 0.03,      # minimum Efficiency Ratio to allow entry
        # ── V3 Improvement params ──
        trail_after_tp2: bool = False,       # B: activate trailing after TP2 hit
        trail_after_tp2_atr: float = 2.0,    # B: trailing distance (ATR mult)
        use_vol_filter: bool = False,        # C: skip high-volatility entries
        vol_filter_percentile: float = 80.0, # C: ATR percentile cutoff
        vol_filter_lookback: int = 100,      # C: lookback for percentile calc
        use_tiered_sizing: bool = False,     # D: scale risk% by signal score
        tier_thresholds: list = None,        # D: score breakpoints [0.60, 0.70, 0.80]
        tier_risks: list = None,             # D: risk% per tier [0.015, 0.02, 0.025]
        use_edge_monitor: bool = False,      # E: reduce/skip on edge decay
        edge_window: int = 30,               # E: rolling trade window
        edge_reduce_threshold: float = 15.0, # E: reduce risk below this $/trade
        edge_skip_threshold: float = 5.0,    # E: skip trades below this $/trade
        edge_reduced_risk: float = 0.01,     # E: risk% when edge is weak
        # ── Position sizing cap ──
        max_position_pct: float = 0.50,      # max position as % of equity (0.50 = 50%)
        # ── Hard stop (catastrophic protection during SL suppression) ──
        use_hard_stop: bool = False,         # enable hard stop during suppression
        hard_stop_atr_mult: float = 15.0,    # 15x ATR catastrophic stop (black swan only)
    ):
        self.initial_capital = initial_capital
        self.risk_pct = risk_pct
        self.sizing_method = sizing_method
        self.tp1_atr_mult = tp1_atr_mult
        self.tp2_atr_mult = tp2_atr_mult
        self.tp3_atr_mult = tp3_atr_mult
        self.tp1_close_pct = tp1_close_pct
        self.tp2_close_pct = tp2_close_pct
        self.tp3_close_pct = tp3_close_pct
        self.sl_atr_mult = sl_atr_mult
        self.use_trailing = use_trailing
        self.trailing_atr_mult = trailing_atr_mult
        self.trailing_activation_atr = trailing_activation_atr
        self.use_market_structure = use_market_structure
        self.use_fvg = use_fvg
        self.use_smc = use_smc
        self.use_classic_pa = use_classic_pa
        self.min_confluence = min_confluence
        self.warmup_bars = warmup_bars
        self.commission_pct = commission_pct
        self.slippage_pct = slippage_pct
        # Improvements
        self.min_bars_before_sl = min_bars_before_sl
        self.be_after_tp1 = be_after_tp1
        self.be_buffer_atr = be_buffer_atr
        self.min_signal_score = min_signal_score
        self.use_regime_filter = use_regime_filter
        self.regime_lookback = regime_lookback
        self.regime_min_er = regime_min_er
        # V3 Improvements
        self.trail_after_tp2 = trail_after_tp2
        self.trail_after_tp2_atr = trail_after_tp2_atr
        self.use_vol_filter = use_vol_filter
        self.vol_filter_percentile = vol_filter_percentile
        self.vol_filter_lookback = vol_filter_lookback
        self.use_tiered_sizing = use_tiered_sizing
        self.tier_thresholds = tier_thresholds or [0.60, 0.70, 0.80]
        self.tier_risks = tier_risks or [0.015, 0.02, 0.025]
        self.use_edge_monitor = use_edge_monitor
        self.edge_window = edge_window
        self.edge_reduce_threshold = edge_reduce_threshold
        self.edge_skip_threshold = edge_skip_threshold
        self.edge_reduced_risk = edge_reduced_risk
        # Position sizing cap
        self.max_position_pct = max_position_pct
        # Hard stop
        self.use_hard_stop = use_hard_stop
        self.hard_stop_atr_mult = hard_stop_atr_mult

        # Indicator instances
        self.ms = MarketStructure(swing_lookback=5) if use_market_structure else None
        self.fvg = FairValueGap(max_age_bars=100) if use_fvg else None
        self.smc = SMCIndicators(swing_lookback=5) if use_smc else None
        self.pa = ClassicPA() if use_classic_pa else None

        # Weights for signal aggregation
        ms_w = 1.0 if use_market_structure else 0.0
        fvg_w = 1.0 if use_fvg else 0.0
        smc_w = 1.0 if use_smc else 0.0
        pa_w = 1.0 if use_classic_pa else 0.0
        self.aggregator = SignalAggregator(
            ms_weight=ms_w, fvg_weight=fvg_w,
            smc_weight=smc_w, pa_weight=pa_w,
            min_confluence=min_confluence,
        )

    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Run all indicator calculations on the data."""
        df = add_atr(df)
        if self.ms:
            df = self.ms.calculate(df)
        if self.fvg:
            df = self.fvg.calculate(df)
        if self.smc:
            df = self.smc.calculate(df)
        if self.pa:
            df = self.pa.calculate(df)
        # Efficiency Ratio for regime filter
        if self.use_regime_filter:
            lb = self.regime_lookback
            closes = df["close"].values
            er = np.full(len(closes), 0.0)
            for i in range(lb, len(closes)):
                direction = abs(closes[i] - closes[i - lb])
                volatility = np.sum(np.abs(np.diff(closes[i - lb:i + 1])))
                er[i] = direction / volatility if volatility > 0 else 0
            df["efficiency_ratio"] = er
        # Volatility percentile for vol filter
        if self.use_vol_filter:
            lb = self.vol_filter_lookback
            atr_vals = df["atr_14"].values
            vol_pctile = np.full(len(atr_vals), 50.0)
            for i in range(lb, len(atr_vals)):
                window = atr_vals[i - lb:i]
                valid = window[~np.isnan(window)]
                if len(valid) > 0:
                    vol_pctile[i] = (np.sum(valid < atr_vals[i]) / len(valid)) * 100
            df["atr_percentile"] = vol_pctile
        return df

    def run(self, df: pd.DataFrame) -> dict:
        """
        Run backtest on prepared data.

        Returns dict with:
            trades: list of Trade objects
            equity_curve: list of equity values per bar
            metrics: comprehensive performance metrics
        """
        df = self.prepare_data(df)
        n = len(df)

        sm = StakeManager(
            initial_capital=self.initial_capital,
            risk_pct=self.risk_pct,
            method=self.sizing_method,
            max_position_pct=self.max_position_pct,
        )

        trades: list[Trade] = []
        closed_trades: list[Trade] = []
        open_trade: Optional[Trade] = None
        equity_curve = []
        position_id = None

        # Track partial closes
        remaining_size = 0.0
        tp1_hit = False
        tp2_hit = False
        trailing_stop = None
        trailing_active = False

        # V3: Edge monitor state
        edge_pnl_buffer = deque(maxlen=self.edge_window) if self.use_edge_monitor else None
        edge_skip_active = False
        edge_reduced_active = False

        for i in range(n):
            equity = sm.get_equity()
            equity_curve.append(equity)

            if i < self.warmup_bars:
                continue

            atr = df["atr_14"].iloc[i] if not pd.isna(df.get("atr_14", pd.Series([np.nan])).iloc[min(i, len(df)-1)]) else None
            if atr is None or pd.isna(atr) or atr <= 0:
                continue

            # ── MANAGE OPEN POSITION ──
            if open_trade is not None:
                high = df["high"].iloc[i]
                low = df["low"].iloc[i]
                close = df["close"].iloc[i]

                # Track max favorable / adverse excursion
                if open_trade.direction == "LONG":
                    unrealized = (high - open_trade.entry_price) * remaining_size
                    adverse = (open_trade.entry_price - low) * remaining_size
                    open_trade.max_favorable = max(open_trade.max_favorable, unrealized)
                    open_trade.max_adverse = max(open_trade.max_adverse, adverse)
                else:
                    unrealized = (open_trade.entry_price - low) * remaining_size
                    adverse = (high - open_trade.entry_price) * remaining_size
                    open_trade.max_favorable = max(open_trade.max_favorable, unrealized)
                    open_trade.max_adverse = max(open_trade.max_adverse, adverse)

                # ── Stop Loss Check ──
                bars_in_trade = i - open_trade.entry_bar
                stopped_out = False

                # Suppress SL during initial holding period
                if bars_in_trade >= self.min_bars_before_sl:
                    if open_trade.direction == "LONG":
                        effective_sl = trailing_stop if trailing_active and trailing_stop else open_trade.stop_loss
                        if low <= effective_sl:
                            exit_price = effective_sl
                            reason = "Trailing Stop" if trailing_active else "Stop Loss"
                            stopped_out = True
                    elif open_trade.direction == "SHORT":
                        effective_sl = trailing_stop if trailing_active and trailing_stop else open_trade.stop_loss
                        if high >= effective_sl:
                            exit_price = effective_sl
                            reason = "Trailing Stop" if trailing_active else "Stop Loss"
                            stopped_out = True
                else:
                    # During SL suppression: track adverse excursion + check hard stop
                    if open_trade.direction == "LONG":
                        adverse_pct = (open_trade.entry_price - low) / open_trade.entry_price * 100
                    else:
                        adverse_pct = (high - open_trade.entry_price) / open_trade.entry_price * 100
                    open_trade.max_adverse_during_suppression = max(
                        open_trade.max_adverse_during_suppression, adverse_pct)

                    # Hard stop: catastrophic protection during suppression
                    if self.use_hard_stop and open_trade.hard_stop is not None:
                        if open_trade.direction == "LONG" and low <= open_trade.hard_stop:
                            exit_price = open_trade.hard_stop
                            reason = "Hard Stop"
                            stopped_out = True
                        elif open_trade.direction == "SHORT" and high >= open_trade.hard_stop:
                            exit_price = open_trade.hard_stop
                            reason = "Hard Stop"
                            stopped_out = True

                if stopped_out:
                    self._close_trade(open_trade, i, exit_price, reason, remaining_size, df, sm, position_id)
                    closed_trades.append(open_trade)
                    # V3E: Edge monitor update
                    if edge_pnl_buffer is not None and open_trade.pnl is not None:
                        edge_pnl_buffer.append(open_trade.pnl)
                        if len(edge_pnl_buffer) >= self.edge_window:
                            avg_exp = sum(edge_pnl_buffer) / len(edge_pnl_buffer)
                            edge_skip_active = avg_exp < self.edge_skip_threshold
                            edge_reduced_active = avg_exp < self.edge_reduce_threshold
                    open_trade = None
                    position_id = None
                    remaining_size = 0
                    tp1_hit = tp2_hit = False
                    trailing_stop = None
                    trailing_active = False
                    continue

                # ── Take Profit Checks (progressive) ──
                if open_trade.direction == "LONG":
                    # TP1
                    if not tp1_hit and high >= open_trade.take_profit_1:
                        close_size = open_trade.size * self.tp1_close_pct
                        self._partial_close(sm, position_id, open_trade, close_size, open_trade.take_profit_1)
                        remaining_size -= close_size
                        tp1_hit = True
                        # Move SL to breakeven after TP1
                        if self.be_after_tp1:
                            be_price = open_trade.entry_price + self.be_buffer_atr * atr
                            open_trade.stop_loss = be_price

                    # TP2
                    if tp1_hit and not tp2_hit and high >= open_trade.take_profit_2:
                        close_size = open_trade.size * self.tp2_close_pct
                        self._partial_close(sm, position_id, open_trade, close_size, open_trade.take_profit_2)
                        remaining_size -= close_size
                        tp2_hit = True
                        # V3B: Activate trailing after TP2
                        if self.trail_after_tp2:
                            trailing_active = True
                            trailing_stop = high - atr * self.trail_after_tp2_atr

                    # TP3 — full close (skip if trail_after_tp2 — let trailing ride)
                    if tp2_hit and not self.trail_after_tp2 and high >= open_trade.take_profit_3:
                        self._close_trade(open_trade, i, open_trade.take_profit_3, "TP3", remaining_size, df, sm, position_id)
                        closed_trades.append(open_trade)
                        # V3E: Edge monitor update
                        if edge_pnl_buffer is not None and open_trade.pnl is not None:
                            edge_pnl_buffer.append(open_trade.pnl)
                            if len(edge_pnl_buffer) >= self.edge_window:
                                avg_exp = sum(edge_pnl_buffer) / len(edge_pnl_buffer)
                                edge_skip_active = avg_exp < self.edge_skip_threshold
                                edge_reduced_active = avg_exp < self.edge_reduce_threshold
                        open_trade = None
                        position_id = None
                        remaining_size = 0
                        tp1_hit = tp2_hit = False
                        trailing_stop = None
                        trailing_active = False
                        continue

                    # Trailing stop update
                    if (self.use_trailing and tp1_hit) or (self.trail_after_tp2 and tp2_hit):
                        trail_mult = self.trail_after_tp2_atr if (self.trail_after_tp2 and tp2_hit) else self.trailing_atr_mult
                        trail_dist = atr * trail_mult
                        if not trailing_active:
                            if high - open_trade.entry_price >= atr * self.trailing_activation_atr:
                                trailing_active = True
                        if trailing_active:
                            new_trail = high - trail_dist
                            if trailing_stop is None or new_trail > trailing_stop:
                                trailing_stop = new_trail

                elif open_trade.direction == "SHORT":
                    if not tp1_hit and low <= open_trade.take_profit_1:
                        close_size = open_trade.size * self.tp1_close_pct
                        self._partial_close(sm, position_id, open_trade, close_size, open_trade.take_profit_1)
                        remaining_size -= close_size
                        tp1_hit = True
                        # Move SL to breakeven after TP1
                        if self.be_after_tp1:
                            be_price = open_trade.entry_price - self.be_buffer_atr * atr
                            open_trade.stop_loss = be_price

                    if tp1_hit and not tp2_hit and low <= open_trade.take_profit_2:
                        close_size = open_trade.size * self.tp2_close_pct
                        self._partial_close(sm, position_id, open_trade, close_size, open_trade.take_profit_2)
                        remaining_size -= close_size
                        tp2_hit = True
                        # V3B: Activate trailing after TP2
                        if self.trail_after_tp2:
                            trailing_active = True
                            trailing_stop = low + atr * self.trail_after_tp2_atr

                    # TP3 — full close (skip if trail_after_tp2)
                    if tp2_hit and not self.trail_after_tp2 and low <= open_trade.take_profit_3:
                        self._close_trade(open_trade, i, open_trade.take_profit_3, "TP3", remaining_size, df, sm, position_id)
                        closed_trades.append(open_trade)
                        # V3E: Edge monitor update
                        if edge_pnl_buffer is not None and open_trade.pnl is not None:
                            edge_pnl_buffer.append(open_trade.pnl)
                            if len(edge_pnl_buffer) >= self.edge_window:
                                avg_exp = sum(edge_pnl_buffer) / len(edge_pnl_buffer)
                                edge_skip_active = avg_exp < self.edge_skip_threshold
                                edge_reduced_active = avg_exp < self.edge_reduce_threshold
                        open_trade = None
                        position_id = None
                        remaining_size = 0
                        tp1_hit = tp2_hit = False
                        trailing_stop = None
                        trailing_active = False
                        continue

                    if (self.use_trailing and tp1_hit) or (self.trail_after_tp2 and tp2_hit):
                        trail_mult = self.trail_after_tp2_atr if (self.trail_after_tp2 and tp2_hit) else self.trailing_atr_mult
                        trail_dist = atr * trail_mult
                        if not trailing_active:
                            if open_trade.entry_price - low >= atr * self.trailing_activation_atr:
                                trailing_active = True
                        if trailing_active:
                            new_trail = low + trail_dist
                            if trailing_stop is None or new_trail < trailing_stop:
                                trailing_stop = new_trail

                continue  # Don't open new trades while one is open

            # ── GENERATE SIGNALS ──
            all_signals = []
            if self.ms:
                all_signals.extend(self.ms.get_signals(df, i))
            if self.fvg:
                all_signals.extend(self.fvg.get_signals(df, i))
            if self.smc:
                all_signals.extend(self.smc.get_signals(df, i))
            if self.pa:
                all_signals.extend(self.pa.get_signals(df, i))

            if not all_signals:
                continue

            decision = self.aggregator.aggregate(all_signals)

            if decision["action"] == SignalType.NONE:
                continue

            # Signal score filter
            if decision["score"] < self.min_signal_score:
                continue

            # Regime filter: skip ranging markets
            if self.use_regime_filter:
                er = df["efficiency_ratio"].iloc[i]
                if er < self.regime_min_er:
                    continue

            # V3C: Volatility filter — skip high-ATR entries
            if self.use_vol_filter:
                atr_pctile = df["atr_percentile"].iloc[i]
                if atr_pctile > self.vol_filter_percentile:
                    continue

            # V3E: Edge decay monitor — skip trades when edge is gone
            if self.use_edge_monitor and edge_skip_active:
                continue

            # ── OPEN NEW TRADE ──
            # Signal at bar i close → fill at bar i+1 open (no look-ahead)
            if i + 1 >= n:
                continue  # Can't fill — no next bar
            entry_price = df["open"].iloc[i + 1]
            direction = Direction.LONG if decision["action"] == SignalType.LONG else Direction.SHORT

            # Apply slippage to entry (market fill — adverse direction)
            if self.slippage_pct > 0:
                slip = entry_price * self.slippage_pct / 100
                entry_price += slip if direction == Direction.LONG else -slip

            # Use signal's stop loss or calculate from ATR
            signal_sl = decision.get("stop_loss", None)
            if direction == Direction.LONG:
                atr_sl = entry_price - self.sl_atr_mult * atr
                stop_loss = max(signal_sl, atr_sl) if signal_sl else atr_sl
                tp1 = entry_price + self.tp1_atr_mult * atr
                tp2 = entry_price + self.tp2_atr_mult * atr
                tp3 = entry_price + self.tp3_atr_mult * atr
            else:
                atr_sl = entry_price + self.sl_atr_mult * atr
                stop_loss = min(signal_sl, atr_sl) if signal_sl else atr_sl
                tp1 = entry_price - self.tp1_atr_mult * atr
                tp2 = entry_price - self.tp2_atr_mult * atr
                tp3 = entry_price - self.tp3_atr_mult * atr

            # Position sizing (V3D: tiered, V3E: edge-adjusted)
            risk_override = None
            if self.use_tiered_sizing or (self.use_edge_monitor and edge_reduced_active):
                effective_risk = self.risk_pct
                if self.use_tiered_sizing:
                    score = decision["score"]
                    for thresh, risk in zip(reversed(self.tier_thresholds), reversed(self.tier_risks)):
                        if score >= thresh:
                            effective_risk = risk
                            break
                if self.use_edge_monitor and edge_reduced_active and not edge_skip_active:
                    effective_risk = self.edge_reduced_risk
                risk_override = effective_risk
            sizing = sm.calculate_position_size(entry_price, stop_loss, direction, risk_pct_override=risk_override)
            if sizing["size"] <= 0:
                continue

            size = sizing["size"]
            position_id = sm.open_position(entry_price, stop_loss, size, direction)
            remaining_size = size
            tp1_hit = False
            tp2_hit = False
            trailing_stop = None
            trailing_active = False

            date_str = str(df["date"].iloc[i + 1]) if "date" in df.columns else str(i + 1)

            # Calculate hard stop (catastrophic protection during SL suppression)
            hard_stop_price = None
            if self.use_hard_stop:
                if direction == Direction.LONG:
                    hard_stop_price = entry_price - self.hard_stop_atr_mult * atr
                else:
                    hard_stop_price = entry_price + self.hard_stop_atr_mult * atr

            open_trade = Trade(
                entry_bar=i + 1,
                entry_price=entry_price,
                entry_date=date_str,
                direction="LONG" if direction == Direction.LONG else "SHORT",
                size=size,
                stop_loss=stop_loss,
                take_profit_1=tp1,
                take_profit_2=tp2,
                take_profit_3=tp3,
                risk_amount=sizing["risk_amount"],
                signal_score=decision["score"],
                signal_reasons=decision.get("reasons", []),
                hard_stop=hard_stop_price,
            )

        # Close any remaining open trade at last bar
        if open_trade is not None:
            last_close = df["close"].iloc[-1]
            self._close_trade(open_trade, n - 1, last_close, "End of data", remaining_size, df, sm, position_id)
            closed_trades.append(open_trade)
            if edge_pnl_buffer is not None and open_trade.pnl is not None:
                edge_pnl_buffer.append(open_trade.pnl)

        # Update final equity to reflect all closed trades
        equity_curve[-1] = sm.get_equity()

        # Pad equity curve to full length (shouldn't be needed but safety)
        while len(equity_curve) < n:
            equity_curve.append(sm.get_equity())

        metrics = self._compute_metrics(closed_trades, equity_curve, df)
        return {
            "trades": closed_trades,
            "equity_curve": equity_curve,
            "metrics": metrics,
            "stake_stats": sm.get_stats(),
        }

    def _partial_close(self, sm, position_id, trade, close_size, price):
        """Record partial close PnL without closing the position in SM."""
        if trade.direction == "LONG":
            pnl = (price - trade.entry_price) * close_size
        else:
            pnl = (trade.entry_price - price) * close_size
        # Proportional entry + exit commission for this partial slice
        exit_comm = price * close_size * self.commission_pct / 100
        entry_comm = trade.entry_price * close_size * self.commission_pct / 100
        total_comm = exit_comm + entry_comm
        pnl -= total_comm
        # Track commissions
        trade.entry_commission += entry_comm
        trade.exit_commission += exit_comm
        trade.total_commission += total_comm
        sm.realized_pnl += pnl
        trade.partial_pnl += pnl

    def _close_trade(self, trade, bar_idx, exit_price, reason, remaining_size, df, sm, position_id):
        """Finalize and close a trade. Combines partial + final close PnL."""
        # Apply slippage on stop-loss and end-of-data exits (market/stop fills)
        if self.slippage_pct > 0 and reason in ("Stop Loss", "Trailing Stop", "Hard Stop", "End of data"):
            slip = exit_price * self.slippage_pct / 100
            exit_price += -slip if trade.direction == "LONG" else slip

        if trade.direction == "LONG":
            final_pnl = (exit_price - trade.entry_price) * remaining_size
        else:
            final_pnl = (trade.entry_price - exit_price) * remaining_size

        # Commission on remaining size (proportional entry + exit)
        exit_commission = exit_price * remaining_size * self.commission_pct / 100
        entry_commission = trade.entry_price * remaining_size * self.commission_pct / 100
        final_pnl -= exit_commission + entry_commission
        # Track commissions
        trade.entry_commission += entry_commission
        trade.exit_commission += exit_commission
        trade.total_commission += exit_commission + entry_commission

        # Close position in stake manager
        if position_id and position_id in sm.open_positions:
            sm.open_positions.pop(position_id)
        sm.realized_pnl += final_pnl

        # Total PnL = partial closes + final close
        total_pnl = trade.partial_pnl + final_pnl

        date_str = str(df["date"].iloc[bar_idx]) if "date" in df.columns else str(bar_idx)
        trade.exit_bar = bar_idx
        trade.exit_price = exit_price
        trade.exit_date = date_str
        trade.exit_reason = reason
        trade.pnl = total_pnl
        # pnl_pct = position return % (pnl / notional). Matches exchange trade
        # log convention; the old formula (pnl / risk × 100) produced R-multiple-
        # style values under a misleading "%" label.
        notional = trade.entry_price * trade.size
        trade.pnl_pct = total_pnl / notional * 100 if notional > 0 else 0
        trade.bars_held = bar_idx - trade.entry_bar

    # ═══════════════════════════════════════════════════════════
    # COMPREHENSIVE METRICS
    # ═══════════════════════════════════════════════════════════

    def _compute_metrics(self, trades: list[Trade], equity_curve: list, df: pd.DataFrame) -> dict:
        """Compute comprehensive backtest performance metrics."""
        if not trades:
            return {"total_trades": 0, "net_profit": 0, "note": "No trades generated"}

        equity = np.array(equity_curve)
        pnls = [t.pnl for t in trades if t.pnl is not None]
        wins = [t for t in trades if t.pnl and t.pnl > 0]
        losses = [t for t in trades if t.pnl and t.pnl <= 0]

        # ── Basic Stats ──
        total_trades = len(trades)
        win_count = len(wins)
        loss_count = len(losses)
        win_rate = win_count / total_trades if total_trades > 0 else 0

        gross_profit = sum(t.pnl for t in wins) if wins else 0
        gross_loss = abs(sum(t.pnl for t in losses)) if losses else 0
        net_profit = sum(pnls)
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

        avg_win = gross_profit / win_count if win_count > 0 else 0
        avg_loss = gross_loss / loss_count if loss_count > 0 else 0
        payoff_ratio = avg_win / avg_loss if avg_loss > 0 else float('inf')
        expectancy = (win_rate * avg_win) - ((1 - win_rate) * avg_loss)

        # ── Return Metrics ──
        total_return_pct = (equity[-1] - self.initial_capital) / self.initial_capital * 100

        # Annualized return (approximate)
        n_bars = len(equity_curve)
        if "date" in df.columns and len(df) > 1:
            date_range = (df["date"].iloc[-1] - df["date"].iloc[0])
            if hasattr(date_range, 'total_seconds'):
                years = date_range.total_seconds() / (365.25 * 24 * 3600)
            else:
                years = n_bars / (365 * 6)  # rough estimate for 4h bars
        else:
            years = n_bars / (365 * 6)
        years = max(years, 0.01)

        annualized_return = ((equity[-1] / self.initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0

        # ── Drawdown Analysis ──
        running_max = np.maximum.accumulate(equity)
        drawdowns = (equity - running_max) / running_max * 100
        max_drawdown_pct = abs(drawdowns.min())

        # Drawdown duration
        in_drawdown = equity < running_max
        dd_durations = []
        current_dd = 0
        for is_dd in in_drawdown:
            if is_dd:
                current_dd += 1
            else:
                if current_dd > 0:
                    dd_durations.append(current_dd)
                current_dd = 0
        if current_dd > 0:
            dd_durations.append(current_dd)
        max_dd_duration = max(dd_durations) if dd_durations else 0
        avg_dd_duration = np.mean(dd_durations) if dd_durations else 0

        # ── Risk-Adjusted Returns ──
        returns = np.diff(equity) / equity[:-1]
        returns = returns[~np.isnan(returns)]

        # Sharpe Ratio (annualized, assuming ~2190 4h bars/year)
        if "date" in df.columns:
            # Determine bars per year based on data frequency
            if len(df) > 1:
                avg_gap = (df["date"].iloc[-1] - df["date"].iloc[0]).total_seconds() / len(df)
                bars_per_year = 365.25 * 24 * 3600 / avg_gap
            else:
                bars_per_year = 2190
        else:
            bars_per_year = 2190

        if len(returns) > 0 and returns.std() > 0:
            sharpe = (returns.mean() / returns.std()) * np.sqrt(bars_per_year)
        else:
            sharpe = 0

        # Sortino Ratio (only downside deviation)
        downside_returns = returns[returns < 0]
        if len(downside_returns) > 0 and downside_returns.std() > 0:
            sortino = (returns.mean() / downside_returns.std()) * np.sqrt(bars_per_year)
        else:
            sortino = 0

        # Calmar Ratio
        calmar = annualized_return / max_drawdown_pct if max_drawdown_pct > 0 else 0

        # ── Trade Analysis ──
        long_trades = [t for t in trades if t.direction == "LONG"]
        short_trades = [t for t in trades if t.direction == "SHORT"]
        long_wins = [t for t in long_trades if t.pnl and t.pnl > 0]
        short_wins = [t for t in short_trades if t.pnl and t.pnl > 0]

        bars_held = [t.bars_held for t in trades if t.bars_held is not None]
        avg_bars_held = np.mean(bars_held) if bars_held else 0

        # Consecutive wins/losses
        max_consec_wins = 0
        max_consec_losses = 0
        current_wins = 0
        current_losses = 0
        for t in trades:
            if t.pnl and t.pnl > 0:
                current_wins += 1
                current_losses = 0
                max_consec_wins = max(max_consec_wins, current_wins)
            else:
                current_losses += 1
                current_wins = 0
                max_consec_losses = max(max_consec_losses, current_losses)

        # Exit reason breakdown
        exit_reasons = {}
        for t in trades:
            r = t.exit_reason or "Unknown"
            exit_reasons[r] = exit_reasons.get(r, 0) + 1

        # R-multiple analysis (PnL / risk)
        r_multiples = [t.pnl / t.risk_amount for t in trades if t.risk_amount > 0 and t.pnl is not None]
        avg_r = np.mean(r_multiples) if r_multiples else 0
        max_r = max(r_multiples) if r_multiples else 0
        min_r = min(r_multiples) if r_multiples else 0

        # Commission tracking
        total_commission = sum(t.total_commission for t in trades)
        total_entry_commission = sum(t.entry_commission for t in trades)
        total_exit_commission = sum(t.exit_commission for t in trades)
        avg_commission_per_trade = total_commission / total_trades if total_trades > 0 else 0
        commission_pct_of_gross = (total_commission / gross_profit * 100) if gross_profit > 0 else 0

        # Trade-level Sortino (more meaningful than bar-level for trading systems)
        trade_sortino = 0
        if r_multiples:
            tr_arr = np.array(r_multiples)
            trade_downside = tr_arr[tr_arr < 0]
            if len(trade_downside) > 0 and trade_downside.std() > 0:
                trades_per_year = total_trades / years if years > 0 else total_trades
                trade_sortino = (tr_arr.mean() / trade_downside.std()) * np.sqrt(trades_per_year)

        return {
            # Basic
            "total_trades": total_trades,
            "win_count": win_count,
            "loss_count": loss_count,
            "win_rate": win_rate,
            "long_trades": len(long_trades),
            "short_trades": len(short_trades),
            "long_win_rate": len(long_wins) / len(long_trades) if long_trades else 0,
            "short_win_rate": len(short_wins) / len(short_trades) if short_trades else 0,

            # PnL
            "net_profit": net_profit,
            "gross_profit": gross_profit,
            "gross_loss": gross_loss,
            "profit_factor": profit_factor,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "payoff_ratio": payoff_ratio,
            "expectancy": expectancy,
            "largest_win": max(t.pnl for t in trades if t.pnl) if trades else 0,
            "largest_loss": min(t.pnl for t in trades if t.pnl) if trades else 0,

            # Returns
            "total_return_pct": total_return_pct,
            "annualized_return_pct": annualized_return,
            "final_equity": equity[-1],

            # Risk
            "max_drawdown_pct": max_drawdown_pct,
            "max_dd_duration_bars": max_dd_duration,
            "avg_dd_duration_bars": avg_dd_duration,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "calmar_ratio": calmar,

            # Trade quality
            "avg_bars_held": avg_bars_held,
            "max_consec_wins": max_consec_wins,
            "max_consec_losses": max_consec_losses,
            "avg_r_multiple": avg_r,
            "max_r_multiple": max_r,
            "min_r_multiple": min_r,

            # Exit analysis
            "exit_reasons": exit_reasons,

            # Commission
            "total_commission": total_commission,
            "total_entry_commission": total_entry_commission,
            "total_exit_commission": total_exit_commission,
            "avg_commission_per_trade": avg_commission_per_trade,
            "commission_pct_of_gross": commission_pct_of_gross,

            # Trade-level Sortino
            "sortino_ratio_trade": trade_sortino,
        }


# ═══════════════════════════════════════════════════════════════
# WALK-FORWARD VALIDATION
# ═══════════════════════════════════════════════════════════════

def walk_forward_test(
    df: pd.DataFrame,
    backtester_kwargs: dict,
    n_folds: int = 5,
    train_pct: float = 0.6,
) -> dict:
    """
    Walk-forward validation: train on 60%, test on 40% for each fold.
    Folds are rolling windows that move through the data.

    Returns dict with per-fold results and aggregate stats.
    """
    n = len(df)
    fold_size = n // n_folds
    results = []

    for fold in range(n_folds):
        fold_start = fold * fold_size
        fold_end = min(fold_start + fold_size + int(fold_size * 0.5), n)  # overlap for context

        fold_data = df.iloc[fold_start:fold_end].reset_index(drop=True)
        split_idx = int(len(fold_data) * train_pct)

        train_data = fold_data.iloc[:split_idx]
        test_data = fold_data  # Full data, but only count trades after split point

        # Run on full fold data (for warm-up), but measure on test portion
        bt = Backtester(**backtester_kwargs)
        full_result = bt.run(fold_data)

        # Separate train vs test trades
        train_trades = [t for t in full_result["trades"] if t.entry_bar < split_idx]
        test_trades = [t for t in full_result["trades"] if t.entry_bar >= split_idx]

        train_pnl = sum(t.pnl for t in train_trades if t.pnl) if train_trades else 0
        test_pnl = sum(t.pnl for t in test_trades if t.pnl) if test_trades else 0

        results.append({
            "fold": fold + 1,
            "train_bars": split_idx,
            "test_bars": len(fold_data) - split_idx,
            "train_trades": len(train_trades),
            "test_trades": len(test_trades),
            "train_pnl": train_pnl,
            "test_pnl": test_pnl,
            "train_return_pct": train_pnl / backtester_kwargs.get("initial_capital", 10000) * 100,
            "test_return_pct": test_pnl / backtester_kwargs.get("initial_capital", 10000) * 100,
            "test_profitable": test_pnl > 0,
            "full_metrics": full_result["metrics"],
        })

    # Aggregate
    passing_folds = sum(1 for r in results if r["test_profitable"])
    total_test_pnl = sum(r["test_pnl"] for r in results)

    return {
        "folds": results,
        "passing_folds": passing_folds,
        "total_folds": n_folds,
        "pass_rate": passing_folds / n_folds,
        "total_test_pnl": total_test_pnl,
        "avg_test_return_pct": np.mean([r["test_return_pct"] for r in results]),
    }


# ═══════════════════════════════════════════════════════════════
# REPORT FORMATTER
# ═══════════════════════════════════════════════════════════════

def format_metrics(metrics: dict, title: str = "Backtest Results") -> str:
    """Format metrics as a readable report."""
    if metrics.get("total_trades", 0) == 0:
        return f"\n{title}\n{'='*50}\nNo trades generated.\n"

    lines = [
        f"\n{'='*60}",
        f"  {title}",
        f"{'='*60}",
        f"",
        f"  TRADE SUMMARY",
        f"  {'Total Trades:':<30} {metrics['total_trades']}",
        f"  {'Win Rate:':<30} {metrics['win_rate']*100:.1f}%",
        f"  {'Long / Short:':<30} {metrics['long_trades']} / {metrics['short_trades']}",
        f"  {'Long Win Rate:':<30} {metrics['long_win_rate']*100:.1f}%",
        f"  {'Short Win Rate:':<30} {metrics['short_win_rate']*100:.1f}%",
        f"  {'Avg Bars Held:':<30} {metrics['avg_bars_held']:.0f}",
        f"",
        f"  PROFITABILITY",
        f"  {'Net Profit:':<30} ${metrics['net_profit']:,.2f}",
        f"  {'Total Return:':<30} {metrics['total_return_pct']:.2f}%",
        f"  {'Annualized Return:':<30} {metrics['annualized_return_pct']:.2f}%",
        f"  {'Profit Factor:':<30} {metrics['profit_factor']:.2f}",
        f"  {'Payoff Ratio:':<30} {metrics['payoff_ratio']:.2f}",
        f"  {'Expectancy:':<30} ${metrics['expectancy']:.2f}",
        f"  {'Avg Win:':<30} ${metrics['avg_win']:.2f}",
        f"  {'Avg Loss:':<30} ${metrics['avg_loss']:.2f}",
        f"  {'Largest Win:':<30} ${metrics['largest_win']:.2f}",
        f"  {'Largest Loss:':<30} ${metrics['largest_loss']:.2f}",
        f"",
        f"  RISK METRICS",
        f"  {'Max Drawdown:':<30} {metrics['max_drawdown_pct']:.2f}%",
        f"  {'Max DD Duration:':<30} {metrics['max_dd_duration_bars']} bars",
        f"  {'Sharpe Ratio:':<30} {metrics['sharpe_ratio']:.2f}",
        f"  {'Sortino Ratio:':<30} {metrics['sortino_ratio']:.2f}",
        f"  {'Calmar Ratio:':<30} {metrics['calmar_ratio']:.2f}",
        f"",
        f"  R-MULTIPLE ANALYSIS",
        f"  {'Avg R:':<30} {metrics['avg_r_multiple']:.2f}R",
        f"  {'Best R:':<30} {metrics['max_r_multiple']:.2f}R",
        f"  {'Worst R:':<30} {metrics['min_r_multiple']:.2f}R",
        f"",
        f"  STREAKS",
        f"  {'Max Consec Wins:':<30} {metrics['max_consec_wins']}",
        f"  {'Max Consec Losses:':<30} {metrics['max_consec_losses']}",
        f"",
        f"  EXIT REASONS",
    ]

    for reason, count in sorted(metrics["exit_reasons"].items(), key=lambda x: -x[1]):
        pct = count / metrics["total_trades"] * 100
        lines.append(f"  {reason:<30} {count} ({pct:.0f}%)")

    lines.append(f"\n  {'Final Equity:':<30} ${metrics['final_equity']:,.2f}")

    return "\n".join(lines)
