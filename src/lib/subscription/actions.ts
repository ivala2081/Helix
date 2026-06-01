"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export type SubState = { error?: string; message?: string };

// Customer submits proof of a USDT payment. Creates a 'pending' subscription
// (RLS enforces status='pending' and user_id=self). An admin verifies the tx
// and activates it.
export async function requestSubscriptionAction(
  _prev: SubState,
  formData: FormData,
): Promise<SubState> {
  const tx = String(formData.get("payment_tx") ?? "").trim();
  const network = String(formData.get("payment_network") ?? "TRC20").trim();

  if (!tx) return { error: "USDT işlem hash'i (tx) gerekli." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı, tekrar giriş yap." };

  // Block duplicate pending requests.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: "Zaten beklemede veya aktif bir aboneliğin var." };
  }

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
