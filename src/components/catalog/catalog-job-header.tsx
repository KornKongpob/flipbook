import type { ReactNode } from "react";
import { JOB_STATUS_META } from "@/lib/catalog/constants";
import type { CatalogJobStatus } from "@/lib/database.types";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

interface CatalogJobMetric {
  label: string;
  value: ReactNode;
}

interface CatalogJobHeaderProps {
  actions?: ReactNode;
  currentStep: "review" | "master-card" | "page-design" | "generate" | "result";
  description: string;
  eyebrow?: string;
  jobId: string;
  jobName: string;
  jobStatus: CatalogJobStatus;
  metrics?: CatalogJobMetric[];
  notice?: ReactNode;
  title: string;
}

export function CatalogJobHeader({
  actions,
  currentStep,
  description,
  eyebrow = "Catalog workflow",
  jobId,
  jobName,
  jobStatus,
  metrics = [],
  notice,
  title,
}: CatalogJobHeaderProps) {
  const meta = JOB_STATUS_META[jobStatus];

  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-foreground">{jobName}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <span className="inline-flex items-center rounded-full border border-line bg-white/70 px-2.5 py-1 text-xs font-medium text-muted-strong">
                Workflow in progress
              </span>
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto thin-scrollbar">
            <WorkflowStepper jobId={jobId} currentStep={currentStep} jobStatus={jobStatus} />
          </div>
        </div>

        {metrics.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {metric.label}
                </p>
                <div className="mt-2 text-base font-semibold text-foreground">{metric.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {notice ? <div>{notice}</div> : null}
      </div>
    </PageHeader>
  );
}
