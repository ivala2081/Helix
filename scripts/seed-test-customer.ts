// Seed a SIMULATED customer for Phase B testnet proof — no real money, no fake
// auth user. It turns an EXISTING account (the admin/owner by default) into a
// fully-eligible bot customer: active subscription + enabled bot + a connected
// exchange holding the FUTURES TESTNET key. The executor then trades that
// testnet account exactly as it would a real customer.
//
// Usage: npx tsx --env-file=.env.local scripts/seed-test-customer.ts
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   APP_ENCRYPTION_KEY, BINANCE_FUTURES_TESTNET_KEY, BINANCE_FUTURES_TESTNET_SECRET.
// Optional: SEED_USER_ID (defaults to the first admin profile).

import { createClient } from "@supabase/supabase-js";
import { encryptSecret } from "../src/lib/crypto/apiKeys";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tnKey = process.env.BINANCE_FUTURES_TESTNET_KEY;
  const tnSecret = process.env.BINANCE_FUTURES_TESTNET_SECRET;
  if (!url || !key) throw new Error("Missing Supabase env");
  if (!tnKey || !tnSecret) throw new Error("Missing BINANCE_FUTURES_TESTNET_KEY/_SECRET");

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId = process.env.SEED_USER_ID;
  if (!userId) {
    const { data } = await db.from("profiles").select("id").eq("role", "admin").limit(1);
    userId = data?.[0]?.id as string | undefined;
    if (!userId) throw new Error("No admin profile found — set SEED_USER_ID explicitly.");
  }
  console.log("Seeding simulated customer:", userId);

  // Active subscription (30 days).
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.from("subscriptions").insert({
    user_id: userId,
    plan: "pro",
    status: "active",
    price_usd: 99,
    activated_at: new Date().toISOString(),
    expires_at: expires,
    notes: "seed-test-customer (Phase B testnet)",
  });
  console.log("  ✓ subscription active until", expires);

  // Connected exchange holding the FUTURES TESTNET credentials.
  await db.from("exchange_connections").upsert(
    {
      user_id: userId,
      exchange: "binance",
      label: "Futures Testnet (seed)",
      api_key_enc: encryptSecret(tnKey),
      api_secret_enc: encryptSecret(tnSecret),
      status: "connected",
      last_error: null,
    },
    { onConflict: "user_id" },
  );
  console.log("  ✓ exchange_connection connected (testnet key encrypted)");

  // Bot enabled, 1% risk, default coins.
  await db.from("bot_settings").upsert(
    {
      user_id: userId,
      enabled: true,
      risk_pct: 1,
      symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"],
    },
    { onConflict: "user_id" },
  );
  console.log("  ✓ bot_settings enabled (risk 1%)");

  console.log("\nDone. Run: npm run executor-tick");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
