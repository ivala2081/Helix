import { describe, it, expect } from "vitest";
import { sanitizeNext } from "../redirect";

describe("sanitizeNext — open-redirect guard", () => {
  it("keeps clean same-origin paths", () => {
    expect(sanitizeNext("/app")).toBe("/app");
    expect(sanitizeNext("/admin/lab")).toBe("/admin/lab");
    expect(sanitizeNext("/app/baglanti?x=1")).toBe("/app/baglanti?x=1");
  });

  it("blocks protocol-relative and absolute URLs", () => {
    expect(sanitizeNext("//evil.com")).toBe("/app");
    expect(sanitizeNext("https://evil.com")).toBe("/app");
    expect(sanitizeNext("http://evil.com/x")).toBe("/app");
  });

  it("blocks junk / empty / nullish", () => {
    expect(sanitizeNext("javascript:alert(1)")).toBe("/app");
    expect(sanitizeNext("evil.com")).toBe("/app");
    expect(sanitizeNext("")).toBe("/app");
    expect(sanitizeNext(null)).toBe("/app");
    expect(sanitizeNext(undefined)).toBe("/app");
  });
});
