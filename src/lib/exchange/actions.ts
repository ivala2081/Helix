"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { encryptSecret } from "@/lib/crypto/apiKeys";
import { validateBinanceKey } from "@/lib/exchange/binance";

export type ConnState = { error?: string; message?: string };

async function hasActiveSub(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("status", "active")
    .limit(1);
  return Boolean(data && data.length > 0);
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

  if (!(await hasActiveSub(supabase)))
    return { error: "Önce paketi satın al (aktif abonelik gerekli)." };

  // ── Validate against the real exchange ──
  const v = await validateBinanceKey(apiKey, apiSecret);
  if (!v.ok) return { error: "Doğrulama başarısız: " + v.error };
  if (v.enableWithdrawals)
    return {
      error:
        "Bu anahtarda ÇEKİM izni AÇIK. Güvenlik için reddedildi — Binance'de çekim iznini kapatıp tekrar dene.",
    };
  if (!v.canTrade)
    return {
      error:
        "Bu anahtarda işlem (Spot/Futures) izni yok. İşlem iznini açıp tekrar dene.",
    };

  // ── Encrypt + store (replace any existing connection) ──
  await supabase.from("exchange_connections").delete().eq("user_id", user.id);
  const { error } = await supabase.from("exchange_connections").insert({
    user_id: user.id,
    exchange: "binance",
    api_key_enc: encryptSecret(apiKey),
    api_secret_enc: encryptSecret(apiSecret),
    status: "connected",
  });
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
  // Pause the bot when the exchange is disconnected.
  await supabase.from("bot_settings").update({ enabled: false }).eq("user_id", user.id);
  revalidatePath("/app/baglanti");
}

export async function updateBotSettingsAction(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "on";
  const riskRaw = Number(formData.get("risk_pct"));
  const risk_pct = Number.isFinite(riskRaw)
    ? Math.min(5, Math.max(0.25, riskRaw))
    : 1;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("bot_settings")
    .upsert({ user_id: user.id, enabled, risk_pct }, { onConflict: "user_id" });
  revalidatePath("/app/baglanti");
}
