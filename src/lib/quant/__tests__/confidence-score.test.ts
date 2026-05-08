import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  type HistoricalWindowsFile,
  type LiveTrade,
} from "../confidence-score";

const NOW = 1_750_000_000_000;
const HOUR = 3_600_000;

function trade(exitTs: number, pnl: number, r: number | null = null): LiveTrade {
  return { exit_ts: exitTs, pnl, r_multiple: r };
}

function mkHist(rs: number[]): HistoricalWindowsFile {
  return {
    generated_at: "2026-05-08",
    window_days: 24,
    symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    realism_patches: ["tp_require_close"],
    windows: rs.map((r) => ({ n: 10, wr: 0.6, pf: 1.5, sum_r: r, pnl: 100 })),
  };
}

describe("computeConfidence", () => {
  it("returns null below minimum sample", () => {
    const hist = mkHist([1, 2, 3, 4, 5]);
    const result = computeConfidence(
      [trade(NOW - HOUR, 100, 1), trade(NOW - 2 * HOUR, 100, 1)],
      hist,
      NOW,
    );
    expect(result).toBeNull();
  });

  it("places extreme negative live R at low percentile", () => {
    const hist = mkHist([-5, -3, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const live = [
      trade(NOW - HOUR, -100, -1),
      trade(NOW - 2 * HOUR, -100, -1),
      trade(NOW - 3 * HOUR, -100, -1),
      trade(NOW - 4 * HOUR, -100, -1),
      trade(NOW - 5 * HOUR, -100, -1),
      trade(NOW - 6 * HOUR, -100, -1),
      trade(NOW - 7 * HOUR, -100, -1),
    ];
    const result = computeConfidence(live, hist, NOW)!;
    // -7R is below all 14 historical samples → 0 percentile
    expect(result.score).toBe(0);
    expect(result.band).toBe("extreme_low");
  });

  it("places median live R near 50th percentile", () => {
    const rs: number[] = [];
    for (let i = 0; i < 100; i++) rs.push(i * 0.1);
    const hist = mkHist(rs);
    // sumR = 5.0 → 50 of 100 are below
    const live = [
      trade(NOW - HOUR, 250, 2.5),
      trade(NOW - 2 * HOUR, 250, 2.5),
    ];
    // Need at least 3 trades — add one more
    live.push(trade(NOW - 3 * HOUR, 0, 0));
    const result = computeConfidence(live, hist, NOW)!;
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(60);
    expect(result.band).toBe("normal");
  });

  it("filters trades older than window", () => {
    const hist = mkHist([0, 1, 2]);
    const live = [
      trade(NOW - 30 * 86_400_000, 1000, 10), // way old, should be excluded
      trade(NOW - HOUR, -50, -0.5),
      trade(NOW - 2 * HOUR, -50, -0.5),
      trade(NOW - 3 * HOUR, -50, -0.5),
    ];
    const result = computeConfidence(live, hist, NOW)!;
    expect(result.nLive).toBe(3);
    expect(result.liveSumR).toBeLessThan(0);
  });
});
