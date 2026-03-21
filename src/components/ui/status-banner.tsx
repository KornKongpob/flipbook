import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBannerTone = "brand" | "danger" | "success" | "warning";

const toneClasses: Record<StatusBannerTone, string> = {
  brand: "border-brand/20 bg-brand-soft/60 text-brand-strong",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const toneIcons = {
  brand: Info,
  danger: AlertCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
} satisfies Record<StatusBannerTone, typeof Info>;

interface StatusBannerProps {
  className?: string;
  description?: ReactNode;
  title: string;
  tone?: StatusBannerTone;
}

export function StatusBanner({
  className,
  description,
  title,
  tone = "brand",
}: StatusBannerProps) {
  const Icon = toneIcons[tone];

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", toneClasses[tone], className)}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description ? <div className="mt-1 text-sm opacity-90">{description}</div> : null}
      </div>
    </div>
  );
}
