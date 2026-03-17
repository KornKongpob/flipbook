import Link from "next/link";
import {
  moveItemAction,
  saveDisplayNameAction,
  toggleItemVisibilityAction,
} from "@/app/(app)/actions";
import { PagePreviewGrid } from "@/components/catalog/page-preview-grid";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireUser } from "@/lib/auth";
import {
  getCatalogJobBundle,
  resolveProductAssetPreviewUrl,
} from "@/lib/catalog/repository";

export default async function CatalogPreviewPage({
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

  const previewItems = await Promise.all(
    bundle.items.map(async (item) => ({
      ...item,
      previewUrl: await resolveProductAssetPreviewUrl(item.selectedAsset),
    })),
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-[34px] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Page preview"
            title="Finalize product order and visibility."
            description="Reorder products, hide weak entries, and override display names before generating the PDF."
          />
          <div className="flex flex-wrap gap-3">
            <Link href={`/catalogs/${jobId}/settings`} className={buttonClassName("secondary")}>
              Style settings
            </Link>
            <Link href={`/catalogs/${jobId}/generate`} className={buttonClassName("primary")}>
              Generate PDF
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[34px] p-6">
          <SectionHeading
            title="Product controls"
            description="Changes here immediately affect the A4 page preview."
          />

          <div className="mt-6 space-y-4">
            {bundle.items.map((item) => (
              <div key={item.id} className="rounded-[28px] border border-line bg-white/75 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.product_name}</p>
                    <p className="mt-1 text-xs text-muted">{item.sku || "No SKU"}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-muted">
                    #{item.display_order + 1}
                  </span>
                </div>

                <form action={saveDisplayNameAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <Input
                    name="displayName"
                    defaultValue={item.display_name_override ?? ""}
                    placeholder="Display name override"
                  />
                  <Button variant="secondary">Save</Button>
                </form>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={moveItemAction}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button variant="secondary">Move up</Button>
                  </form>
                  <form action={moveItemAction}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button variant="secondary">Move down</Button>
                  </form>
                  <form action={toggleItemVisibilityAction}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="nextVisible" value={String(!item.is_visible)} />
                    <Button variant={item.is_visible ? "ghost" : "primary"}>
                      {item.is_visible ? "Hide" : "Show"}
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[34px] p-6">
          <SectionHeading
            title="A4 preview"
            description="Nine products per page, using the current template and style toggles."
          />

          <div className="mt-6">
            <PagePreviewGrid items={previewItems} options={styleOptions} />
          </div>
        </Card>
      </div>
    </div>
  );
}
