import Link from "next/link";
import { CatalogJobHeader } from "@/components/catalog/catalog-job-header";
import { ReviewGrid } from "@/components/catalog/review-grid";
import { buttonClassName } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { requireUser } from "@/lib/auth";
import { getLatestCatalogPdfImageWarningSummary } from "@/lib/catalog/pdf-warnings";
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
  const latestPdfWarningSummary = getLatestCatalogPdfImageWarningSummary(bundle.events);
  const latestPdfWarningItemIds = new Set(
    latestPdfWarningSummary?.items.map((item) => item.itemId) ?? [],
  );
  const focusPdfPlaceholders = resolvedSearchParams.focus === "pdf-placeholders";
  const errorMessage = resolvedSearchParams.error
    ? decodeURIComponent(resolvedSearchParams.error)
    : null;

  const enrichedItems = await Promise.all(
    bundle.items.map(async (item) => {
      const currentImageUrl = await resolveProductAssetPreviewUrl(item.selectedAsset);
      const candidates = await Promise.all(
        item.candidates.map(async (c) => ({
          id: c.row.id,
          assetId: c.asset?.id ?? null,
          productName: c.asset?.product_name ?? "Unnamed",
          previewUrl: await resolveProductAssetPreviewUrl(c.asset),
          confidence: c.row.confidence,
          isExactSkuMatch: (c.row.match_reason ?? "").split(",").includes("exact_sku"),
        })),
      );
      return {
        id: item.id,
        productName: item.product_name,
        sku: item.sku,
        matchStatus: item.match_status,
        confidence: item.confidence,
        reviewNote: item.review_note,
        currentImageUrl,
        usedPdfPlaceholder: latestPdfWarningItemIds.has(item.id),
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
        title="Fix Products"
        description="Audit every product in this catalog, approve the right image, replace weak matches, or remove products that should not stay in the final export."
        actions={
          <Link href={`/catalogs/${jobId}/page-design`} className={`shrink-0 ${buttonClassName("secondary")}`}>
            Continue to Design Catalog
          </Link>
        }
        metrics={[
          { label: "Needs action", value: `${enrichedItems.filter((item) => item.matchStatus !== "approved").length} item(s)` },
          { label: "Approved", value: `${enrichedItems.filter((item) => item.matchStatus === "approved").length} item(s)` },
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

      <ReviewGrid items={enrichedItems} jobId={jobId} initialFocusPdfPlaceholders={focusPdfPlaceholders} />
    </div>
  );
}
