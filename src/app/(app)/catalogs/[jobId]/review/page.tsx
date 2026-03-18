import { approveCandidateAction } from "@/app/(app)/actions";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { ManualSearchPanel } from "@/components/catalog/manual-search-panel";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import {
  getCatalogJobBundle,
  resolveProductAssetPreviewUrl,
} from "@/lib/catalog/repository";

export default async function CatalogReviewPage({
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
  const reviewItems = bundle.items.filter((item) => item.match_status === "needs_review");
  const errorMessage = resolvedSearchParams.error
    ? decodeURIComponent(resolvedSearchParams.error)
    : null;

  const enrichedItems = await Promise.all(
    reviewItems.map(async (item) => ({
      ...item,
      selectedPreviewUrl: await resolveProductAssetPreviewUrl(item.selectedAsset),
      candidatePreviewUrls: await Promise.all(
        item.candidates.map(async (candidate) => ({
          ...candidate,
          previewUrl: await resolveProductAssetPreviewUrl(candidate.asset),
        })),
      ),
    })),
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <WorkflowStepper jobId={jobId} currentStep="review" jobStatus={bundle.job.status} />
          <a href={`/catalogs/${jobId}/preview`} className={`shrink-0 ${buttonClassName("secondary")}`}>
            Skip to preview
          </a>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-base font-semibold text-foreground">Review matches</h1>
          <Badge tone="warning">{enrichedItems.length} pending</Badge>
        </div>
        {errorMessage && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}
      </div>

      {enrichedItems.length ? (
        enrichedItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-line bg-card overflow-hidden shadow-sm">
            {/* Item header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{item.product_name}</h2>
                  <Badge tone="warning">Needs review</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  SKU: <span className="font-medium text-foreground">{item.sku || "—"}</span>
                  {item.confidence ? ` · ${(item.confidence * 100).toFixed(0)}% confidence` : ""}
                </p>
                {item.review_note && <p className="mt-1 text-xs text-muted-strong">{item.review_note}</p>}
              </div>

              {/* Upload custom image */}
              <form
                action={`/api/items/${item.id}/upload`}
                method="post"
                encType="multipart/form-data"
                className="flex items-center gap-3 rounded-lg border border-line bg-background p-3"
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input
                  name="asset"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="text-xs text-muted file:mr-2 file:rounded file:border-0 file:bg-brand file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                  <input type="checkbox" name="saveManualMapping" defaultChecked className="accent-brand" />
                  Save
                </label>
                <Button className="shrink-0 text-xs" style={{ height: "32px", padding: "0 10px" }}>Upload</Button>
              </form>
            </div>

            {/* Candidates */}
            <div className="p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Current suggestion */}
                {item.selectedPreviewUrl && (
                  <div className="rounded-lg border-2 border-brand/30 bg-brand-soft/20 p-2">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand">Current</p>
                    <div className="relative h-28 overflow-hidden rounded-md bg-white">
                      <ImageWithFallback src={item.selectedPreviewUrl} alt={item.product_name} fill className="object-contain p-1" sizes="180px" />
                    </div>
                  </div>
                )}

                {item.candidatePreviewUrls.map((candidate) => (
                  <div key={candidate.row.id} className="rounded-lg border border-line bg-white p-2">
                    <div className="relative h-28 overflow-hidden rounded-md bg-background">
                      {candidate.previewUrl ? (
                        <ImageWithFallback src={candidate.previewUrl} alt={candidate.asset?.product_name ?? "Candidate"} fill className="object-contain p-1" sizes="180px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs font-medium text-foreground">{candidate.asset?.product_name ?? "Unnamed"}</p>
                    <p className="text-[10px] text-muted">{(candidate.row.confidence * 100).toFixed(0)}% match</p>
                    <form action={approveCandidateAction} className="mt-2 space-y-1.5">
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="assetId" value={candidate.asset?.id ?? ""} />
                      <label className="flex items-center gap-1.5 text-[10px] text-muted">
                        <input type="checkbox" name="saveManualMapping" defaultChecked className="accent-brand" />
                        Save mapping
                      </label>
                      <Button variant="secondary" className="w-full text-xs" style={{ height: "30px" }} disabled={!candidate.asset?.id}>
                        Use this
                      </Button>
                    </form>
                  </div>
                ))}

                {!item.candidatePreviewUrls.length && !item.selectedPreviewUrl && (
                  <p className="col-span-full text-sm text-muted py-2">No candidates found. Use manual search below.</p>
                )}
              </div>

              {/* Manual search */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Search Makro</p>
                <ManualSearchPanel itemId={item.id} jobId={jobId} defaultQuery={item.sku || item.product_name} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-xl border border-line bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-foreground">All items reviewed!</p>
          <p className="mt-1 text-sm text-muted">Ready for preview and PDF generation.</p>
          <a href={`/catalogs/${jobId}/preview`} className={`${buttonClassName("primary")} mt-4 inline-flex`}>
            Go to preview
          </a>
        </div>
      )}
    </div>
  );
}
