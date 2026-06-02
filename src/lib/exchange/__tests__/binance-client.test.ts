import { describe, it, expect } from "vitest";
import { roundStep } from "../binance-client";

describe("roundStep — round qty DOWN to lot step", () => {
  it("rounds to step size", () => {
    expect(roundStep(0.123456, 0.0001)).toBeCloseTo(0.1234, 8);
    expect(roundStep(1.99, 1)).toBe(1);
    expect(roundStep(0.5, 0.1)).toBeCloseTo(0.5, 8);
  });

  it("never rounds up (would exceed balance)", () => {
    expect(roundStep(0.19999, 0.1)).toBeCloseTo(0.1, 8);
  });

  it("returns 0 when below one step", () => {
    expect(roundStep(0.00005, 0.0001)).toBe(0);
  });

  it("passes through when step is 0/invalid", () => {
    expect(roundStep(1.234, 0)).toBe(1.234);
  });
});
