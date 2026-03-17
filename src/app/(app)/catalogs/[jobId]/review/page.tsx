import Image from "next/image";
import { approveCandidateAction } from "@/app/(app)/actions";
import { ManualSearchPanel } from "@/components/catalog/manual-search-panel";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
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
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { jobId } = await params;
  const resolvedSearchParams = await searchParams;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);
  const reviewItems = bundle.items.filter((item) => item.match_status === "needs_review");
  const errorMessage = resolvedSearchParams.error
    ? decodeURIComponent(resolvedSearchParams.error)
    : null;

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
        <WorkflowStepper jobId={jobId} currentStep="review" jobStatus={bundle.job.status} />
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Step 2 — Matching review"
            title="Approve uncertain product matches."
            description="SKU matches were auto-approved already. This queue is for the products that still need a human decision."
          />
          <a href={`/catalogs/${jobId}/preview`} className={buttonClassName("secondary")}>
            Skip to preview
          </a>
        </div>

        {errorMessage ? (
          <p className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </Card>

      {enrichedItems.length ? (
        enrichedItems.map((item) => {
          const statusMeta = ITEM_STATUS_META[item.match_status];

          return (
            <Card key={item.id} className="rounded-[34px] p-6">
              {/* Item header */}
              <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {item.product_name}
                      </h2>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      SKU: <span className="font-medium text-foreground">{item.sku || "Missing"}</span>
                      {item.confidence ? ` · Confidence: ${(item.confidence * 100).toFixed(0)}%` : ""}
                    </p>
                    {item.review_note ? (
                      <p className="mt-1.5 text-xs text-muted-strong">{item.review_note}</p>
                    ) : null}
                  </div>
                </div>

                {/* Upload custom image */}
                <form
                  action={`/api/items/${item.id}/upload`}
                  method="post"
                  encType="multipart/form-data"
                  className="shrink-0 rounded-[22px] border border-line bg-white/70 p-4 sm:w-64"
                >
                  <input type="hidden" name="jobId" value={jobId} />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Upload custom image</p>
                  <input
                    name="asset"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    required
                    className="mt-3 block w-full text-xs text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  />
                  <label className="mt-2.5 flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" name="saveManualMapping" defaultChecked className="size-3.5 accent-brand" />
                    Save as reusable mapping
                  </label>
                  <Button className="mt-3 w-full text-xs" style={{ height: "36px" }}>Upload & approve</Button>
                </form>
              </div>

              {/* Current suggested + candidates */}
              <div className="mt-5 grid gap-4 xl:grid-cols-[200px_1fr]">
                {item.selectedPreviewUrl ? (
                  <div className="rounded-[22px] border border-line bg-white/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Current suggestion</p>
                    <div className="relative mt-2 h-36 overflow-hidden rounded-[18px] bg-[#fff5ef]">
                      <Image
                        src={item.selectedPreviewUrl}
                        alt={item.product_name}
                        fill
                        className="object-contain p-2"
                        sizes="200px"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-[22px] border border-dashed border-line bg-white/50 p-3 text-xs text-muted">
                    No current image
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Alternative candidates ({item.candidatePreviewUrls.length})
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {item.candidatePreviewUrls.map((candidate) => (
                      <div
                        key={candidate.row.id}
                        className="rounded-[22px] border border-line bg-white/80 p-3"
                      >
                        <div className="relative h-32 overflow-hidden rounded-[18px] bg-[#fff5ef]">
                          {candidate.previewUrl ? (
                            <Image
                              src={candidate.previewUrl}
                              alt={candidate.asset?.product_name ?? "Candidate"}
                              fill
                              className="object-contain p-2"
                              sizes="220px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted">
                              No preview
                            </div>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-1 text-xs font-semibold text-foreground">
                          {candidate.asset?.product_name ?? "Unnamed asset"}
                        </p>
                        <p className="text-[11px] text-muted">
                          {candidate.asset?.sku || "No SKU"} · {(candidate.row.confidence * 100).toFixed(0)}% match
                        </p>
                        <form action={approveCandidateAction} className="mt-2.5 space-y-2">
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="jobId" value={jobId} />
                          <input type="hidden" name="assetId" value={candidate.asset?.id ?? ""} />
                          <label className="flex items-center gap-1.5 text-[11px] text-muted">
                            <input type="checkbox" name="saveManualMapping" defaultChecked className="size-3 accent-brand" />
                            Save mapping
                          </label>
                          <Button
                            variant="secondary"
                            className="w-full text-xs"
                            style={{ height: "34px" }}
                            disabled={!candidate.asset?.id}
                          >
                            Use this image
                          </Button>
                        </form>
                      </div>
                    ))}
                    {!item.candidatePreviewUrls.length && (
                      <p className="col-span-full py-4 text-sm text-muted">No automatic candidates found. Use manual search below.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Manual search */}
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Manual search</p>
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
          <div className="mx-auto flex size-14 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-600">
            <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">All items reviewed!</p>
          <p className="mt-1.5 text-sm text-muted">
            This job is ready to move into the page preview and PDF generation steps.
          </p>
          <a href={`/catalogs/${jobId}/preview`} className={`${buttonClassName("primary")} mt-6 inline-flex`}>
            Open page preview
          </a>
        </Card>
      )}
    </div>
  );
}
