import { describe, it, expect } from "vitest";
import { classifyPnl, tradeStats } from "../trades";

describe("classifyPnl", () => {
  it("classifies by sign, null/NaN excluded", () => {
    expect(classifyPnl(10)).toBe("win");
    expect(classifyPnl(-10)).toBe("loss");
    expect(classifyPnl(0)).toBe("breakeven");
    expect(classifyPnl(null)).toBe(null);
    expect(classifyPnl(undefined)).toBe(null);
    expect(classifyPnl(NaN)).toBe(null);
  });
});

describe("tradeStats", () => {
  it("win-rate denominator excludes breakeven and unsettled (findings 8/21)", () => {
    // 4 wins, 6 breakeven → 100% (not 40%); breakevens are neutral
    const s = tradeStats([1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(s.wins).toBe(4);
    expect(s.losses).toBe(0);
    expect(s.breakeven).toBe(6);
    expect(s.winRate).toBe(1);
  });

  it("excludes null/unsettled from the denominator", () => {
    // 5 wins, 5 null → 100% (not 50%)
    const s = tradeStats([1, 1, 1, 1, 1, null, null, null, null, null]);
    expect(s.settled).toBe(5);
    expect(s.winRate).toBe(1);
  });

  it("mixed", () => {
    const s = tradeStats([10, -5, 10, -5, 0]); // 2W 2L 1BE
    expect(s.winRate).toBe(0.5);
  });

  it("no decided trades → null win-rate", () => {
    expect(tradeStats([]).winRate).toBe(null);
    expect(tradeStats([0, 0, null]).winRate).toBe(null);
  });
});
