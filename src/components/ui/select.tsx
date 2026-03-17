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
          "h-9 w-full appearance-none rounded-lg border border-line bg-white px-3 pr-9 text-sm text-foreground outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20",
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
