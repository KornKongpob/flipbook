import Image from "next/image";
import { approveCandidateAction } from "@/app/(app)/actions";
import { ManualSearchPanel } from "@/components/catalog/manual-search-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { ITEM_STATUS_META } from "@/lib/catalog/constants";
import { requireUser } from "@/lib/auth";
import {
  getCatalogJobBundle,
  resolveProductAssetPreviewUrl,
} from "@/lib/catalog/repository";

export default async function CatalogReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);
  const reviewItems = bundle.items.filter((item) => item.match_status === "needs_review");

  const enrichedItems = await Promise.all(
    reviewItems.map(async (item) => ({
      ...item,
      selectedPreviewUrl: await resolveProductAssetPreviewUrl(item.selectedAsset),
      candidatePreviewUrls: await Promise.all(
        item.candidates.map(async (candidate) => ({
          ...candidate,
          previewUrl: await resolveProductAssetPreviewUrl(candidate.asset),
        })),
      ),
    })),
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-[34px] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Matching review"
            title="Approve uncertain product matches."
            description="SKU matches were auto-approved already. This queue is for the products that still need a human decision."
          />
          <a href={`/catalogs/${jobId}/preview`} className={buttonClassName("secondary")}>
            Skip to preview
          </a>
        </div>
      </Card>

      {enrichedItems.length ? (
        enrichedItems.map((item) => {
          const statusMeta = ITEM_STATUS_META[item.match_status];

          return (
            <Card key={item.id} className="rounded-[34px] p-6">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-2xl font-semibold text-foreground">
                        {item.product_name}
                      </h2>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      SKU: {item.sku || "Missing"} • Suggested confidence{" "}
                      {item.confidence ? `${(item.confidence * 100).toFixed(0)}%` : "n/a"}
                    </p>
                    {item.review_note ? (
                      <p className="mt-2 text-sm text-muted-strong">{item.review_note}</p>
                    ) : null}
                  </div>

                  <form
                    action={`/api/items/${item.id}/upload`}
                    method="post"
                    encType="multipart/form-data"
                    className="rounded-[24px] border border-line bg-white/70 p-4"
                  >
                    <input type="hidden" name="jobId" value={jobId} />
                    <label className="text-sm font-medium text-foreground">Upload custom image</label>
                    <input
                      name="asset"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      required
                      className="mt-2 block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                    <label className="mt-3 flex items-center gap-2 text-xs text-muted">
                      <input type="checkbox" name="saveManualMapping" defaultChecked />
                      Save as reusable mapping
                    </label>
                    <Button className="mt-4 w-full">Upload asset</Button>
                  </form>
                </div>

                {item.selectedPreviewUrl ? (
                  <div className="rounded-[28px] border border-line bg-white/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Current suggested asset</p>
                    <div className="relative mt-3 h-40 overflow-hidden rounded-[22px] bg-[#fff5ef]">
                      <Image
                        src={item.selectedPreviewUrl}
                        alt={item.product_name}
                        fill
                        className="object-contain p-3"
                        sizes="320px"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-3">
                  {item.candidatePreviewUrls.map((candidate) => (
                    <div
                      key={candidate.row.id}
                      className="rounded-[28px] border border-line bg-white/80 p-4"
                    >
                      <div className="relative h-40 overflow-hidden rounded-[22px] bg-[#fff5ef]">
                        {candidate.previewUrl ? (
                          <Image
                            src={candidate.previewUrl}
                            alt={candidate.asset?.product_name ?? "Candidate"}
                            fill
                            className="object-contain p-3"
                            sizes="280px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted">
                            No preview available
                          </div>
                        )}
                      </div>
                      <div className="mt-4 space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {candidate.asset?.product_name ?? "Unnamed asset"}
                        </p>
                        <p className="text-xs text-muted">
                          {candidate.asset?.sku || "No SKU"} • confidence{" "}
                          {(candidate.row.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      <form action={approveCandidateAction} className="mt-4 space-y-3">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="jobId" value={jobId} />
                        <input type="hidden" name="assetId" value={candidate.asset?.id ?? ""} />
                        <label className="flex items-center gap-2 text-xs text-muted">
                          <input type="checkbox" name="saveManualMapping" defaultChecked />
                          Save manual mapping
                        </label>
                        <Button variant="secondary" className="w-full" disabled={!candidate.asset?.id}>
                          Approve candidate
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>

                <ManualSearchPanel
                  itemId={item.id}
                  jobId={jobId}
                  defaultQuery={item.sku || item.product_name}
                />
              </div>
            </Card>
          );
        })
      ) : (
        <Card className="rounded-[34px] p-10 text-center">
          <p className="text-lg font-semibold text-foreground">No items need manual review.</p>
          <p className="mt-2 text-sm text-muted">
            This job is ready to move into the page preview and PDF generation steps.
          </p>
          <a href={`/catalogs/${jobId}/preview`} className={`${buttonClassName("primary")} mt-6`}>
            Open preview
          </a>
        </Card>
      )}
    </div>
  );
}
