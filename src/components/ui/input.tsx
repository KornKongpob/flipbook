import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-line bg-white/80 px-4 text-sm text-foreground outline-none ring-0 transition focus:border-brand/40 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}
