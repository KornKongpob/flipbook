import { saveStyleOptionsAction } from "@/app/(app)/actions";
import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import {
  getCatalogJobBundle,
  resolveProductAssetPreviewUrl,
} from "@/lib/catalog/repository";

export default async function CatalogSettingsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);
  const styleOptions = {
    variant: "promo",
    showNormalPrice: true,
    showPromoPrice: true,
    showDiscountAmount: true,
    showDiscountPercent: false,
    showSku: true,
    showPackSize: true,
    ...(bundle.job.style_options_json as Record<string, boolean | string>),
  };
  const sampleItem = bundle.items.find((item) => item.is_visible) ?? bundle.items[0];
  const sampleImageUrl = await resolveProductAssetPreviewUrl(sampleItem?.selectedAsset ?? null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-4">
        <WorkflowStepper jobId={jobId} currentStep="preview" jobStatus={bundle.job.status} />
        <h1 className="mt-3 text-base font-semibold text-foreground">Style settings</h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Style form */}
        <div className="rounded-xl border border-line bg-card p-4">
          <form action={saveStyleOptionsAction} className="space-y-4">
            <input type="hidden" name="jobId" value={jobId} />

            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Variant</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "promo", title: "Promo flyer", desc: "Sale-focused callouts" },
                  { value: "clean", title: "Clean grid", desc: "Standard catalog look" },
                ].map((v) => (
                  <label key={v.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm">
                    <input type="radio" name="variant" value={v.value} defaultChecked={styleOptions.variant === v.value} className="mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{v.title}</p>
                      <p className="text-xs text-muted">{v.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Display options</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {[
                  ["showNormalPrice", "Normal price"],
                  ["showPromoPrice", "Promo price"],
                  ["showDiscountAmount", "Discount amount"],
                  ["showDiscountPercent", "Percent off"],
                  ["showSku", "SKU"],
                  ["showPackSize", "Pack size"],
                ].map(([name, label]) => (
                  <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted-strong">
                    <input type="checkbox" name={name} defaultChecked={Boolean(styleOptions[name as keyof typeof styleOptions])} className="accent-brand" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <Button>Save settings</Button>
          </form>
        </div>

        {/* Card preview */}
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Card preview</p>
          <div className="max-w-xs">
            {sampleItem ? (
              <CatalogCardPreview
                title={sampleItem.display_name_override || sampleItem.product_name}
                sku={sampleItem.sku}
                packSize={sampleItem.pack_size}
                unit={sampleItem.unit}
                normalPrice={sampleItem.normal_price}
                promoPrice={sampleItem.promo_price}
                discountAmount={sampleItem.discount_amount}
                discountPercent={sampleItem.discount_percent}
                imageUrl={sampleImageUrl}
                options={styleOptions}
              />
            ) : (
              <p className="text-sm text-muted">No items available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
