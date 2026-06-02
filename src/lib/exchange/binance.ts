// Binance REST helpers — SERVER ONLY. Validates a customer's API key without
// any third-party SDK: signed requests via HMAC-SHA256.
//
// Security note: we check the key's API-level permissions. A key with
// withdrawal enabled is REJECTED — the bot must never be able to move funds.

import { createHmac } from "node:crypto";

const BASE = "https://api.binance.com";

type SignedResult = { ok: boolean; status: number; body: any };

async function signedGet(
  path: string,
  apiKey: string,
  secret: string,
): Promise<SignedResult> {
  const query = `recvWindow=10000&timestamp=${Date.now()}`;
  const signature = createHmac("sha256", secret).update(query).digest("hex");
  const url = `${BASE}${path}?${query}&signature=${signature}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

export type BinanceValidation = {
  ok: boolean;
  enableWithdrawals?: boolean;
  canTrade?: boolean;
  ipRestricted?: boolean;
  error?: string;
};

/**
 * Decide whether an apiRestrictions response describes a SAFE, usable key.
 * FAIL-CLOSED: every security-critical permission must be an explicit boolean —
 * a missing/renamed/non-boolean field (or a proxied 200 body that parsed to {})
 * is treated as a validation failure, never as "withdrawals off". The bot trades
 * SPOT, so a futures-only key is rejected. Pure → unit-testable without network.
 */
export function evaluateBinancePermissions(body: unknown): BinanceValidation {
  const b = (body ?? {}) as Record<string, unknown>;

  if (typeof b.enableWithdrawals !== "boolean") {
    return {
      ok: false,
      error: "İzinler doğrulanamadı (beklenmeyen yanıt). Lütfen tekrar dene.",
    };
  }
  if (b.enableWithdrawals === true) {
    return {
      ok: false,
      error:
        "Bu anahtarda ÇEKİM izni AÇIK. Güvenlik için reddedildi — Binance'de çekim iznini kapatıp tekrar dene.",
    };
  }
  if (b.enableSpotAndMarginTrading !== true) {
    return {
      ok: false,
      error:
        "Bu anahtarda Spot işlem izni yok. 'Enable Spot & Margin Trading'i açıp tekrar dene.",
    };
  }
  return {
    ok: true,
    enableWithdrawals: false,
    canTrade: true,
    ipRestricted: b.ipRestrict === true,
  };
}

/** Validate a Binance API key: confirms it works and inspects permissions. */
export async function validateBinanceKey(
  apiKey: string,
  secret: string,
): Promise<BinanceValidation> {
  try {
    const r = await signedGet("/sapi/v1/account/apiRestrictions", apiKey, secret);
    if (!r.ok) {
      // -2015: invalid key / IP not whitelisted; -1022: bad signature (wrong secret)
      const code = r.body?.code;
      let error = r.body?.msg || `HTTP ${r.status}`;
      if (code === -2015)
        error =
          "Geçersiz anahtar ya da IP kısıtlaması. Anahtarı ve (varsa) IP-whitelist'i kontrol et.";
      else if (code === -1022) error = "Secret hatalı görünüyor.";
      return { ok: false, error };
    }
    return evaluateBinancePermissions(r.body);
  } catch (e) {
    return {
      ok: false,
      error:
        "Binance'e ulaşılamadı (ağ/IP engeli olabilir). " + (e as Error).message,
    };
  }
}

/** Total USDT balance (free + locked). Returns null on failure. */
export async function fetchBinanceUsdt(
  apiKey: string,
  secret: string,
): Promise<number | null> {
  try {
    const r = await signedGet("/api/v3/account", apiKey, secret);
    if (!r.ok || !Array.isArray(r.body?.balances)) return null;
    const usdt = r.body.balances.find((b: any) => b.asset === "USDT");
    if (!usdt) return 0;
    return parseFloat(usdt.free) + parseFloat(usdt.locked);
  } catch {
    return null;
  }
}
