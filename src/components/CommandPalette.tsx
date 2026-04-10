"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Github,
  Home,
  LineChart,
  Search,
} from "lucide-react";

// Cmd-K / Ctrl-K command palette. Listens for the keyboard shortcut globally.
// Each item navigates to a route, optionally with a query string to pre-fill
// the backtest form.

const ITEMS: {
  group: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  hint?: string;
}[] = [
  { group: "Navigate", label: "Home", icon: <Home className="h-4 w-4" />, href: "/" },
  {
    group: "Navigate",
    label: "Backtest",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/backtest",
  },
  {
    group: "Navigate",
    label: "Forward Test",
    icon: <Activity className="h-4 w-4" />,
    href: "/live",
  },
  {
    group: "Navigate",
    label: "About",
    icon: <Activity className="h-4 w-4" />,
    href: "/about",
  },
  {
    group: "Quick run",
    label: "Run BTCUSDT 1H · 2023→today",
    icon: <LineChart className="h-4 w-4" />,
    href: "/backtest?symbol=BTCUSDT&interval=1h&start=2023-01-01",
    hint: "V5",
  },
  {
    group: "Quick run",
    label: "Run ETHUSDT 1H · 2023→today",
    icon: <LineChart className="h-4 w-4" />,
    href: "/backtest?symbol=ETHUSDT&interval=1h&start=2023-01-01",
    hint: "V5",
  },
  {
    group: "Quick run",
    label: "Run SOLUSDT 1H · 2023→today",
    icon: <LineChart className="h-4 w-4" />,
    href: "/backtest?symbol=SOLUSDT&interval=1h&start=2023-01-01",
    hint: "V5",
  },
  {
    group: "External",
    label: "GitHub repository",
    icon: <Github className="h-4 w-4" />,
    href: "https://github.com/ivala2081/Helix",
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onSelect = (href: string) => {
    setOpen(false);
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      router.push(href);
    }
  };

  if (!open) return null;

  // Group items
  const groups = ITEMS.reduce<Record<string, typeof ITEMS>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div
        className="relative w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="cmdk">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--color-muted)]" />
            <Command.Input
              autoFocus
              placeholder="Search or jump to…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--color-muted)]/70"
            />
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-muted)]">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--color-muted)]">
              No results
            </Command.Empty>
            {Object.entries(groups).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]/80"
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.label}
                    value={item.label}
                    onSelect={() => onSelect(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-white aria-selected:bg-emerald-500/15 aria-selected:text-emerald-300"
                  >
                    <span className="text-[var(--color-muted)]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.hint && (
                      <span className="rounded bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-muted)]">
                        {item.hint}
                      </span>
                    )}
                    <ArrowRight className="h-3 w-3 text-[var(--color-muted)]/40" />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-[10px] text-[var(--color-muted)]">
            <span>
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono">↑↓</kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono">↵</kbd>{" "}
              select
            </span>
            <span>
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5 font-mono">⌘K</kbd>{" "}
              toggle
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
