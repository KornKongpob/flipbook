import { duplicateJobAction } from "@/app/(app)/actions";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
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
    <div className="space-y-6">
      <Card className="rounded-[34px] p-8">
        <WorkflowStepper jobId={jobId} currentStep="result" jobStatus={bundle.job.status} />
        <div className="mt-6">
          <SectionHeading
            eyebrow="Step 5 — Result"
            title="Exported files and next actions."
            description="Download the PDF, duplicate the job, or trigger the optional flipbook conversion path."
          />
        </div>

        {errorMessage ? (
          <p className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-line bg-white/75 p-5">
            <p className="text-sm font-medium text-muted">Pages</p>
            <p className="mt-4 font-display text-4xl font-semibold text-foreground">
              {bundle.job.page_count || "-"}
            </p>
          </div>
          <div className="rounded-[28px] border border-line bg-white/75 p-5">
            <p className="text-sm font-medium text-muted">Matched rows</p>
            <p className="mt-4 font-display text-4xl font-semibold text-foreground">
              {bundle.job.matched_row_count}
            </p>
          </div>
          <div className="rounded-[28px] border border-line bg-white/75 p-5">
            <p className="text-sm font-medium text-muted">Review required</p>
            <p className="mt-4 font-display text-4xl font-semibold text-foreground">
              {bundle.job.review_required_count}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[34px] p-6">
          <SectionHeading
            title="Files"
            description="Generated files are stored privately in Supabase Storage and exposed through signed download links."
          />

          <div className="mt-6 space-y-4">
            {latestPdf ? (
              <div className="rounded-[28px] border border-line bg-white/75 p-5">
                <p className="text-sm font-semibold text-foreground">Latest PDF</p>
                <p className="mt-1 text-sm text-muted">{latestPdf.storage_path}</p>
                <a
                  href={`/api/files/${latestPdf.id}/download`}
                  className="mt-4 inline-flex h-11 items-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white"
                >
                  Download PDF
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No PDF has been generated yet. Go to the generation page to create one.
              </p>
            )}

            {bundle.job.flipbook_mode === "disabled" ? (
              <div className="rounded-[28px] border border-line bg-white/75 p-5">
                <p className="text-sm font-semibold text-foreground">Flipbook-ready output</p>
                <p className="mt-2 text-sm text-muted">
                  Flipbook handling is disabled for this job. The generated PDF is the final output.
                </p>
              </div>
            ) : (
              <form
                action={`/api/jobs/${jobId}/flipbook`}
                method="post"
                className="rounded-[28px] border border-line bg-white/75 p-5"
              >
                <p className="text-sm font-semibold text-foreground">Flipbook-ready output</p>
                <p className="mt-2 text-sm text-muted">
                  The default workflow remains manual Heyzine upload. If `HEYZINE_CLIENT_ID` is configured and the job is in `client_id` mode, the app will call Heyzine&apos;s conversion endpoint.
                </p>
                <Button className="mt-4">Process flipbook step</Button>
              </form>
            )}
          </div>
        </Card>

        <Card className="rounded-[34px] p-6">
          <SectionHeading
            title="Next actions"
            description="Reuse the current work as a template for the next campaign or open the stored flipbook URL when it exists."
          />

          <div className="mt-6 space-y-4">
            {bundle.flipbook?.flipbook_url ? (
              <a
                href={bundle.flipbook.flipbook_url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[28px] border border-line bg-white/75 p-5 text-sm text-brand"
              >
                Open flipbook
              </a>
            ) : (
              <div className="rounded-[28px] border border-dashed border-line bg-white/60 p-5 text-sm text-muted">
                No flipbook URL stored yet. This is expected when the workflow stays PDF-first or manual.
              </div>
            )}

            <form action={duplicateJobAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <Button variant="secondary" className="w-full">
                Duplicate job
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
