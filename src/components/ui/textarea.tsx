import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-3xl border border-line bg-white/80 px-4 py-3 text-sm text-foreground outline-none ring-0 transition focus:border-brand/40 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}
