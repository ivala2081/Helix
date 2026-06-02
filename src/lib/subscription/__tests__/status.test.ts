import { describe, it, expect } from "vitest";
import { isSubscriptionActive } from "../status";

const NOW = new Date("2026-06-02T12:00:00Z");

describe("isSubscriptionActive", () => {
  it("active + no expiry (lifetime) → true", () => {
    expect(isSubscriptionActive({ status: "active", expires_at: null }, NOW)).toBe(true);
    expect(isSubscriptionActive({ status: "active" }, NOW)).toBe(true);
  });

  it("active + future expiry → true", () => {
    expect(
      isSubscriptionActive({ status: "active", expires_at: "2026-07-01T00:00:00Z" }, NOW),
    ).toBe(true);
  });

  it("active + past expiry → false (finding 4)", () => {
    expect(
      isSubscriptionActive({ status: "active", expires_at: "2026-05-01T00:00:00Z" }, NOW),
    ).toBe(false);
  });

  it("non-active statuses → false", () => {
    expect(isSubscriptionActive({ status: "pending" }, NOW)).toBe(false);
    expect(isSubscriptionActive({ status: "rejected" }, NOW)).toBe(false);
    expect(isSubscriptionActive({ status: "expired" }, NOW)).toBe(false);
    expect(isSubscriptionActive({ status: "cancelled" }, NOW)).toBe(false);
  });

  it("null/undefined → false", () => {
    expect(isSubscriptionActive(null, NOW)).toBe(false);
    expect(isSubscriptionActive(undefined, NOW)).toBe(false);
  });
});
