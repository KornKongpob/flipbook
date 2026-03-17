import Link from "next/link";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/catalog/repository";
import { JOB_STATUS_META } from "@/lib/catalog/constants";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
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
  if (status === "needs_review") return "Review";
  if (status === "ready_to_generate") return "Generate";
  if (status === "generating_pdf") return "Progress";
  return "Continue";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);

  const needsReview = summary.counts.needs_review ?? 0;
  const readyCount = (summary.counts.ready_to_generate ?? 0) + (summary.counts.pdf_ready ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted">Your catalog pipeline</p>
        </div>
        <Link href="/catalogs/new" className={buttonClassName("primary")}>
          <FilePlus2 className="mr-1.5 size-3.5" />
          New catalog
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total jobs", value: formatCompactNumber(summary.jobs.length), color: "text-foreground" },
          { label: "Needs review", value: formatCompactNumber(needsReview), color: needsReview > 0 ? "text-amber-600" : "text-foreground" },
          { label: "Ready to export", value: formatCompactNumber(readyCount), color: readyCount > 0 ? "text-success" : "text-foreground" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-line bg-card p-4">
            <p className="text-xs text-muted">{m.label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Jobs list */}
        <div className="rounded-xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent jobs</h2>
          </div>
          <div className="divide-y divide-line">
            {summary.jobs.length ? (
              summary.jobs.map((job) => {
                const meta = JOB_STATUS_META[job.status];
                const href = getJobHref(job);
                const actionLabel = getJobActionLabel(job.status);
                return (
                  <div key={job.id} className="flex items-center gap-3 px-4 py-3 hover:bg-background/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{job.job_name}</p>
                      <p className="text-xs text-muted">
                        {job.parsed_row_count} rows · {new Date(job.updated_at).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <Link href={href} className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-strong shrink-0">
                      {actionLabel} <ArrowRight className="size-3" />
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted">No jobs yet.</p>
                <Link href="/catalogs/new" className={`${buttonClassName("primary")} mt-3 inline-flex`}>
                  Create first catalog
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Templates */}
        <div className="rounded-xl border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Templates</h2>
          </div>
          <div className="divide-y divide-line">
            {summary.templates.length ? (
              summary.templates.map((template) => (
                <div key={template.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{template.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{template.variant} · {template.columns}×{template.rows}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-muted">No templates seeded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
