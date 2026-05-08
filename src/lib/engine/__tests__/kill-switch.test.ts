import { describe, it, expect } from "vitest";
import {
  evaluateKillSwitch,
  computeRollingDrawdown,
  countConsecutiveLosses,
  K1_DD_TRIGGER,
  K2_CONSECUTIVE_SL,
  K3_DAILY_LOSS_PCT,
  type MinimalTrade,
} from "../kill-switch";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = 1_750_000_000_000;

function trade(exitTs: number, pnl: number, rMultiple: number | null = null): MinimalTrade {
  return { exitTs, pnl, rMultiple };
}

describe("kill-switch — K1 rolling drawdown", () => {
  it("triggers K1 when DD exceeds threshold", () => {
    // 5 trades each -1R → -5% on synthetic R-equity, then peak=1.0, trough=0.95
    // DD = (1.0 - 0.95) / 1.0 = 5%, below trigger.
    // Push to -16R total → DD = 16%.
    const trades: MinimalTrade[] = [];
    for (let i = 0; i < 16; i++) {
      trades.push(trade(NOW - (16 - i) * HOUR, -100, -1));
    }
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: trades,
    });
    expect(r.paused).toBe(true);
    expect(r.state.rule).toBe("K1_rolling_dd");
    expect(r.state.details!.metricValue).toBeGreaterThan(K1_DD_TRIGGER);
  });

  it("does not trigger when DD below threshold", () => {
    const trades = [
      trade(NOW - 3 * HOUR, -100, -1),
      trade(NOW - 2 * HOUR, -100, -1),
      trade(NOW - 1 * HOUR, -100, -1),
    ];
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: trades,
    });
    expect(r.paused).toBe(false);
  });
});

describe("kill-switch — K2 consecutive losses", () => {
  it("triggers K2 at 10 consecutive losses", () => {
    const trades: MinimalTrade[] = [];
    for (let i = 0; i < 10; i++) {
      trades.push(trade(NOW - (10 - i) * HOUR, -50, -0.5));
    }
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: trades,
    });
    expect(r.paused).toBe(true);
    expect(r.state.rule).toBe("K2_consecutive_sl");
  });

  it("does not trigger if a recent winner breaks the streak", () => {
    const trades: MinimalTrade[] = [];
    for (let i = 0; i < 9; i++) {
      trades.push(trade(NOW - (10 - i) * HOUR, -50, -0.5));
    }
    trades.push(trade(NOW - HOUR, +200, +2));
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: trades,
    });
    expect(r.paused).toBe(false);
  });
});

describe("kill-switch — K3 daily loss", () => {
  it("triggers K3 when 24h loss exceeds 4% of initial capital", () => {
    const trades: MinimalTrade[] = [
      trade(NOW - 3 * HOUR, -200, -1),
      trade(NOW - 2 * HOUR, -150, -0.75),
      trade(NOW - 1 * HOUR, -120, -0.6),
    ];
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: trades,
    });
    expect(r.paused).toBe(true);
    expect(r.state.rule).toBe("K3_daily_loss");
    expect(r.state.details!.metricValue).toBeGreaterThan(K3_DAILY_LOSS_PCT);
  });

  it("ignores losses older than 24h", () => {
    const trades: MinimalTrade[] = [
      trade(NOW - 30 * HOUR, -800, -4),
      trade(NOW - 1 * HOUR, -50, -0.25),
    ];
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: trades,
    });
    expect(r.paused).toBe(false);
  });
});

describe("kill-switch — K4 parity staleness", () => {
  it("triggers K4 when parity hasn't passed in 7 days", () => {
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: [],
      parityLastPassedAt: NOW - 8 * DAY,
    });
    expect(r.paused).toBe(true);
    expect(r.state.rule).toBe("K4_parity_fail");
  });

  it("does not trigger when parity recent", () => {
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: [],
      parityLastPassedAt: NOW - 1 * DAY,
    });
    expect(r.paused).toBe(false);
  });
});

describe("kill-switch — auto-resume", () => {
  it("K1 auto-resumes when cooldown elapsed AND DD recovered", () => {
    // Recent trades show only minor DD now.
    const trades: MinimalTrade[] = [
      trade(NOW - 5 * HOUR, +100, +1),
      trade(NOW - 4 * HOUR, +100, +1),
    ];
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: trades,
      currentState: {
        triggered: true,
        rule: "K1_rolling_dd",
        triggeredAt: NOW - 8 * DAY,
        resumeAt: NOW - 1 * DAY, // cooldown elapsed
        details: { metricValue: 0.18, threshold: K1_DD_TRIGGER },
      },
    });
    expect(r.paused).toBe(false);
    expect(r.resumeNow).toBe(true);
  });

  it("K2 never auto-resumes (manual only)", () => {
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: [],
      currentState: {
        triggered: true,
        rule: "K2_consecutive_sl",
        triggeredAt: NOW - 30 * DAY,
        resumeAt: null,
      },
    });
    expect(r.paused).toBe(true);
    expect(r.resumeNow).toBe(false);
  });

  it("K3 auto-resumes after 24h cooldown", () => {
    const r = evaluateKillSwitch({
      now: NOW,
      initialCapital: 10_000,
      recentTrades: [],
      currentState: {
        triggered: true,
        rule: "K3_daily_loss",
        triggeredAt: NOW - 25 * HOUR,
        resumeAt: NOW - HOUR,
      },
    });
    expect(r.paused).toBe(false);
    expect(r.resumeNow).toBe(true);
  });
});

describe("kill-switch — helpers", () => {
  it("computeRollingDrawdown is zero on empty list", () => {
    expect(computeRollingDrawdown([])).toBe(0);
  });

  it("computeRollingDrawdown captures peak-to-trough drop", () => {
    // +5R to 1.05, then -10R total to 0.95 → DD = (1.05-0.95)/1.05
    const trades = [
      trade(1, +500, +5),
      trade(2, -1000, -10),
    ];
    const dd = computeRollingDrawdown(trades);
    expect(dd).toBeCloseTo(0.0952, 3);
  });

  it("countConsecutiveLosses skips winners", () => {
    const trades = [
      trade(1, -10, -0.1),
      trade(2, +20, +0.2),
      trade(3, -10, -0.1),
      trade(4, -10, -0.1),
    ];
    expect(countConsecutiveLosses(trades)).toBe(2);
  });
});
