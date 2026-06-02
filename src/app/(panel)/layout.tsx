import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
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
  const email = profile?.email ?? user.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[var(--color-bg)]/70 backdrop-blur-xl">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-1">
            <Link href="/app" className="mr-2 flex items-center" aria-label="Helix">
              <AnimatedLogo size={26} />
            </Link>
            <NavLink href="/app">Panel</NavLink>
            {isAdmin && (
              <NavLink href="/admin" accent>
                Admin
              </NavLink>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
                {initial}
              </div>
              <span className="max-w-[180px] truncate text-xs text-[var(--color-muted)]">
                {email}
              </span>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Çıkış"
                title="Çıkış"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[var(--color-muted)] transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
  accent,
}: {
  href: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        accent
          ? "text-amber-300 hover:bg-amber-500/10"
          : "text-[var(--color-muted)] hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
