import { GenerationTimeline } from "@/components/catalog/generation-timeline";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button, buttonClassName } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle } from "@/lib/catalog/repository";

export default async function CatalogGeneratePage({
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
  const errorMessage = resolvedSearchParams.error
    ? decodeURIComponent(resolvedSearchParams.error)
    : bundle.job.error_message;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <WorkflowStepper jobId={jobId} currentStep="generate" jobStatus={bundle.job.status} />
          <div className="flex shrink-0 gap-2">
            <form action={`/api/jobs/${jobId}/generate-pdf`} method="post">
              <Button>Generate PDF</Button>
            </form>
            <a href={`/catalogs/${jobId}/result`} className={buttonClassName("secondary")}>Result</a>
          </div>
        </div>
        {errorMessage && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}
      </div>

      <GenerationTimeline status={bundle.job.status} events={bundle.events} />
    </div>
  );
}
