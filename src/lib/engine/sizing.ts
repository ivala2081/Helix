// Position sizing — port of stake_manager.py:StakeManager.calculate_position_size
//
// Fixed Fractional with optional position cap. Critical parity detail:
// when the position cap kicks in, risk_amount is RECOMPUTED as
// `size * risk_per_unit`, not the original equity*risk_pct. This means
// the actual risk taken is LESS than risk_pct when capped.

import type { Direction } from "./types";

export interface SizingResult {
  size: number; // base-asset units
  usdValue: number;
  riskAmount: number;
  riskPerUnit: number;
}

export function calculatePositionSize(
  equity: number,
  entryPrice: number,
  stopLoss: number,
  direction: Direction,
  riskPct: number,
  maxPositionPct: number,
): SizingResult {
  if (equity <= 0) {
    return { size: 0, usdValue: 0, riskAmount: 0, riskPerUnit: 0 };
  }

  const riskPerUnit =
    direction === "LONG" ? entryPrice - stopLoss : stopLoss - entryPrice;
  if (riskPerUnit <= 0) {
    return { size: 0, usdValue: 0, riskAmount: 0, riskPerUnit: 0 };
  }

  let riskAmount = equity * riskPct;
  let size = riskAmount / riskPerUnit;
  let usdValue = size * entryPrice;

  // Apply position cap
  const maxUsd = equity * maxPositionPct;
  if (usdValue > maxUsd) {
    usdValue = maxUsd;
    size = usdValue / entryPrice;
    riskAmount = size * riskPerUnit; // recomputed (matches Python)
  }

  return { size, usdValue, riskAmount, riskPerUnit };
}
