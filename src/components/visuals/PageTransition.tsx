"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

// `mode="sync"` lets the new page render immediately while the old one
// fades out, removing the ~200ms wait that `mode="wait"` introduces on
// every navigation. The exit animation is short enough that overlap is
// imperceptible.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
