import { GenerationTimeline } from "@/components/catalog/generation-timeline";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle } from "@/lib/catalog/repository";

export default async function CatalogGeneratePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);

  return (
    <div className="space-y-6">
      <Card className="rounded-[34px] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Generation"
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
      </Card>

      <GenerationTimeline status={bundle.job.status} events={bundle.events} />
    </div>
  );
}
