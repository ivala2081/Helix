import Link from "next/link";
import { AnimatedLogo } from "@/components/brand/AnimatedLogo";

// Minimal centered chrome for login / signup — no marketing nav.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center text-white" aria-label="Helix">
        <AnimatedLogo size={36} />
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}
