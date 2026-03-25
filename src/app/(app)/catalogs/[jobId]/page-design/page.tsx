import Link from "next/link";
import { CatalogEditorExportButton } from "@/components/catalog/catalog-editor-export-button";
import { CatalogJobHeader } from "@/components/catalog/catalog-job-header";
import { EditorPanel } from "@/components/catalog/editor-panel";
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

export default async function CatalogPageDesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { jobId } = await params;
  const resolvedSearchParams = await searchParams;
  const mode = resolvedSearchParams.mode === "card" ? "card" : "page";
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

  const pendingReview = bundle.items.filter((item) => item.match_status !== "approved").length;
  const visibleCount = items.filter((item) => item.isVisible).length;
  const modeSwitcher = (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-white/80 p-1">
      <Link
        href={`/catalogs/${jobId}/page-design`}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${mode === "page" ? "bg-brand text-white shadow-sm" : "text-muted-strong hover:bg-slate-50 hover:text-foreground"}`}
      >
        Page preview
      </Link>
      <Link
        href={`/catalogs/${jobId}/page-design?mode=card`}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${mode === "card" ? "bg-brand text-white shadow-sm" : "text-muted-strong hover:bg-slate-50 hover:text-foreground"}`}
      >
        Card layout
      </Link>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <CatalogJobHeader
        jobId={jobId}
        jobName={bundle.job.job_name}
        currentStep="page-design"
        jobStatus={bundle.job.status}
        title="Design Catalog"
        description={
          mode === "card"
            ? "Edit the shared product card in a focused workspace, then return to Page preview when you want to verify the full A4 composition."
            : "Arrange the A4 catalog, manage included products, and switch into card layout only when you need shared element adjustments."
        }
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            {pendingReview > 0 && (
              <Link
                href={`/catalogs/${jobId}/review`}
                className="inline-flex min-h-9 min-w-0 max-w-full items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium leading-4 text-amber-700 transition hover:bg-amber-100"
              >
                {pendingReview} need attention
              </Link>
            )}
            {modeSwitcher}
            {mode === "page" ? (
              <CatalogEditorExportButton />
            ) : (
              <Link
                href={`/catalogs/${jobId}/result#generate`}
                className={buttonClassName("secondary", "h-auto min-h-9 max-w-full px-3 py-2 text-center text-xs leading-4")}
              >
                Open Export Hub
              </Link>
            )}
          </div>
        }
        metrics={[
          { label: "Included products", value: `${items.length} item(s)` },
          { label: "Visible on pages", value: `${visibleCount} item(s)` },
          { label: "Needs action", value: pendingReview ? `${pendingReview} item(s)` : "Ready for export" },
        ]}
      />

      {mode === "card" ? (
        <MasterCardWorkspace
          initialItems={items}
          jobId={jobId}
          initialStyle={styleOptions}
        />
      ) : (
        <EditorPanel
          initialItems={items}
          jobId={jobId}
          initialStyle={styleOptions}
        />
      )}
    </div>
  );
}
