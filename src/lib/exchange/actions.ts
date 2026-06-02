"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { encryptSecret } from "@/lib/crypto/apiKeys";
import { validateBinanceFuturesKey } from "@/lib/exchange/binance";
import { isSubscriptionActive } from "@/lib/subscription/status";

export type ConnState = { error?: string; message?: string };

/** Newest-subscription, user-scoped, expiry-aware active check (shared logic). */
async function hasActiveSub(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  return isSubscriptionActive(data?.[0] ?? null);
}

export async function connectExchangeAction(
  _prev: ConnState,
  formData: FormData,
): Promise<ConnState> {
  const exchange = String(formData.get("exchange") ?? "binance");
  const apiKey = String(formData.get("api_key") ?? "").trim();
  const apiSecret = String(formData.get("api_secret") ?? "").trim();

  if (!apiKey || !apiSecret) return { error: "API key ve secret gerekli." };
  if (exchange !== "binance")
    return { error: "Şimdilik sadece Binance destekleniyor. Bybit yakında." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  if (!(await hasActiveSub(supabase, user.id)))
    return { error: "Önce paketi satın al (aktif abonelik gerekli)." };

  // ── Validate against the real exchange (fail-closed, FUTURES-enabled,
  //    withdrawal-off — the bot trades USDT-M futures, not spot) ──
  const v = await validateBinanceFuturesKey(apiKey, apiSecret);
  if (!v.ok) return { error: v.error };

  // ── Encrypt + store atomically (unique user_id → upsert, never leaves the
  //    user with zero rows on a partial failure) ──
  const { error } = await supabase.from("exchange_connections").upsert(
    {
      user_id: user.id,
      exchange: "binance",
      api_key_enc: encryptSecret(apiKey),
      api_secret_enc: encryptSecret(apiSecret),
      status: "connected",
      last_error: null,
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: "Kayıt hatası: " + error.message };

  revalidatePath("/app/baglanti");
  return {
    message: v.ipRestricted
      ? "Borsa bağlandı ✓ (IP kısıtlı anahtar — güvenli)"
      : "Borsa bağlandı ✓",
  };
}

export async function disconnectExchangeAction(): Promise<void> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("exchange_connections").delete().eq("user_id", user.id);
  // Pause the bot when the exchange is disconnected (upsert → guaranteed even if
  // no bot_settings row exists yet).
  await supabase
    .from("bot_settings")
    .upsert({ user_id: user.id, enabled: false }, { onConflict: "user_id" });
  revalidatePath("/app/baglanti");
}

export async function updateBotSettingsAction(formData: FormData): Promise<void> {
  let enabled = formData.get("enabled") === "on";
  const riskRaw = Number(formData.get("risk_pct"));
  const risk_pct = Number.isFinite(riskRaw)
    ? Math.min(5, Math.max(0.25, riskRaw))
    : 1;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Guard: the bot may only be ENABLED with an active subscription AND a
  // connected exchange. Otherwise force it off (never trade without both).
  if (enabled) {
    const [subOk, connRes] = await Promise.all([
      hasActiveSub(supabase, user.id),
      supabase
        .from("exchange_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "connected")
        .limit(1),
    ]);
    if (!subOk || !connRes.data?.length) enabled = false;
  }

  await supabase
    .from("bot_settings")
    .upsert({ user_id: user.id, enabled, risk_pct }, { onConflict: "user_id" });
  revalidatePath("/app/baglanti");
}
