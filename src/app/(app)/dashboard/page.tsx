import Link from "next/link";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  FilePlus2,
  FolderKanban,
  LayoutGrid,
  PlayCircle,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/catalog/repository";
import { JOB_STATUS_META } from "@/lib/catalog/constants";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";
import { formatCompactNumber } from "@/lib/utils";

function getJobHref(job: { id: string; status: string }) {
  if (job.status === "pdf_ready" || job.status === "completed") return `/catalogs/${job.id}/result`;
  if (job.status === "needs_review") return `/catalogs/${job.id}/review`;
  if (job.status === "generating_pdf") return `/catalogs/${job.id}/result`;
  if (job.status === "parsing" || job.status === "matching" || job.status === "uploaded") return `/catalogs/${job.id}/matching`;
  return `/catalogs/${job.id}/editor`;
}

function getJobActionLabel(status: string): string {
  if (status === "pdf_ready" || status === "completed") return "View result";
  if (status === "needs_review") return "Review now";
  if (status === "ready_to_generate") return "Open editor";
  if (status === "generating_pdf") return "View export";
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
  const activeCount = summary.jobs.filter((job) => !["completed", "cancelled", "failed"].includes(job.status)).length;
  const attentionJobs = summary.jobs.filter((job) => ["needs_review", "ready_to_generate", "generating_pdf"].includes(job.status));

  const metrics = [
    {
      label: "Active jobs",
      value: formatCompactNumber(activeCount),
      hint: `${summary.jobs.length} total in workspace`,
      icon: FolderKanban,
      iconClassName: "text-brand",
    },
    {
      label: "Needs review",
      value: formatCompactNumber(needsReview),
      hint: needsReview ? "Low-confidence matches need attention" : "No review blockers right now",
      icon: AlertCircle,
      iconClassName: "text-amber-500",
    },
    {
      label: "Ready to export",
      value: formatCompactNumber(readyCount),
      hint: "Ready for PDF generation or download",
      icon: PlayCircle,
      iconClassName: "text-emerald-500",
    },
    {
      label: "Completed",
      value: formatCompactNumber(completedCount),
      hint: "Finished catalogs and flipbooks",
      icon: CheckCircle2,
      iconClassName: "text-sky-500",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Workspace overview"
        title="Catalog operations"
        description="Track which jobs need attention, jump back into active workflows, and launch the next catalog without hunting through the app."
        actions={
          <Link href="/catalogs/new" className={buttonClassName("primary", "h-10 gap-2")}>
            <FilePlus2 className="size-4" />
            New Catalog
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Attention queue</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {attentionJobs.length ? `${attentionJobs.length} job(s) need action` : "All workflows are moving"}
            </p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Review workload</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {needsReview ? `${needsReview} job(s) waiting for image review` : "No review bottleneck"}
            </p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Export readiness</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {readyCount ? `${readyCount} job(s) can export now` : "Nothing waiting to export"}
            </p>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          return (
            <StatCard
              key={m.label}
              label={m.label}
              value={m.value}
              hint={m.hint}
              icon={m.icon}
              iconClassName={m.iconClassName}
            />
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <SurfaceCard className="overflow-hidden">
          <SurfaceCardHeader className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent jobs</h2>
              <p className="mt-1 text-xs text-muted">Jump back into the latest catalog workflows.</p>
            </div>
            <span className="text-xs text-muted">{summary.jobs.length} total</span>
          </SurfaceCardHeader>

          <div className="divide-y divide-line">
            {summary.jobs.length ? (
              summary.jobs.map((job) => {
                const meta = JOB_STATUS_META[job.status];
                const href = getJobHref(job);
                const actionLabel = getJobActionLabel(job.status);
                const dotClass = statusDotClass[job.status] ?? "status-dot-neutral";
                return (
                  <Link key={job.id} href={href} className="group grid gap-3 px-5 py-4 transition-colors hover:bg-brand-soft/20 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`status-dot ${dotClass}`} />
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
                          {job.job_name}
                        </p>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{job.parsed_row_count} items</span>
                        <span className="text-line-strong">·</span>
                        <Clock className="size-3" />
                        <span>Updated {new Date(job.updated_at).toLocaleDateString("th-TH")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-brand sm:justify-end">
                      <span className="rounded-full border border-brand/20 bg-white/80 px-3 py-1">
                        {actionLabel}
                      </span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState
                icon={FolderKanban}
                title="No catalog jobs yet"
                description="Create your first catalog to start matching products and building print-ready PDFs."
                action={<Link href="/catalogs/new" className={buttonClassName("primary")}>Create first catalog</Link>}
              />
            )}
          </div>
        </SurfaceCard>

        <div className="space-y-5">
          <SurfaceCard>
            <SurfaceCardHeader>
              <h2 className="text-sm font-semibold text-foreground">Next best actions</h2>
              <p className="mt-1 text-xs text-muted">Focus the team on the jobs that unblock delivery fastest.</p>
            </SurfaceCardHeader>
            <SurfaceCardBody className="space-y-3">
              <div className="rounded-xl border border-line bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Review queue</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {needsReview ? `${needsReview} job(s) still need image review` : "No jobs waiting on review"}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Export queue</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {readyCount ? `${readyCount} job(s) can generate or download PDF` : "No jobs queued for export"}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Completed</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {completedCount ? `${completedCount} completed catalog(s)` : "No completed jobs yet"}
                </p>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <SurfaceCardHeader>
              <h2 className="text-sm font-semibold text-foreground">Templates</h2>
              <p className="mt-1 text-xs text-muted">Available page layouts for the next catalog.</p>
            </SurfaceCardHeader>
            <div className="divide-y divide-line">
              {summary.templates.length ? (
                summary.templates.map((template) => (
                  <div key={template.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-brand-soft">
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
                <EmptyState
                  icon={LayoutGrid}
                  title="No templates seeded"
                  description="Add at least one layout template to start creating new catalog jobs."
                />
              )}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
