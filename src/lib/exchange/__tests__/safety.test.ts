import { describe, it, expect } from "vitest";
import { isSignalFresh, buildOpenGate, DEFAULT_MAX_SIGNAL_AGE_MS } from "../safety";
import type { KillSwitchResult } from "../../engine/kill-switch";

const NOW = 1_900_000_000_000;
const ok: KillSwitchResult = { paused: false, resumeNow: false, state: { triggered: false } };
const paused: KillSwitchResult = {
  paused: true,
  resumeNow: false,
  state: { triggered: true, rule: "K2_consecutive_sl" },
};

describe("isSignalFresh", () => {
  it("fresh within the window", () => {
    expect(isSignalFresh(NOW - 60_000, NOW)).toBe(true);
  });
  it("stale past the window", () => {
    expect(isSignalFresh(NOW - DEFAULT_MAX_SIGNAL_AGE_MS - 1, NOW)).toBe(false);
  });
  it("null / non-finite is never fresh (fail-closed)", () => {
    expect(isSignalFresh(null, NOW)).toBe(false);
    expect(isSignalFresh(NaN, NOW)).toBe(false);
  });
  it("respects a custom max age", () => {
    expect(isSignalFresh(NOW - 120_000, NOW, 60_000)).toBe(false);
    expect(isSignalFresh(NOW - 30_000, NOW, 60_000)).toBe(true);
  });
});

describe("buildOpenGate", () => {
  it("allows when fresh and not paused", () => {
    expect(buildOpenGate(true, ok)).toEqual({ allowOpen: true, reason: "ok" });
  });
  it("blocks on stale signal even if kill-switch is fine", () => {
    const g = buildOpenGate(false, ok);
    expect(g.allowOpen).toBe(false);
    expect(g.reason).toMatch(/stale/);
  });
  it("blocks when the kill-switch is paused", () => {
    const g = buildOpenGate(true, paused);
    expect(g.allowOpen).toBe(false);
    expect(g.reason).toMatch(/kill-switch/);
  });
  it("treats a null kill-switch result as not-paused", () => {
    expect(buildOpenGate(true, null).allowOpen).toBe(true);
  });
});
