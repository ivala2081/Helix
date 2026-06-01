"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";

/** Throws unless the current session belongs to an admin. */
async function assertAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

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

/** Change a customer's role. RLS (is_admin) + the role guard permit this only
 *  when the caller is an admin. */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || (role !== "customer" && role !== "admin")) return;
  const supabase = await createServerSupabase();
  if (!(await assertAdmin(supabase))) return;
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath(`/admin/${userId}`);
}

/** Manually enable/disable a customer's bot. bot_settings is owner-only under
 *  RLS, so this uses the service role — gated by an explicit admin check. */
export async function setUserBotAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("user_id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!userId) return;
  const supabase = await createServerSupabase();
  if (!(await assertAdmin(supabase))) return;
  const svc = createServiceClient();
  await svc
    .from("bot_settings")
    .upsert({ user_id: userId, enabled }, { onConflict: "user_id" });
  revalidatePath(`/admin/${userId}`);
}
