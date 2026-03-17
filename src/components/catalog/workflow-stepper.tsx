import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogJobStatus } from "@/lib/database.types";

interface WorkflowStep {
  key: string;
  label: string;
  href: string;
  statuses: CatalogJobStatus[];
}

const STEPS: WorkflowStep[] = [
  { key: "mapping", label: "Column mapping", href: "mapping", statuses: ["parsing", "matching", "uploaded"] },
  { key: "review", label: "Review", href: "review", statuses: ["needs_review"] },
  { key: "preview", label: "Page preview", href: "preview", statuses: ["ready_to_generate"] },
  { key: "generate", label: "Generate", href: "generate", statuses: ["generating_pdf", "ready_to_generate"] },
  { key: "result", label: "Result", href: "result", statuses: ["pdf_ready", "completed", "converting_flipbook"] },
];

const STATUS_STEP_INDEX: Record<CatalogJobStatus, number> = {
  draft: -1,
  uploaded: 0,
  parsing: 0,
  matching: 0,
  needs_review: 1,
  ready_to_generate: 2,
  generating_pdf: 3,
  pdf_ready: 4,
  converting_flipbook: 4,
  completed: 4,
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
    <nav aria-label="Catalog workflow steps" className="flex items-center gap-1 overflow-x-auto pb-0.5 thin-scrollbar">
      {STEPS.map((step, index) => {
        const isCurrent = step.key === currentStep;
        const isCompleted = index < completedUpTo || (index === completedUpTo && !isCurrent && completedUpTo >= 0);
        const isAccessible = index <= completedUpTo + 1 || isCompleted;

        return (
          <div key={step.key} className="flex shrink-0 items-center gap-1">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-6 shrink-0 rounded-full transition-colors",
                  isCompleted ? "bg-brand/60" : "bg-line-strong",
                )}
              />
            )}

            {isAccessible ? (
              <Link
                href={`/catalogs/${jobId}/${step.href}`}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  isCurrent
                    ? "bg-brand text-white shadow-[0_4px_12px_rgba(235,69,41,0.25)]"
                    : isCompleted
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-white/70 text-muted-strong hover:bg-white hover:text-foreground",
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="size-3 shrink-0 text-emerald-600" />
                ) : (
                  <span className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    isCurrent ? "bg-white/25 text-white" : "bg-line text-muted",
                  )}>
                    {index + 1}
                  </span>
                )}
                {step.label}
              </Link>
            ) : (
              <div
                className="flex cursor-not-allowed items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-muted opacity-50"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-line text-[10px] font-bold text-muted">
                  {index + 1}
                </span>
                {step.label}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
