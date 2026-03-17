import Link from "next/link";
import { ArrowRight, CircleAlert, FilePlus2, FolderKanban, LayoutGrid, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/catalog/repository";
import { JOB_STATUS_META } from "@/lib/catalog/constants";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatCompactNumber } from "@/lib/utils";

function getJobHref(job: { id: string; status: string }) {
  if (job.status === "pdf_ready" || job.status === "completed") return `/catalogs/${job.id}/result`;
  if (job.status === "needs_review") return `/catalogs/${job.id}/review`;
  if (job.status === "ready_to_generate" || job.status === "generating_pdf") return `/catalogs/${job.id}/generate`;
  if (job.status === "parsing" || job.status === "matching" || job.status === "uploaded") return `/catalogs/${job.id}/mapping`;
  return `/catalogs/${job.id}/preview`;
}

function getJobActionLabel(status: string): string {
  if (status === "pdf_ready" || status === "completed") return "View result";
  if (status === "needs_review") return "Review now";
  if (status === "ready_to_generate") return "Generate PDF";
  if (status === "generating_pdf") return "View progress";
  if (status === "parsing" || status === "matching" || status === "uploaded") return "View mapping";
  return "Continue";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);

  const needsReview = summary.counts.needs_review ?? 0;
  const readyCount = (summary.counts.ready_to_generate ?? 0) + (summary.counts.pdf_ready ?? 0);

  const metrics = [
    {
      label: "Total jobs",
      value: formatCompactNumber(summary.jobs.length),
      icon: FolderKanban,
      tone: "neutral" as const,
    },
    {
      label: "Needs review",
      value: formatCompactNumber(needsReview),
      icon: CircleAlert,
      tone: needsReview > 0 ? ("warning" as const) : ("neutral" as const),
    },
    {
      label: "Ready to export",
      value: formatCompactNumber(readyCount),
      icon: Sparkles,
      tone: readyCount > 0 ? ("success" as const) : ("neutral" as const),
    },
  ];

  const toneIconColors = {
    neutral: "bg-brand-soft text-brand",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
  };

  return (
    <>
      <Card className="overflow-hidden rounded-[34px] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Dashboard"
            title="Keep the catalog pipeline moving."
            description="Track active jobs, jump into manual review, and start the next promotional catalog."
          />
          <Link href="/catalogs/new" className={buttonClassName("primary")}>
            <FilePlus2 className="mr-2 size-4" />
            New catalog
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-[26px] border border-line bg-white/75 p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted">{metric.label}</p>
                  <div className={`rounded-xl p-2.5 ${toneIconColors[metric.tone]}`}>
                    <Icon className="size-4" />
                  </div>
                </div>
                <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-[34px] p-6">
          <div className="flex items-center justify-between">
            <SectionHeading
              title="Recent jobs"
              description="Latest imports, review queues, and output-ready runs."
            />
          </div>

          <div className="mt-6 space-y-2">
            {summary.jobs.length ? (
              summary.jobs.map((job) => {
                const meta = JOB_STATUS_META[job.status];
                const href = getJobHref(job);
                const actionLabel = getJobActionLabel(job.status);

                return (
                  <div
                    key={job.id}
                    className="flex items-center gap-4 rounded-[22px] border border-line bg-white/70 px-4 py-3 transition hover:bg-white/90"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                        <FolderKanban className="size-4 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{job.job_name}</p>
                        <p className="text-xs text-muted">
                          {job.source_file_name || "Manual draft"} · {job.parsed_row_count} rows · {new Date(job.updated_at).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <Link
                        href={href}
                        className="flex items-center gap-1 text-xs font-semibold text-brand transition hover:text-brand-strong"
                      >
                        {actionLabel}
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-line bg-white/50 px-6 py-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <FolderKanban className="size-5" />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">No catalog jobs yet</p>
                <p className="mt-1 text-sm text-muted">Upload your first Excel sheet to get started.</p>
                <Link href="/catalogs/new" className={`${buttonClassName("primary")} mt-4`}>
                  Create first catalog
                </Link>
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[34px] p-6">
          <SectionHeading
            eyebrow="Templates"
            title="Available layouts"
            description="Seeded templates used when creating new catalog jobs."
          />

          <div className="mt-6 space-y-3">
            {summary.templates.length ? (
              summary.templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center gap-3 rounded-[22px] border border-line bg-white/70 p-4"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <LayoutGrid className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{template.name}</p>
                    <p className="text-xs text-muted">
                      {template.variant} · {template.columns}×{template.rows} grid
                    </p>
                  </div>
                  <Badge tone="success" className="ml-auto shrink-0">Active</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No templates seeded yet.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
