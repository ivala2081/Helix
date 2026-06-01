import Link from "next/link";
import { redirect } from "next/navigation";
import { AnimatedLogo } from "@/components/brand/AnimatedLogo";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { signOutAction } from "@/lib/auth/actions";

// Authenticated app chrome. Middleware already gates /app and /admin, but we
// re-check here (defense in depth) and load the profile for the nav.
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-4">
            <Link href="/app" aria-label="Helix">
              <AnimatedLogo size={26} />
            </Link>
            <Link
              href="/app"
              className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
            >
              Panel
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-[var(--color-surface)]"
              >
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--color-muted)] sm:inline">
              {profile?.email ?? user.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
              >
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
