import Link from "next/link";
import { AnimatedLogo } from "@/components/brand/AnimatedLogo";

// Minimal centered chrome for login / signup — no marketing nav.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
      <Link href="/" className="relative mb-8 flex items-center" aria-label="Helix">
        <AnimatedLogo size={36} />
      </Link>
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
