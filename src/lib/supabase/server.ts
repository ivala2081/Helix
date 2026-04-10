// Server-side Supabase client (service_role key — bypasses RLS).
// Used by cron worker and warmup script to write portfolio state.

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createServiceClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
