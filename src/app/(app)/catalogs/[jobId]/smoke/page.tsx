import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle } from "@/lib/catalog/repository";

export default async function CatalogSmokePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);

  return (
    <pre>
      {JSON.stringify(
        {
          jobId: bundle.job.id,
          jobName: bundle.job.job_name,
          status: bundle.job.status,
          itemCount: bundle.items.length,
          eventCount: bundle.events.length,
          mappingKeys: Object.keys((bundle.job.column_mapping_json as Record<string, unknown>) ?? {}),
        },
        null,
        2,
      )}
    </pre>
  );
}
