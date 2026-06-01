import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

// Role gate: only profiles.role = 'admin' may enter /admin. Belt-and-suspenders
// on top of the middleware login check and the RLS admin policies.
export default async function AdminLayout({
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
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/app");

  return <>{children}</>;
}
