"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  EXECUTION_LIVE,
  MONTHLY_PRICE_USD,
  SUBSCRIPTION_DAYS,
} from "@/lib/pricing";
import { verifyUsdtTronPayment } from "@/lib/payments/tatum";

export type SubState = { error?: string; message?: string };

// Customer submits a USDT tx hash. The TRC-20 payment is auto-verified on-chain
// via Tatum (amount >= price, to the owner wallet, confirmed) — verified payments
// activate the subscription immediately (service role, since RLS only lets a
// customer self-insert a 'pending' row); anything unverifiable falls to 'pending'
// for manual admin review. Non-custodial: we only READ the chain.
//
// HARD GATE: while EXECUTION_LIVE is false the action takes NO payment at all —
// the bot does not trade real accounts yet, so charging would be dishonest. This
// is the server-side twin of the UI gate; flipping EXECUTION_LIVE (pricing.ts) is
// the single switch the owner controls to open live billing.
export async function requestSubscriptionAction(
  _prev: SubState,
  formData: FormData,
): Promise<SubState> {
  if (!EXECUTION_LIVE) {
    return {
      error:
        "Ödeme şu an kapalı — strateji canlı doğrulama aşamasında. Bot gerçek hesaplarda işlem açmaya başlayınca ücretlendirme açılacak.",
    };
  }

  const tx = String(formData.get("payment_tx") ?? "").trim();
  const network = String(formData.get("payment_network") ?? "TRC20").trim();
  if (!tx) return { error: "USDT işlem hash'i (tx) gerekli." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı, tekrar giriş yap." };

  // Block duplicate pending/active subscriptions for this user.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: "Zaten beklemede veya aktif bir aboneliğin var." };
  }

  // Replay protection: a given tx hash can only ever fund one subscription.
  const { data: usedTx } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("payment_tx", tx)
    .limit(1);
  if (usedTx && usedTx.length > 0) {
    return { error: "Bu işlem hash'i daha önce kullanılmış." };
  }

  // ── On-chain auto-verification (TRC-20 via Tatum) ──
  const apiKey = process.env.TATUM_API_KEY ?? "";
  const wallet = process.env.NEXT_PUBLIC_USDT_WALLET ?? "";
  if (network === "TRC20" && apiKey && wallet) {
    const v = await verifyUsdtTronPayment(tx, {
      toWalletBase58: wallet,
      minUsdt: MONTHLY_PRICE_USD,
      apiKey,
    });
    if (v.ok) {
      // Verified → activate immediately (service role bypasses the pending-only
      // self-insert RLS policy).
      const now = new Date();
      const expires = new Date(now.getTime() + SUBSCRIPTION_DAYS * 86_400_000);
      const svc = createServiceClient();
      const { error } = await svc.from("subscriptions").insert({
        user_id: user.id,
        status: "active",
        payment_tx: tx,
        payment_network: network,
        activated_at: now.toISOString(),
        expires_at: expires.toISOString(),
        notes: `auto-verified ${v.amountUsdt} USDT`,
      });
      if (error) return { error: "Kayıt başarısız: " + error.message };
      revalidatePath("/app");
      return { message: "Ödeme doğrulandı ✓ Aboneliğin aktif." };
    }
    // Could not verify automatically → leave pending for manual review, with the
    // reason recorded so the admin knows why.
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      status: "pending",
      payment_tx: tx,
      payment_network: network,
      notes: `oto-doğrulama başarısız: ${v.reason}`,
    });
    if (error) return { error: "Kayıt başarısız: " + error.message };
    revalidatePath("/app");
    return {
      message: `Ödemen alındı, inceleniyor (${v.reason}). Doğrulanınca aktifleşecek.`,
    };
  }

  // Non-TRC20 (or verifier not configured) → manual review path.
  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    status: "pending",
    payment_tx: tx,
    payment_network: network,
  });
  if (error) return { error: "Kayıt başarısız: " + error.message };

  revalidatePath("/app");
  return {
    message: "Ödemen alındı, inceleniyor. Onaylanınca panelinde aktifleşecek.",
  };
}
