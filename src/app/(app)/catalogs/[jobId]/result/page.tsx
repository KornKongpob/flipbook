import { duplicateJobAction } from "@/app/(app)/actions";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle, getLatestPdfFile } from "@/lib/catalog/repository";

export default async function CatalogResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { jobId } = await params;
  const resolvedSearchParams = await searchParams;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);
  const latestPdf = getLatestPdfFile(bundle.files);
  const errorMessage = resolvedSearchParams.error
    ? decodeURIComponent(resolvedSearchParams.error)
    : bundle.job.error_message;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-4">
        <WorkflowStepper jobId={jobId} currentStep="result" jobStatus={bundle.job.status} />
        <h1 className="mt-3 text-base font-semibold text-foreground">Result</h1>
        {errorMessage && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pages", value: bundle.job.page_count || "—" },
          { label: "Matched rows", value: bundle.job.matched_row_count },
          { label: "Review required", value: bundle.job.review_required_count },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-card p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Files */}
        <div className="rounded-xl border border-line bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Files</p>

          {latestPdf ? (
            <div className="rounded-lg border border-line p-4">
              <p className="text-sm font-medium text-foreground">Latest PDF</p>
              <p className="mt-0.5 text-xs text-muted truncate">{latestPdf.storage_path}</p>
              <a
                href={`/api/files/${latestPdf.id}/download`}
                className="mt-3 inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white"
              >
                Download PDF
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted">No PDF generated yet.</p>
          )}

          {bundle.job.flipbook_mode !== "disabled" && (
            <form action={`/api/jobs/${jobId}/flipbook`} method="post" className="rounded-lg border border-line p-4">
              <p className="text-sm font-medium text-foreground">Flipbook</p>
              <Button className="mt-3 h-8 px-3 text-sm">Convert to flipbook</Button>
            </form>
          )}
        </div>

        {/* Next actions */}
        <div className="rounded-xl border border-line bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Next actions</p>

          {bundle.flipbook?.flipbook_url ? (
            <a
              href={bundle.flipbook.flipbook_url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-line p-4 text-sm font-medium text-brand hover:bg-brand-soft/20 transition-colors"
            >
              Open flipbook ↗
            </a>
          ) : (
            <p className="text-sm text-muted">No flipbook URL yet.</p>
          )}

          <form action={duplicateJobAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <Button variant="secondary" className="w-full">Duplicate job</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
