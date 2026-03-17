import Link from "next/link";
import {
  moveItemAction,
  saveDisplayNameAction,
  toggleItemVisibilityAction,
} from "@/app/(app)/actions";
import { PagePreviewGrid } from "@/components/catalog/page-preview-grid";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <WorkflowStepper jobId={jobId} currentStep="preview" jobStatus={bundle.job.status} />
          <div className="flex shrink-0 gap-2">
            <Link href={`/catalogs/${jobId}/settings`} className={buttonClassName("secondary")}>Style</Link>
            <Link href={`/catalogs/${jobId}/generate`} className={buttonClassName("primary")}>Generate PDF</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="mb-3 text-xs font-semibold text-muted uppercase tracking-wide">Products</p>

          <div className="space-y-1.5">
            {bundle.items.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-2.5 transition ${
                  item.is_visible
                    ? "border-line bg-white"
                    : "border-dashed border-line bg-white/50 opacity-55"
                }`}
              >
                {/* Row: order + name + visibility toggle */}
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[10px] font-bold text-brand">
                    {item.display_order + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{item.product_name}</p>
                    <p className="text-[11px] text-muted">{item.sku || "No SKU"}</p>
                  </div>
                  {/* Move buttons */}
                  <div className="flex gap-1">
                    <form action={moveItemAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        title="Move up"
                        className="flex size-6 items-center justify-center rounded-lg border border-line bg-white/80 text-muted transition hover:border-brand/30 hover:bg-brand-soft hover:text-brand"
                      >
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                    </form>
                    <form action={moveItemAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        title="Move down"
                        className="flex size-6 items-center justify-center rounded-lg border border-line bg-white/80 text-muted transition hover:border-brand/30 hover:bg-brand-soft hover:text-brand"
                      >
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </form>
                    <form action={toggleItemVisibilityAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="nextVisible" value={String(!item.is_visible)} />
                      <button
                        type="submit"
                        title={item.is_visible ? "Hide product" : "Show product"}
                        className={`flex size-6 items-center justify-center rounded-lg border transition ${
                          item.is_visible
                            ? "border-line bg-white/80 text-muted hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                            : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {item.is_visible ? (
                          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Display name override */}
                <form action={saveDisplayNameAction} className="mt-2 flex gap-1.5">
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <Input
                    name="displayName"
                    defaultValue={item.display_name_override ?? ""}
                    placeholder="Override display name…"
                    className="h-8 text-xs"
                  />
                  <Button variant="secondary" className="h-8 shrink-0 px-3 text-xs">Save</Button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-4">
          <p className="mb-3 text-xs font-semibold text-muted uppercase tracking-wide">A4 preview</p>
          <PagePreviewGrid items={previewItems} options={styleOptions} />
        </div>
      </div>
    </div>
  );
}
