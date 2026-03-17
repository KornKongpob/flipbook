import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-2xl border border-line bg-white/80 px-4 pr-10 text-sm text-foreground outline-none ring-0 transition focus:border-brand/40 focus:bg-white",
          className,
        )}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}
