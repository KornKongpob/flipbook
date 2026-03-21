import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/ui/surface-card";

interface StatCardProps {
  className?: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: string;
}

export function StatCard({
  className,
  hint,
  icon: Icon,
  iconClassName,
  label,
  value,
}: StatCardProps) {
  return (
    <SurfaceCard className={cn("card-hover p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-sky-400/10">
          <Icon className={cn("size-4 text-brand", iconClassName)} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </SurfaceCard>
  );
}
