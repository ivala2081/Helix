"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface Section {
  id: string;
  label: string;
}

export function AnchorTOC({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibility = new Map<string, number>();

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          visibility.set(s.id, entry.intersectionRatio);
          // Pick whichever section is currently most-visible
          let best = "";
          let bestRatio = 0;
          for (const [id, ratio] of visibility) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = id;
            }
          }
          if (best) setActiveId(best);
        },
        { rootMargin: "-100px 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  return (
    <nav className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-muted)]">
        On this page
      </div>
      <ul className="mt-3 space-y-1.5 border-l border-[var(--color-border)]">
        {sections.map((s) => {
          const isActive = activeId === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "-ml-px block border-l-2 px-3 py-1 text-sm transition-all",
                  isActive
                    ? "border-emerald-500 font-medium text-white"
                    : "border-transparent text-[var(--color-muted)] hover:text-white",
                )}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
