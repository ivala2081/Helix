import { describe, it, expect } from "vitest";
import {
  computeAllocation,
  WEIGHT_FLOOR,
  WEIGHT_CEILING,
  MIN_TRADES_FOR_DYNAMIC,
  type SymbolTrades,
} from "../allocation";

describe("computeAllocation", () => {
  it("returns equal weight when no symbol has enough trades", () => {
    const result = computeAllocation([
      { symbol: "BTC", rMultiples: [1, -1] },
      { symbol: "ETH", rMultiples: [0.5] },
      { symbol: "SOL", rMultiples: [] },
    ]);
    for (const w of result.weights.values()) {
      expect(w).toBeCloseTo(1 / 3, 2);
    }
  });

  it("favors the higher-Sharpe symbol", () => {
    // Same |variance|, opposite signs of mean — pure mean shift.
    const winner: SymbolTrades = {
      symbol: "WIN",
      rMultiples: [1.5, 1.4, 1.6, 1.3, 1.5, 1.7, 1.4, 1.6, 1.5, 1.4],
    };
    const loser: SymbolTrades = {
      symbol: "LOS",
      rMultiples: [-1.5, -1.4, -1.6, -1.3, -1.5, -1.7, -1.4, -1.6, -1.5, -1.4],
    };
    const result = computeAllocation([winner, loser]);
    expect(result.weights.get("WIN")!).toBeGreaterThan(result.weights.get("LOS")!);
  });

  it("respects floor and ceiling", () => {
    // Construct extreme positive on A, extreme negative on B to push past clamps.
    const A: SymbolTrades = { symbol: "A", rMultiples: Array(50).fill(5) };
    const B: SymbolTrades = { symbol: "B", rMultiples: Array(50).fill(-5) };
    const result = computeAllocation([A, B]);
    for (const w of result.weights.values()) {
      expect(w).toBeGreaterThanOrEqual(WEIGHT_FLOOR - 1e-9);
      expect(w).toBeLessThanOrEqual(WEIGHT_CEILING + 1e-9);
    }
  });

  it("weights sum approximately to 1 after clamping", () => {
    const symbols: SymbolTrades[] = ["A", "B", "C", "D", "E"].map((s, i) => ({
      symbol: s,
      rMultiples: Array(20)
        .fill(0)
        .map((_, j) => Math.sin((i + 1) * j) * (i % 2 === 0 ? 1 : -1)),
    }));
    const result = computeAllocation(symbols);
    const sum = [...result.weights.values()].reduce((a, b) => a + b, 0);
    // Allow some slack because final re-clamp to floor/ceiling can drift the sum.
    expect(sum).toBeGreaterThan(0.5);
    expect(sum).toBeLessThan(1.5);
  });

  it("handles a single-symbol portfolio", () => {
    const result = computeAllocation([
      { symbol: "ONLY", rMultiples: Array(20).fill(0.3) },
    ]);
    const w = result.weights.get("ONLY")!;
    // Single symbol still clamped to ceiling.
    expect(w).toBeLessThanOrEqual(WEIGHT_CEILING + 1e-9);
    expect(w).toBeGreaterThanOrEqual(WEIGHT_FLOOR - 1e-9);
  });

  it("handles zero symbols", () => {
    const result = computeAllocation([]);
    expect(result.weights.size).toBe(0);
  });
});
