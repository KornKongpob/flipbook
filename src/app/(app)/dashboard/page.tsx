import Link from "next/link";
import { CircleAlert, FilePlus2, FolderKanban, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/catalog/repository";
import { JOB_STATUS_META } from "@/lib/catalog/constants";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatCompactNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);

  const metrics = [
    {
      label: "Total jobs",
      value: formatCompactNumber(summary.jobs.length),
      icon: FolderKanban,
    },
    {
      label: "Needs review",
      value: formatCompactNumber(summary.counts.needs_review ?? 0),
      icon: CircleAlert,
    },
    {
      label: "Ready / PDF ready",
      value: formatCompactNumber(
        (summary.counts.ready_to_generate ?? 0) + (summary.counts.pdf_ready ?? 0),
      ),
      icon: Sparkles,
    },
  ];

  return (
    <>
      <Card className="overflow-hidden rounded-[34px] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Dashboard"
            title="Keep the catalog pipeline moving."
            description="Track active jobs, jump back into manual review, and start the next promotional catalog without leaving this workspace."
          />
          <Link href="/catalogs/new" className={buttonClassName("primary")}>
            <FilePlus2 className="mr-2 size-4" />
            Create new catalog
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="rounded-[28px] border border-line bg-white/75 p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted">{metric.label}</p>
                  <div className="rounded-2xl bg-brand-soft p-3 text-brand">
                    <Icon className="size-5" />
                  </div>
                </div>
                <p className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[34px] p-6">
          <SectionHeading
            title="Recent jobs"
            description="The latest imports, review queues, and output-ready runs."
          />

          <div className="mt-6 overflow-hidden rounded-[28px] border border-line">
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-white/80 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Rows</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white/60">
                {summary.jobs.length ? (
                  summary.jobs.map((job) => {
                    const meta = JOB_STATUS_META[job.status];

                    return (
                      <tr key={job.id}>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-foreground">{job.job_name}</p>
                            <p className="text-xs text-muted">{job.source_file_name || "Manual draft"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-4 text-muted-strong">{job.parsed_row_count}</td>
                        <td className="px-4 py-4 text-muted-strong">
                          {new Date(job.updated_at).toLocaleDateString("th-TH")}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={
                              job.status === "pdf_ready" || job.status === "completed"
                                ? `/catalogs/${job.id}/result`
                                : job.status === "needs_review"
                                  ? `/catalogs/${job.id}/review`
                                  : `/catalogs/${job.id}/preview`
                            }
                            className="text-sm font-semibold text-brand"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      No catalog jobs yet. Start by uploading your first Excel sheet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-[34px] p-6">
          <SectionHeading
            title="Template shortcuts"
            description="Choose a base layout before import. These are seeded in Supabase and can be extended later."
          />

          <div className="mt-6 space-y-4">
            {summary.templates.map((template) => (
              <div
                key={template.id}
                className="rounded-[28px] border border-line bg-white/70 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl font-semibold text-foreground">
                      {template.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {template.variant} • {template.columns}x{template.rows} grid
                    </p>
                  </div>
                  <Badge tone="success">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
