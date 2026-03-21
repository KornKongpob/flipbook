import Link from "next/link";
import { ArrowRight, FilePlus2, FolderKanban, AlertCircle, CheckCircle2, LayoutGrid, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/catalog/repository";
import { JOB_STATUS_META } from "@/lib/catalog/constants";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { formatCompactNumber } from "@/lib/utils";

function getJobHref(job: { id: string; status: string }) {
  if (job.status === "pdf_ready" || job.status === "completed") return `/catalogs/${job.id}/result`;
  if (job.status === "needs_review") return `/catalogs/${job.id}/review`;
  if (job.status === "ready_to_generate" || job.status === "generating_pdf") return `/catalogs/${job.id}/result`;
  if (job.status === "parsing" || job.status === "matching" || job.status === "uploaded") return `/catalogs/${job.id}/matching`;
  return `/catalogs/${job.id}/editor`;
}

function getJobActionLabel(status: string): string {
  if (status === "pdf_ready" || status === "completed") return "View result";
  if (status === "needs_review") return "Review now";
  if (status === "ready_to_generate") return "Generate PDF";
  if (status === "generating_pdf") return "Generating…";
  if (status === "parsing" || status === "matching") return "Matching…";
  return "Continue";
}

const statusDotClass: Record<string, string> = {
  needs_review: "status-dot-warning",
  ready_to_generate: "status-dot-brand",
  generating_pdf: "status-dot-brand",
  pdf_ready: "status-dot-success",
  completed: "status-dot-success",
  failed: "status-dot-danger",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);

  const needsReview = summary.counts.needs_review ?? 0;
  const readyCount = (summary.counts.ready_to_generate ?? 0) + (summary.counts.pdf_ready ?? 0);
  const completedCount = summary.counts.completed ?? 0;

  const metrics = [
    { label: "Total Jobs", value: formatCompactNumber(summary.jobs.length), icon: FolderKanban, gradient: "from-brand/10 to-purple-500/10", iconColor: "text-brand" },
    { label: "Needs Review", value: formatCompactNumber(needsReview), icon: AlertCircle, gradient: "from-amber-500/10 to-orange-500/10", iconColor: "text-amber-500" },
    { label: "Ready to Export", value: formatCompactNumber(readyCount), icon: CheckCircle2, gradient: "from-emerald-500/10 to-teal-500/10", iconColor: "text-emerald-500" },
    { label: "Completed", value: formatCompactNumber(completedCount), icon: CheckCircle2, gradient: "from-sky-500/10 to-blue-500/10", iconColor: "text-sky-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl glass-panel px-6 py-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-strong">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Catalog Pipeline</h1>
            <p className="mt-1 text-sm text-muted-strong">Manage your product catalogs and generate print-ready PDFs.</p>
          </div>
          <Link href="/catalogs/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-md shadow-brand/20 transition hover:bg-brand-strong active:scale-[0.98]">
            <FilePlus2 className="size-4" />
            New Catalog
          </Link>
        </div>
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 size-40 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card-hover rounded-xl border border-line bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted">{m.label}</p>
                <div className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${m.gradient}`}>
                  <Icon className={`size-4 ${m.iconColor}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{m.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Jobs list */}
        <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Recent Jobs</h2>
            <span className="text-xs text-muted">{summary.jobs.length} total</span>
          </div>
          <div className="divide-y divide-line">
            {summary.jobs.length ? (
              summary.jobs.map((job) => {
                const meta = JOB_STATUS_META[job.status];
                const href = getJobHref(job);
                const actionLabel = getJobActionLabel(job.status);
                const dotClass = statusDotClass[job.status] ?? "status-dot-neutral";
                return (
                  <Link key={job.id} href={href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-soft/30 group">
                    <span className={`status-dot ${dotClass}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-brand transition-colors">{job.job_name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                        <span>{job.parsed_row_count} items</span>
                        <span className="text-line-strong">·</span>
                        <Clock className="size-3" />
                        <span>{new Date(job.updated_at).toLocaleDateString("th-TH")}</span>
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span className="flex items-center gap-1 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
                      {actionLabel} <ArrowRight className="size-3" />
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <FolderKanban className="size-6 text-brand" />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">No catalog jobs yet</p>
                <p className="mt-1 text-sm text-muted">Create your first catalog to get started.</p>
                <Link href="/catalogs/new" className={`${buttonClassName("primary")} mt-5 inline-flex`}>
                  Create first catalog
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Templates */}
        <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Templates</h2>
            <p className="text-xs text-muted mt-0.5">Available page layouts</p>
          </div>
          <div className="divide-y divide-line">
            {summary.templates.length ? (
              summary.templates.map((template) => (
                <div key={template.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-brand-soft">
                    <LayoutGrid className="size-4 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{template.name}</p>
                    <p className="text-xs text-muted">{template.variant} · {template.columns}×{template.rows} grid</p>
                  </div>
                  <Badge tone="success">Active</Badge>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-muted text-center">No templates seeded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
