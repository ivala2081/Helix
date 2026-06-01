"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

// Admin-only. RLS policy subscriptions_update_admin (is_admin()) is the real
// gate — these run with the admin's own session, not the service role.

export async function approveSubscriptionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createServerSupabase();
  await supabase
    .from("subscriptions")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin");
}

export async function rejectSubscriptionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createServerSupabase();
  await supabase.from("subscriptions").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin");
}
