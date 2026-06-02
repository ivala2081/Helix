"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";

/** Throws unless the current session belongs to an admin. Throwing (not a silent
 *  `return`) means an unauthorized invocation fails loudly instead of looking
 *  like a successful no-op. Mandatory before any admin mutation / service-role write. */
async function assertAdminOrThrow(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") throw new Error("Forbidden: admin only");
}

export async function approveSubscriptionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createServerSupabase();
  await assertAdminOrThrow(supabase);
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
  await assertAdminOrThrow(supabase);

  // Look up the owner so we can tear down their access (Phase 4).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("id", id)
    .single();

  await supabase.from("subscriptions").update({ status: "rejected" }).eq("id", id);

  // Revoke access: pause the bot for that user (service role — bot_settings is
  // owner-only under RLS). Connection rows are left for the user to manage.
  if (sub?.user_id) {
    const svc = createServiceClient();
    await svc
      .from("bot_settings")
      .upsert({ user_id: sub.user_id, enabled: false }, { onConflict: "user_id" });
  }
  revalidatePath("/admin");
}

/** Change a customer's role. Uses the service role because UPDATE on
 *  profiles.role is revoked from `authenticated` (privilege-level escalation
 *  block); gated by an explicit admin check that throws. */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || (role !== "customer" && role !== "admin")) return;
  const supabase = await createServerSupabase();
  await assertAdminOrThrow(supabase);
  const svc = createServiceClient();
  await svc.from("profiles").update({ role }).eq("id", userId);
  revalidatePath(`/admin/${userId}`);
}

/** Manually enable/disable a customer's bot. bot_settings is owner-only under
 *  RLS, so this uses the service role — gated by an explicit admin check. */
export async function setUserBotAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("user_id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!userId) return;
  const supabase = await createServerSupabase();
  await assertAdminOrThrow(supabase);
  const svc = createServiceClient();
  await svc
    .from("bot_settings")
    .upsert({ user_id: userId, enabled }, { onConflict: "user_id" });
  revalidatePath(`/admin/${userId}`);
}
