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
  { key: "mapping", label: "Mapping", href: "mapping" },
  { key: "review", label: "Review", href: "review" },
  { key: "preview", label: "Preview", href: "preview" },
  { key: "generate", label: "Generate", href: "generate" },
  { key: "result", label: "Result", href: "result" },
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
    <nav aria-label="Catalog workflow" className="flex items-center gap-0 overflow-x-auto thin-scrollbar">
      {STEPS.map((step, index) => {
        const isCurrent = step.key === currentStep;
        const isCompleted = index < completedUpTo || (index === completedUpTo && !isCurrent && completedUpTo >= 0);
        const isAccessible = index <= completedUpTo + 1 || isCompleted;

        const inner = isAccessible ? (
          <Link
            href={`/catalogs/${jobId}/${step.href}`}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors",
              isCurrent
                ? "text-brand"
                : isCompleted
                  ? "text-success hover:text-success/80"
                  : "text-muted-strong hover:text-foreground",
            )}
          >
            <span className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border transition-colors",
              isCurrent
                ? "border-brand bg-brand text-white"
                : isCompleted
                  ? "border-success bg-success text-white"
                  : "border-line bg-white text-muted",
            )}>
              {isCompleted && !isCurrent ? <Check className="size-2.5" /> : index + 1}
            </span>
            {step.label}
          </Link>
        ) : (
          <span className="flex cursor-not-allowed items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-medium text-muted opacity-40">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-white text-[10px] font-bold text-muted">
              {index + 1}
            </span>
            {step.label}
          </span>
        );

        return (
          <div key={step.key} className="flex items-center">
            {index > 0 && <div className="h-px w-4 shrink-0 bg-line" />}
            {inner}
          </div>
        );
      })}
    </nav>
  );
}
