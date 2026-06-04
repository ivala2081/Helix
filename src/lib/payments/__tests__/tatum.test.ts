import { describe, it, expect } from "vitest";
import { tronBase58ToHex, parseUsdtTransfer } from "../tatum";

describe("tronBase58ToHex", () => {
  it("decodes the known USDT-TRC20 contract address to its hex", () => {
    // TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t = 0x41a614f803b6fd780986a42c78ec9c7f77e6ded13c
    expect(tronBase58ToHex("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBe(
      "41a614f803b6fd780986a42c78ec9c7f77e6ded13c",
    );
  });
  it("returns null on malformed input", () => {
    expect(tronBase58ToHex("")).toBeNull();
    expect(tronBase58ToHex("not-an-address")).toBeNull();
    expect(tronBase58ToHex("0OIl")).toBeNull(); // chars outside base58 alphabet
  });
});

// Build a TRC-20 Transfer log fixture: 20-byte addresses right-padded into
// 32-byte topics; amount as hex in `data`.
const ownerHex40 = "abcdef0123456789abcdef0123456789abcdef01";
const fromHex40 = "1111111111111111111111111111111111111111";
const TRANSFER_SIG = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const pad32 = (h: string) => "0".repeat(64 - h.length) + h;
const amountHex = (usdt: number) => pad32(BigInt(Math.round(usdt * 1e6)).toString(16));

function txWithTransfer(opts: { addr: string; to: string; usdt: number; success?: boolean }) {
  return {
    ret: [{ contractRet: opts.success === false ? "REVERT" : "SUCCESS" }],
    log: [
      {
        address: opts.addr,
        topics: [TRANSFER_SIG, pad32(fromHex40), pad32(opts.to)],
        data: amountHex(opts.usdt),
      },
    ],
  };
}

describe("parseUsdtTransfer", () => {
  it("parses a USDT transfer to the owner (41-prefixed contract address)", () => {
    const tx = txWithTransfer({ addr: "41a614f803b6fd780986a42c78ec9c7f77e6ded13c", to: ownerHex40, usdt: 99 });
    const t = parseUsdtTransfer(tx, ownerHex40);
    expect(t).not.toBeNull();
    expect(t!.amountUsdt).toBeCloseTo(99, 6);
    expect(t!.toHex40).toBe(ownerHex40);
  });

  it("normalizes 0x-prefixed and bare contract addresses (last-20-byte compare)", () => {
    for (const addr of ["0xa614f803b6fd780986a42c78ec9c7f77e6ded13c", "a614f803b6fd780986a42c78ec9c7f77e6ded13c"]) {
      const t = parseUsdtTransfer(txWithTransfer({ addr, to: ownerHex40, usdt: 150 }), ownerHex40);
      expect(t?.amountUsdt).toBeCloseTo(150, 6);
    }
  });

  it("ignores a transfer to a DIFFERENT recipient", () => {
    const tx = txWithTransfer({ addr: "41a614f803b6fd780986a42c78ec9c7f77e6ded13c", to: fromHex40, usdt: 99 });
    expect(parseUsdtTransfer(tx, ownerHex40)).toBeNull();
  });

  it("ignores a transfer of a DIFFERENT token (not USDT contract)", () => {
    const tx = txWithTransfer({ addr: "41dead00000000000000000000000000000000beef", to: ownerHex40, usdt: 99 });
    expect(parseUsdtTransfer(tx, ownerHex40)).toBeNull();
  });

  it("returns null when there are no logs", () => {
    expect(parseUsdtTransfer({ ret: [{ contractRet: "SUCCESS" }], log: [] }, ownerHex40)).toBeNull();
    expect(parseUsdtTransfer(null, ownerHex40)).toBeNull();
  });
});
