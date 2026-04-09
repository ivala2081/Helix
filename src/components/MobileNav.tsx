"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Github, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type Nav = Dictionary["nav"];

export function MobileNav({ nav }: { nav: Nav }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while open. Critical for iOS.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white sm:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              aria-hidden
              className="fixed inset-0 top-14 z-40 bg-black/70 sm:hidden"
            />
            <motion.nav
              key="mobile-nav-sheet"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              className="fixed inset-x-0 top-14 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)] sm:hidden"
            >
              <div className="flex flex-col px-4 py-3">
                <Link
                  href="/"
                  className="flex h-12 items-center rounded-md px-3 text-base text-white hover:bg-[var(--color-surface)]"
                >
                  {nav.home}
                </Link>
                <Link
                  href="/backtest"
                  className="flex h-12 items-center rounded-md px-3 text-base text-white hover:bg-[var(--color-surface)]"
                >
                  {nav.backtest}
                </Link>
                <Link
                  href="/about"
                  className="flex h-12 items-center rounded-md px-3 text-base text-white hover:bg-[var(--color-surface)]"
                >
                  {nav.about}
                </Link>
                <Link
                  href="/changelog"
                  className="flex h-12 items-center rounded-md px-3 text-base text-white hover:bg-[var(--color-surface)]"
                >
                  {nav.changelog}
                </Link>
                <a
                  href="https://github.com/ivala2081/Helix"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex h-12 items-center gap-3 rounded-md border border-[var(--color-border)] px-3 text-sm text-[var(--color-muted)] hover:text-white"
                >
                  <Github className="h-4 w-4" />
                  {nav.github}
                </a>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
