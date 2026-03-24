import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
}

export function PageHeader({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl glass-panel px-6 py-5", className)}>
      <div className="absolute -right-12 top-0 size-36 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-0 size-28 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong/90">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-strong">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex w-full min-w-0 flex-wrap items-start gap-2 lg:w-auto lg:max-w-[52%] lg:shrink-0 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {children ? <div className="relative z-10 mt-5">{children}</div> : null}
    </div>
  );
}
