"""
Stake Management Module — Position Sizing Engine
Supports Fixed Fractional and Kelly Criterion methods.
Designed for backtesting with clean interfaces for live trading later.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import uuid


class SizingMethod(Enum):
    FIXED_FRACTIONAL = "fixed_fractional"
    KELLY = "kelly"


class Direction(Enum):
    LONG = "long"
    SHORT = "short"


@dataclass
class Position:
    id: str
    entry_price: float
    stop_loss: float
    size: float          # base asset units (e.g., BTC)
    usd_value: float     # notional USD value at entry
    direction: Direction
    risk_amount: float   # USD at risk


@dataclass
class TradeRecord:
    position_id: str
    direction: Direction
    entry_price: float
    exit_price: float
    size: float
    pnl: float           # realized USD PnL
    risk_amount: float


class StakeManager:
    def __init__(
        self,
        initial_capital: float = 10_000.0,
        risk_pct: float = 0.02,
        method: SizingMethod = SizingMethod.FIXED_FRACTIONAL,
        max_position_pct: float = 0.50,
        kelly_window: int = 50,
        kelly_min_trades: int = 20,
        kelly_fraction: float = 0.5,   # half-Kelly by default
    ):
        self.initial_capital = initial_capital
        self.risk_pct = risk_pct
        self.method = method
        self.max_position_pct = max_position_pct
        self.kelly_window = kelly_window
        self.kelly_min_trades = kelly_min_trades
        self.kelly_fraction = kelly_fraction

        self.realized_pnl = 0.0
        self.open_positions: dict[str, Position] = {}
        self.trade_history: list[TradeRecord] = []

    # ── Equity ──────────────────────────────────────────────

    def get_equity(self) -> float:
        """Current equity = initial capital + all realized PnL."""
        return self.initial_capital + self.realized_pnl

    # ── Position Sizing ─────────────────────────────────────

    def calculate_position_size(
        self,
        entry_price: float,
        stop_loss: float,
        direction: Direction,
        risk_pct_override: float = None,
    ) -> dict:
        """
        Calculate position size based on current method.

        Returns dict with:
          - size: base asset units
          - usd_value: notional USD value
          - risk_amount: USD at risk
          - method_used: which sizing method was actually applied
          - kelly_raw: raw kelly fraction (if kelly was used)
        """
        equity = self.get_equity()
        if equity <= 0:
            return {"size": 0.0, "usd_value": 0.0, "risk_amount": 0.0,
                    "method_used": "none", "kelly_raw": 0.0}

        # Risk per unit in USD
        risk_per_unit = self._risk_per_unit(entry_price, stop_loss, direction)
        if risk_per_unit <= 0:
            return {"size": 0.0, "usd_value": 0.0, "risk_amount": 0.0,
                    "method_used": "invalid_stop", "kelly_raw": 0.0}

        # Determine risk amount based on method
        method_used = self.method.value
        kelly_raw = 0.0

        if self.method == SizingMethod.KELLY and len(self.trade_history) >= self.kelly_min_trades:
            kelly_raw = self._compute_kelly()
            if kelly_raw > 0:
                risk_amount = equity * kelly_raw * self.kelly_fraction
                method_used = "kelly"
            else:
                # Kelly says don't trade (negative edge)
                return {"size": 0.0, "usd_value": 0.0, "risk_amount": 0.0,
                        "method_used": "kelly_negative", "kelly_raw": kelly_raw}
        else:
            # Fixed fractional (or Kelly fallback)
            effective_risk = risk_pct_override if risk_pct_override is not None else self.risk_pct
            risk_amount = equity * effective_risk
            if self.method == SizingMethod.KELLY:
                method_used = "kelly_fallback_to_fixed"

        # Position size in base units
        size = risk_amount / risk_per_unit

        # Notional value
        usd_value = size * entry_price

        # Cap at max position percentage of equity
        max_usd = equity * self.max_position_pct
        if usd_value > max_usd:
            usd_value = max_usd
            size = usd_value / entry_price
            risk_amount = size * risk_per_unit

        return {
            "size": size,
            "usd_value": usd_value,
            "risk_amount": risk_amount,
            "method_used": method_used,
            "kelly_raw": kelly_raw,
        }

    # ── Position Lifecycle ──────────────────────────────────

    def open_position(
        self,
        entry_price: float,
        stop_loss: float,
        size: float,
        direction: Direction,
    ) -> str:
        """Register an open position. Returns position ID."""
        risk_per_unit = self._risk_per_unit(entry_price, stop_loss, direction)
        pos_id = str(uuid.uuid4())[:8]

        pos = Position(
            id=pos_id,
            entry_price=entry_price,
            stop_loss=stop_loss,
            size=size,
            usd_value=size * entry_price,
            direction=direction,
            risk_amount=size * risk_per_unit,
        )
        self.open_positions[pos_id] = pos
        return pos_id

    def close_position(self, position_id: str, exit_price: float) -> Optional[TradeRecord]:
        """Close a position, compute PnL, update equity. Returns trade record."""
        if position_id not in self.open_positions:
            return None

        pos = self.open_positions.pop(position_id)

        # PnL calculation
        if pos.direction == Direction.LONG:
            pnl = (exit_price - pos.entry_price) * pos.size
        else:
            pnl = (pos.entry_price - exit_price) * pos.size

        self.realized_pnl += pnl

        record = TradeRecord(
            position_id=pos.id,
            direction=pos.direction,
            entry_price=pos.entry_price,
            exit_price=exit_price,
            size=pos.size,
            pnl=pnl,
            risk_amount=pos.risk_amount,
        )
        self.trade_history.append(record)
        return record

    # ── Stats ───────────────────────────────────────────────

    def get_stats(self) -> dict:
        """Return performance stats from trade history."""
        if not self.trade_history:
            return {
                "total_trades": 0, "win_rate": 0.0,
                "avg_win": 0.0, "avg_loss": 0.0,
                "profit_factor": 0.0, "kelly_raw": 0.0,
                "equity": self.get_equity(),
                "return_pct": 0.0,
                "open_positions": len(self.open_positions),
            }

        wins = [t for t in self.trade_history if t.pnl > 0]
        losses = [t for t in self.trade_history if t.pnl <= 0]

        win_rate = len(wins) / len(self.trade_history) if self.trade_history else 0.0
        avg_win = sum(t.pnl for t in wins) / len(wins) if wins else 0.0
        avg_loss = abs(sum(t.pnl for t in losses) / len(losses)) if losses else 0.0
        total_wins = sum(t.pnl for t in wins)
        total_losses = abs(sum(t.pnl for t in losses))
        profit_factor = total_wins / total_losses if total_losses > 0 else float('inf')

        kelly_raw = self._compute_kelly() if len(self.trade_history) >= self.kelly_min_trades else 0.0

        equity = self.get_equity()
        return_pct = ((equity - self.initial_capital) / self.initial_capital) * 100

        return {
            "total_trades": len(self.trade_history),
            "win_rate": win_rate,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": profit_factor,
            "kelly_raw": kelly_raw,
            "equity": equity,
            "return_pct": return_pct,
            "open_positions": len(self.open_positions),
        }

    # ── Internal Helpers ────────────────────────────────────

    def _risk_per_unit(self, entry_price: float, stop_loss: float, direction: Direction) -> float:
        """USD risk per 1 unit of base asset."""
        if direction == Direction.LONG:
            return entry_price - stop_loss
        else:
            return stop_loss - entry_price

    def _compute_kelly(self) -> float:
        """
        Kelly fraction from recent trade history.
        kelly = W - (1 - W) / R
        where W = win rate, R = avg_win / avg_loss (payoff ratio)
        """
        recent = self.trade_history[-self.kelly_window:]
        wins = [t for t in recent if t.pnl > 0]
        losses = [t for t in recent if t.pnl <= 0]

        if not wins or not losses:
            return 0.0

        win_rate = len(wins) / len(recent)
        avg_win = sum(t.pnl for t in wins) / len(wins)
        avg_loss = abs(sum(t.pnl for t in losses) / len(losses))

        if avg_loss == 0:
            return 0.0

        payoff_ratio = avg_win / avg_loss
        kelly = win_rate - (1 - win_rate) / payoff_ratio
        return kelly

    def reset(self):
        """Reset to initial state."""
        self.realized_pnl = 0.0
        self.open_positions.clear()
        self.trade_history.clear()
