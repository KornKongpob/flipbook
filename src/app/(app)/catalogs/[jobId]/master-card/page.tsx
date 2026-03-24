import Link from "next/link";
import { CatalogJobHeader } from "@/components/catalog/catalog-job-header";
import { MasterCardWorkspace } from "@/components/catalog/master-card-workspace";
import { buttonClassName } from "@/components/ui/button";
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
import { deriveCatalogPricing } from "@/lib/catalog/pricing";

export default async function CatalogMasterCardPage({
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
    bundle.items.map(async (item) => {
      const pricing = deriveCatalogPricing({
        normalPrice: item.normal_price,
        promoPrice: item.promo_price,
      });

      return {
        id: item.id,
        productName: item.product_name,
        displayName: item.display_name_override,
        sku: item.sku,
        packSize: item.pack_size,
        unit: item.unit,
        normalPrice: pricing.normalPrice,
        promoPrice: pricing.promoPrice,
        discountAmount: pricing.discountAmount,
        discountPercent: pricing.discountPercent,
        previewUrl: await resolveProductAssetPreviewUrl(item.selectedAsset),
        isVisible: item.is_visible,
        displayOrder: item.display_order,
      };
    }),
  );

  const pendingReview = bundle.items.filter((item) => item.match_status === "needs_review").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <CatalogJobHeader
        jobId={jobId}
        jobName={bundle.job.job_name}
        currentStep="master-card"
        jobStatus={bundle.job.status}
        title="Master card editor"
        description="Define the shared card composition once, drag core sub-elements on X/Y axes, and apply the layout to every product card before moving to page design."
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            {pendingReview > 0 ? (
              <Link
                href={`/catalogs/${jobId}/review`}
                className="inline-flex min-h-9 min-w-0 max-w-full items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium leading-4 text-amber-700 transition hover:bg-amber-100"
              >
                {pendingReview} unreviewed
              </Link>
            ) : null}
            <Link
              href={`/catalogs/${jobId}/page-design`}
              className={buttonClassName("secondary", "h-auto min-h-9 max-w-full px-3 py-2 text-center text-xs leading-4")}
            >
              Skip to Page Design →
            </Link>
          </div>
        }
        metrics={[
          { label: "Visible products", value: `${items.filter((item) => item.isVisible).length} item(s)` },
          { label: "Total products", value: `${items.length} item(s)` },
          { label: "Pending review", value: pendingReview ? `${pendingReview} blocker(s)` : "No blockers" },
        ]}
      />

      <MasterCardWorkspace
        initialItems={items}
        jobId={jobId}
        initialStyle={styleOptions}
      />
    </div>
  );
}
