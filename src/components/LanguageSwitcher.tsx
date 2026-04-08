"use client";

import { Globe } from "lucide-react";
import { useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/DictionaryProvider";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/locales";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const [open, setOpen] = useState(false);
  // Ref wraps the ENTIRE component (trigger + dropdown) so clicks
  // inside the dropdown aren't treated as "outside".
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const setLocale = (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOpen(false);
    // Full page reload — ensures the server re-reads the cookie and
    // re-renders the entire component tree with the new dictionary.
    window.location.reload();
  };

  const current = LOCALE_LABELS[currentLocale];

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Change language"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-white"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden font-mono uppercase sm:inline">{currentLocale}</span>
        <span className="sm:hidden">{current.flag}</span>
      </button>

      {open && (
        <>
          {/* Backdrop — closes the dropdown when clicking anywhere else */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-2xl backdrop-blur-xl"
            role="listbox"
          >
            <div className="max-h-[60vh] overflow-y-auto p-1">
              {LOCALES.map((loc) => {
                const label = LOCALE_LABELS[loc];
                const isActive = loc === currentLocale;
                return (
                  <button
                    key={loc}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => setLocale(loc)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors",
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-white",
                    )}
                  >
                    <span className="text-base leading-none">{label.flag}</span>
                    <span className="flex-1 font-medium">{label.native}</span>
                    <span className="font-mono text-[10px] uppercase text-[var(--color-muted)]/70">
                      {loc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
