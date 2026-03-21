import Link from "next/link";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { ReviewGrid } from "@/components/catalog/review-grid";
import { buttonClassName } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle, resolveProductAssetPreviewUrl } from "@/lib/catalog/repository";

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
    reviewItems.map(async (item) => {
      const currentImageUrl = await resolveProductAssetPreviewUrl(item.selectedAsset);
      const candidates = await Promise.all(
        item.candidates.map(async (c) => ({
          id: c.row.id,
          assetId: c.asset?.id ?? null,
          productName: c.asset?.product_name ?? "Unnamed",
          previewUrl: await resolveProductAssetPreviewUrl(c.asset),
          confidence: c.row.confidence,
        })),
      );
      return {
        id: item.id,
        productName: item.product_name,
        sku: item.sku,
        confidence: item.confidence,
        reviewNote: item.review_note,
        currentImageUrl,
        candidates,
        jobId,
      };
    }),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <WorkflowStepper jobId={jobId} currentStep="review" jobStatus={bundle.job.status} />
          <Link href={`/catalogs/${jobId}/editor`} className={`shrink-0 ${buttonClassName("secondary")}`}>
            Skip to Editor
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground">Review Matches</h1>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            {enrichedItems.length} pending
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {bundle.items.length - reviewItems.length} approved
          </span>
        </div>
        {errorMessage && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}
      </div>

      <ReviewGrid items={enrichedItems} jobId={jobId} />
    </div>
  );
}
