import Link from "next/link";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { EditorPanel } from "@/components/catalog/editor-panel";
import { buttonClassName } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import {
  getCatalogJobBundle,
  resolveCatalogBackgroundPreviewUrl,
  resolveProductAssetPreviewUrl,
} from "@/lib/catalog/repository";
import { withCatalogBackgroundPreview } from "@/lib/catalog/style-options";

export default async function CatalogEditorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);
  const backgroundPreviewUrl = await resolveCatalogBackgroundPreviewUrl(
    bundle.job.style_options_json as Record<string, unknown>,
  );
  const styleOptions = withCatalogBackgroundPreview(
    bundle.job.style_options_json as Record<string, unknown>,
    backgroundPreviewUrl,
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
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <WorkflowStepper jobId={jobId} currentStep="editor" jobStatus={bundle.job.status} />
          <div className="flex shrink-0 items-center gap-2">
            {pendingReview > 0 && (
              <Link
                href={`/catalogs/${jobId}/review`}
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
              >
                {pendingReview} unreviewed
              </Link>
            )}
            <Link href={`/catalogs/${jobId}/result`} className={buttonClassName("primary")}>
              Generate PDF →
            </Link>
          </div>
        </div>
        <div className="mt-2">
          <h1 className="text-base font-semibold text-foreground">{bundle.job.job_name}</h1>
          <p className="text-xs text-muted mt-0.5">
            {items.filter((i) => i.isVisible).length} visible · {items.length} total items
          </p>
        </div>
      </div>

      <EditorPanel
        initialItems={items}
        jobId={jobId}
        initialStyle={styleOptions}
      />
    </div>
  );
}
