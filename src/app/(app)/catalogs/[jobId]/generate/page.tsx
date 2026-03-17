import { GenerationTimeline } from "@/components/catalog/generation-timeline";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
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
    <div className="space-y-6">
      <Card className="rounded-[34px] p-8">
        <WorkflowStepper jobId={jobId} currentStep="generate" jobStatus={bundle.job.status} />
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Step 4 — Generation"
            title="Run the output pipeline."
            description="Generate the deterministic PDF first. If the job uses a flipbook mode, the PDF remains the source of truth and Heyzine stays optional."
          />

          <div className="flex flex-wrap gap-3">
            <form action={`/api/jobs/${jobId}/generate-pdf`} method="post">
              <Button>Generate PDF now</Button>
            </form>
            <a href={`/catalogs/${jobId}/result`} className={buttonClassName("secondary")}>
              Open result
            </a>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </Card>

      <GenerationTimeline status={bundle.job.status} events={bundle.events} />
    </div>
  );
}
