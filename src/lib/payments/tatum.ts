// USDT (TRC-20) payment verification via Tatum. SERVER-ONLY (uses TATUM_API_KEY).
//
// Verifies a customer-submitted TRON tx hash actually paid >= the price in USDT
// to the owner's wallet — replacing manual admin eyeballing. Non-custodial: we
// only READ the chain; funds go to the owner's own wallet, no keys in the app.
//
// NOTE: This rail is GATED by EXECUTION_LIVE (see pricing.ts). It stays dormant
// until the bot actually trades real accounts — building the rail does not by
// itself charge anyone. The exact Tatum response shape (esp. the TRC-20 event
// log) should be confirmed against one real tx before going live; the parsing is
// isolated + unit-tested and address comparison is normalized to the last 20
// bytes so a 41-/0x- prefix difference won't break it.

const TATUM_BASE = "https://api.tatum.io/v3";

// Official Tether USDT TRC-20 contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
// hex (41 + 20 bytes); we compare on the last 40 hex chars (the 20-byte address).
const USDT_TRC20_HEX40 = "a614f803b6fd780986a42c78ec9c7f77e6ded13c";
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_SIG = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const USDT_DECIMALS = 6;

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Decode a TRON base58check address to its hex form (41-prefixed, lowercase).
 *  Returns null on a malformed address. Checksum is not validated — the input is
 *  the owner's own trusted wallet from env, used only for address comparison. */
export function tronBase58ToHex(addr: string): string | null {
  if (!addr) return null;
  let num = 0n;
  for (const ch of addr) {
    const idx = B58.indexOf(ch);
    if (idx < 0) return null;
    num = num * 58n + BigInt(idx);
  }
  let hex = num.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  // 25 bytes = version(1) + payload(20) + checksum(4) = 50 hex chars
  if (hex.length !== 50) return null;
  const payload = hex.slice(0, 42); // version + 20-byte address
  if (!payload.startsWith("41")) return null;
  return payload.toLowerCase();
}

const last40 = (h: string) => (h ?? "").replace(/^0x/i, "").toLowerCase().slice(-40);

export type UsdtTransfer = { amountUsdt: number; toHex40: string; fromHex40?: string };

/** Pure: scan a Tatum TRON tx response's event logs for a USDT Transfer to
 *  `ownerHex40` (last-20-byte hex). Returns the transfer or null. */
export function parseUsdtTransfer(
  tx: Record<string, unknown> | null | undefined,
  ownerHex40: string,
): UsdtTransfer | null {
  const logs = (tx?.log ?? (tx as { logs?: unknown[] })?.logs ?? []) as Array<Record<string, unknown>>;
  if (!Array.isArray(logs)) return null;
  for (const log of logs) {
    const addr = last40(String(log.address ?? ""));
    if (addr !== USDT_TRC20_HEX40) continue;
    const topics = (log.topics ?? []) as string[];
    if (!Array.isArray(topics) || topics.length < 3) continue;
    if (last40(topics[0]) !== last40(TRANSFER_SIG)) continue;
    const toHex40 = last40(topics[2]);
    if (toHex40 !== last40(ownerHex40)) continue;
    const data = String(log.data ?? "0").replace(/^0x/i, "");
    let raw: bigint;
    try {
      raw = BigInt("0x" + (data || "0"));
    } catch {
      continue;
    }
    const amountUsdt = Number(raw) / 10 ** USDT_DECIMALS;
    return { amountUsdt, toHex40, fromHex40: last40(topics[1]) };
  }
  return null;
}

export type PaymentVerification = {
  ok: boolean;
  reason: string;
  amountUsdt?: number;
};

/** Verify a TRON tx hash paid >= minUsdt in USDT-TRC20 to `toWalletBase58`.
 *  ok=false carries a human reason; the caller decides (auto-activate vs leave
 *  pending for manual review). */
export async function verifyUsdtTronPayment(
  txHash: string,
  opts: { toWalletBase58: string; minUsdt: number; apiKey: string },
): Promise<PaymentVerification> {
  const ownerHex = tronBase58ToHex(opts.toWalletBase58);
  if (!ownerHex) return { ok: false, reason: "alıcı cüzdan adresi geçersiz" };
  if (!opts.apiKey) return { ok: false, reason: "ödeme doğrulayıcı yapılandırılmadı" };
  if (!/^[0-9a-fA-F]{64}$/.test(txHash.replace(/^0x/i, ""))) {
    return { ok: false, reason: "tx hash biçimi geçersiz" };
  }

  let tx: Record<string, unknown>;
  try {
    const res = await fetch(`${TATUM_BASE}/tron/transaction/${txHash}`, {
      headers: { "x-api-key": opts.apiKey },
      signal: AbortSignal.timeout(12000),
    });
    if (res.status === 404) return { ok: false, reason: "işlem bulunamadı" };
    if (!res.ok) return { ok: false, reason: `doğrulama hatası (HTTP ${res.status})` };
    tx = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "zincire ulaşılamadı, tekrar dene" };
  }

  // On-chain success: ret[0].contractRet === "SUCCESS".
  const ret = (tx.ret ?? []) as Array<{ contractRet?: string }>;
  const success = Array.isArray(ret) && ret.some((r) => r?.contractRet === "SUCCESS");
  if (!success) return { ok: false, reason: "işlem zincirde başarılı değil" };

  const transfer = parseUsdtTransfer(tx, last40(ownerHex));
  if (!transfer) return { ok: false, reason: "bu işlemde cüzdanına USDT transferi bulunamadı" };
  if (transfer.amountUsdt + 1e-6 < opts.minUsdt) {
    return { ok: false, reason: `tutar yetersiz: ${transfer.amountUsdt} < ${opts.minUsdt} USDT` };
  }
  return { ok: true, reason: "ok", amountUsdt: transfer.amountUsdt };
}
