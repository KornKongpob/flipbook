import { saveStyleOptionsAction } from "@/app/(app)/actions";
import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
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
    <div className="space-y-6">
      <Card className="rounded-[34px] p-6">
        <WorkflowStepper jobId={jobId} currentStep="preview" jobStatus={bundle.job.status} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="rounded-[34px] p-8">
        <SectionHeading
          eyebrow="Style settings"
          title="Tune the catalog style."
          description="Toggle commercial details on or off without changing the underlying data."
        />

        <form action={saveStyleOptionsAction} className="mt-8 space-y-6">
          <input type="hidden" name="jobId" value={jobId} />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Template variant</p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { value: "promo", title: "Promo flyer", description: "Big price treatment and sale-focused callouts." },
                { value: "clean", title: "Clean grid", description: "More restrained treatment for standard catalogs." },
              ].map((variant) => (
                <label
                  key={variant.value}
                  className="rounded-[24px] border border-line bg-white/70 p-4 text-sm"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="variant"
                      value={variant.value}
                      defaultChecked={styleOptions.variant === variant.value}
                    />
                    <div>
                      <p className="font-semibold text-foreground">{variant.title}</p>
                      <p className="mt-1 text-muted">{variant.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["showNormalPrice", "Show normal price"],
              ["showPromoPrice", "Show promo price"],
              ["showDiscountAmount", "Show discount amount"],
              ["showDiscountPercent", "Show percent off"],
              ["showSku", "Show SKU"],
              ["showPackSize", "Show pack size"],
            ].map(([name, label]) => (
              <label
                key={name}
                className="flex items-center gap-3 rounded-[24px] border border-line bg-white/70 px-4 py-3 text-sm text-muted-strong"
              >
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={Boolean(styleOptions[name as keyof typeof styleOptions])}
                />
                {label}
              </label>
            ))}
          </div>

          <Button>Save style settings</Button>
        </form>
      </Card>

      <Card className="rounded-[34px] p-8">
        <SectionHeading
          title="Live card preview"
          description="A single-card preview with the current item data and styling options."
        />

        <div className="mt-8 max-w-sm">
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
            <p className="text-sm text-muted">No items are available for preview yet.</p>
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}
