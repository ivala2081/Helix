import { cn } from "@/lib/utils/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 sm:h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-base sm:text-sm text-white outline-none transition-colors placeholder:text-[var(--color-muted)]/60 focus:border-emerald-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]"
    >
      {children}
    </label>
  );
}
