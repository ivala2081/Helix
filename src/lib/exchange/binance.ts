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
    return {
      ok: true,
      enableWithdrawals: r.body.enableWithdrawals === true,
      canTrade:
        r.body.enableSpotAndMarginTrading === true ||
        r.body.enableFutures === true,
      ipRestricted: r.body.ipRestrict === true,
    };
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
