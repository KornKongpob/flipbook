import Link from "next/link";
import { CatalogEditorExportButton } from "@/components/catalog/catalog-editor-export-button";
import { CatalogJobHeader } from "@/components/catalog/catalog-job-header";
import { EditorPanel } from "@/components/catalog/editor-panel";
import { requireUser } from "@/lib/auth";
import {
  getCatalogJobBundle,
  resolveCatalogMediaPreviewUrl,
  resolveProductAssetPreviewUrl,
} from "@/lib/catalog/repository";
import {
  mergeCatalogStyleOptions,
  withCatalogMediaPreviews,
} from "@/lib/catalog/style-options";

export default async function CatalogEditorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);
  const rawStyleOptions = bundle.job.style_options_json as Record<string, unknown>;
  const mergedStyleOptions = mergeCatalogStyleOptions(rawStyleOptions);
  const [pageBackgroundPreviewUrl, headerMediaPreviewUrl, footerMediaPreviewUrl] = await Promise.all([
    resolveCatalogMediaPreviewUrl(
      mergedStyleOptions.pageBackgroundImageBucket,
      mergedStyleOptions.pageBackgroundImagePath,
    ),
    resolveCatalogMediaPreviewUrl(
      mergedStyleOptions.headerMediaBucket,
      mergedStyleOptions.headerMediaPath,
    ),
    resolveCatalogMediaPreviewUrl(
      mergedStyleOptions.footerMediaBucket,
      mergedStyleOptions.footerMediaPath,
    ),
  ]);
  const styleOptions = withCatalogMediaPreviews(
    rawStyleOptions,
    {
      pageBackgroundPreviewUrl,
      headerMediaPreviewUrl,
      footerMediaPreviewUrl,
    },
  );

  const items = await Promise.all(
    bundle.items.map(async (item) => ({
      id: item.id,
      productName: item.product_name,
      displayName: item.display_name_override,
      sku: item.sku,
      packSize: item.pack_size,
      unit: item.unit,
      normalPrice: item.normal_price,
      promoPrice: item.promo_price,
      discountAmount: item.discount_amount,
      discountPercent: item.discount_percent,
      previewUrl: await resolveProductAssetPreviewUrl(item.selectedAsset),
      isVisible: item.is_visible,
      displayOrder: item.display_order,
    })),
  );

  const pendingReview = bundle.items.filter((i) => i.match_status === "needs_review").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <CatalogJobHeader
        jobId={jobId}
        jobName={bundle.job.job_name}
        currentStep="editor"
        jobStatus={bundle.job.status}
        title="Design and prepare export"
        description="Fine-tune product content, adjust the page style system, and preview the A4 layout before exporting the final PDF."
        actions={
          <div className="flex shrink-0 items-center gap-2">
            {pendingReview > 0 && (
              <Link
                href={`/catalogs/${jobId}/review`}
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
              >
                {pendingReview} unreviewed
              </Link>
            )}
            <CatalogEditorExportButton />
          </div>
        }
        metrics={[
          { label: "Visible on page", value: `${items.filter((i) => i.isVisible).length} item(s)` },
          { label: "Total products", value: `${items.length} item(s)` },
          { label: "Pending review", value: pendingReview ? `${pendingReview} blocker(s)` : "No blockers" },
        ]}
      />

      <EditorPanel
        initialItems={items}
        jobId={jobId}
        initialStyle={styleOptions}
      />
    </div>
  );
}
