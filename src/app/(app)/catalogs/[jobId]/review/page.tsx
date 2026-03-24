import Link from "next/link";
import { CatalogJobHeader } from "@/components/catalog/catalog-job-header";
import { ReviewGrid } from "@/components/catalog/review-grid";
import { buttonClassName } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
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
      <CatalogJobHeader
        jobId={jobId}
        jobName={bundle.job.job_name}
        currentStep="review"
        jobStatus={bundle.job.status}
        title="Review product matches"
        description="Approve confident image matches, correct uncertain items, and clear blockers before moving into page design."
        actions={
          <Link href={`/catalogs/${jobId}/master-card`} className={`shrink-0 ${buttonClassName("secondary")}`}>
            Continue to Master Card
          </Link>
        }
        metrics={[
          { label: "Pending review", value: `${enrichedItems.length} item(s)` },
          { label: "Already approved", value: `${bundle.items.length - reviewItems.length} item(s)` },
          { label: "Total products", value: `${bundle.items.length} item(s)` },
        ]}
        notice={
          errorMessage ? (
            <StatusBanner
              tone="danger"
              title="There is an issue in the review flow"
              description={errorMessage}
            />
          ) : null
        }
      />

      <ReviewGrid items={enrichedItems} jobId={jobId} />
    </div>
  );
}
