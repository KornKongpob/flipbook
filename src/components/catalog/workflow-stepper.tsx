import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogJobStatus } from "@/lib/database.types";

interface WorkflowStep {
  key: string;
  label: string;
  href: string;
}

const STEPS: WorkflowStep[] = [
  { key: "matching", label: "Matching", href: "matching" },
  { key: "review", label: "Review", href: "review" },
  { key: "editor", label: "Editor", href: "editor" },
  { key: "result", label: "Result", href: "result" },
];

const STATUS_STEP_INDEX: Record<CatalogJobStatus, number> = {
  draft: -1,
  uploaded: 0,
  parsing: 0,
  matching: 0,
  needs_review: 1,
  ready_to_generate: 2,
  generating_pdf: 2,
  pdf_ready: 3,
  converting_flipbook: 3,
  completed: 3,
  failed: -1,
  cancelled: -1,
};

interface WorkflowStepperProps {
  jobId: string;
  currentStep: WorkflowStep["key"];
  jobStatus: CatalogJobStatus;
}

export function WorkflowStepper({ jobId, currentStep, jobStatus }: WorkflowStepperProps) {
  const completedUpTo = STATUS_STEP_INDEX[jobStatus];

  return (
    <nav aria-label="Catalog workflow" className="flex items-center gap-0 overflow-x-auto thin-scrollbar py-1">
      {STEPS.map((step, index) => {
        const isCurrent = step.key === currentStep;
        const isCompleted = index < completedUpTo || (index === completedUpTo && !isCurrent && completedUpTo >= 0);
        const isAccessible = index <= completedUpTo + 1 || isCompleted;

        const inner = isAccessible ? (
          <Link
            href={`/catalogs/${jobId}/${step.href}`}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "group flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-150",
              isCurrent
                ? "border-brand/20 bg-brand-soft/80 text-brand shadow-sm"
                : isCompleted
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-50"
                  : "border-line/80 bg-white/70 text-muted-strong hover:border-brand/20 hover:bg-white hover:text-foreground",
            )}
          >
            <span className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all",
              isCurrent
                ? "bg-brand text-white shadow-sm"
                : isCompleted
                  ? "bg-success text-white"
                  : "bg-gray-100 text-muted group-hover:bg-brand-soft group-hover:text-brand",
            )}>
              {isCompleted && !isCurrent ? <Check className="size-2.5" /> : index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </Link>
        ) : (
          <span className="flex cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl border border-line/60 bg-white/40 px-3 py-2 text-xs font-semibold text-muted/40">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-muted/40">
              {index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </span>
        );

        return (
          <div key={step.key} className="flex items-center">
            {index > 0 && (
              <div className={cn(
                "mx-1 h-px w-5 shrink-0 transition-colors",
                isCompleted ? "bg-emerald-300/80" : "bg-line/90",
              )} />
            )}
            {inner}
          </div>
        );
      })}
    </nav>
  );
}
