import { cn } from "@/lib/utils/cn";
import { forwardRef, type SelectHTMLAttributes } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 sm:h-10 w-full appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-base sm:text-sm text-white outline-none transition-colors focus:border-emerald-500",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
