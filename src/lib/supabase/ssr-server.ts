// Server-side Supabase client with the logged-in user's session (cookie-based).
// Use in Server Components, Server Actions, and Route Handlers. RLS applies —
// the user only sees their own rows. For privileged writes use createServiceClient.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component (read-only cookie store) this throws; that's
          // fine — the middleware refreshes the session cookie instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from a Server Component — safe to ignore */
          }
        },
      },
    },
  );
}
