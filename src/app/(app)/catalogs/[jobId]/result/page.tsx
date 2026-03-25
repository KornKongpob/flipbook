import Link from "next/link";
import { AlertCircle, Copy, Download, ExternalLink, FileText, Play, RefreshCw } from "lucide-react";
import { duplicateJobAction } from "@/app/(app)/actions";
import { CatalogJobHeader } from "@/components/catalog/catalog-job-header";
import { Button, buttonClassName } from "@/components/ui/button";
import { StatusBanner } from "@/components/ui/status-banner";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";
import { requireUser } from "@/lib/auth";
import {
  formatCatalogPdfImageWarningDescription,
  getLatestCatalogPdfImageWarningSummary,
} from "@/lib/catalog/pdf-warnings";
import { getCatalogJobBundle, getLatestPdfFile } from "@/lib/catalog/repository";

function getLatestCatalogMutationTimestamp(bundle: Awaited<ReturnType<typeof getCatalogJobBundle>>) {
  const timestamps = [
    ...bundle.items.map((item) => item.updated_at),
    ...bundle.events
      .filter((event) => ["style", "review", "editor"].includes(event.step))
      .map((event) => event.created_at),
  ]
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  return timestamps.length ? Math.max(...timestamps) : 0;
}

export default async function CatalogResultPage({
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
  const latestPdf = getLatestPdfFile(bundle.files);
  const errorMessage = resolvedSearchParams.error
    ? decodeURIComponent(resolvedSearchParams.error)
    : bundle.job.error_message;
  const visibleCount = bundle.items.filter((item) => item.is_visible).length;
  const hiddenCount = bundle.items.length - visibleCount;
  const isPdfReady = ["pdf_ready", "completed", "converting_flipbook"].includes(bundle.job.status);
  const isGenerating = bundle.job.status === "generating_pdf";
  const matchingInProgress = ["uploaded", "parsing", "matching"].includes(bundle.job.status);
  const canGenerate = !isGenerating && !matchingInProgress && bundle.job.review_required_count === 0 && visibleCount > 0;
  const pdfImageWarningSummary = getLatestCatalogPdfImageWarningSummary(bundle.events);
  const latestMutationTimestamp = getLatestCatalogMutationTimestamp(bundle);
  const latestPdfTimestamp = latestPdf ? new Date(latestPdf.created_at).getTime() : 0;
  const isExportOutdated = Boolean(latestPdf) && latestMutationTimestamp > latestPdfTimestamp;
  const canPublishFlipbook = Boolean(latestPdf) && !isExportOutdated;

  return (
    <div className="space-y-5 animate-fade-in">
      <CatalogJobHeader
        jobId={jobId}
        jobName={bundle.job.job_name}
        currentStep="result"
        jobStatus={bundle.job.status}
        title="Export & Publish"
        description={
          isPdfReady
            ? "Generate or regenerate the latest PDF, then download or publish the current catalog from one export hub."
            : "Generate the latest PDF, then continue to download or publish the catalog from this same export hub."
        }
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            <Link href={`/catalogs/${jobId}/page-design`} className={buttonClassName("secondary", "h-auto min-h-9 max-w-full px-3 py-2 text-center text-xs leading-4")}>
              Back to Design Catalog
            </Link>
            <form action={`/api/jobs/${jobId}/generate-pdf`} method="post">
              <input type="hidden" name="returnTo" value="result" />
              <Button className="h-auto min-h-9 max-w-full gap-1.5 px-3 py-2 text-center text-xs leading-4" disabled={!canGenerate}>
                {isGenerating ? <RefreshCw className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                {isGenerating ? "Generating..." : latestPdf ? "Regenerate PDF" : "Generate PDF"}
              </Button>
            </form>
          </div>
        }
        metrics={[
          { label: "Total pages", value: bundle.job.page_count ? `${bundle.job.page_count}` : "-" },
          { label: "Products included", value: `${visibleCount}` },
          { label: "Export state", value: isExportOutdated ? "Outdated" : latestPdf ? "Current" : "Not generated" },
        ]}
      />

      {errorMessage ? (
        <StatusBanner
          tone="danger"
          title="Issue with generation"
          description={errorMessage}
        />
      ) : null}

      {pdfImageWarningSummary ? (
        <StatusBanner
          tone="warning"
          title="Some images used placeholders in the latest PDF"
          description={(
            <div className="space-y-2">
              <p>{formatCatalogPdfImageWarningDescription(pdfImageWarningSummary)}</p>
              <Link href={`/catalogs/${jobId}/review?focus=pdf-placeholders`} className="inline-flex font-semibold underline underline-offset-2">
                Open Fix Products for affected items
              </Link>
            </div>
          )}
        />
      ) : null}

      {isExportOutdated ? (
        <StatusBanner
          tone="warning"
          title="The latest export is outdated"
          description="Products or design settings changed after the most recent PDF was generated. Regenerate the PDF before publishing or trusting this export as final."
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <SurfaceCard>
            <SurfaceCardHeader>
              <div>
                <h2 id="generate" className="text-sm font-semibold text-foreground">Generation checklist</h2>
                <p className="mt-1 text-xs text-muted">Confirm the catalog is ready, then generate the latest PDF from here.</p>
              </div>
            </SurfaceCardHeader>
            <SurfaceCardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-line bg-white/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Review blockers</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{bundle.job.review_required_count}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Visible products</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{visibleCount}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Hidden products</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{hiddenCount}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Latest PDF</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {latestPdf ? (isExportOutdated ? "Previous export" : "Current export") : "Not yet"}
                  </p>
                </div>
              </div>

              {matchingInProgress ? (
                <StatusBanner
                  tone="warning"
                  title="Matching is still in progress"
                  description="Wait for matching to finish before generating the PDF."
                />
              ) : bundle.job.review_required_count > 0 ? (
                <StatusBanner
                  tone="warning"
                  title="Fix Products still has blockers"
                  description={(
                    <span>
                      Resolve the remaining product issues before generating the latest PDF.{" "}
                      <Link href={`/catalogs/${jobId}/review`} className="font-semibold underline underline-offset-2">
                        Open Fix Products
                      </Link>
                    </span>
                  )}
                />
              ) : visibleCount === 0 ? (
                <StatusBanner
                  tone="warning"
                  title="No visible products to export"
                  description={(
                    <span>
                      Add or reveal at least one product in Design Catalog before generating the PDF.{" "}
                      <Link href={`/catalogs/${jobId}/page-design`} className="font-semibold underline underline-offset-2">
                        Open Design Catalog
                      </Link>
                    </span>
                  )}
                />
              ) : isExportOutdated ? (
                <StatusBanner
                  tone="warning"
                  title="Regeneration required"
                  description="The current file list below belongs to an older export. Generate again to publish the latest catalog state."
                />
              ) : (
                <StatusBanner
                  tone="success"
                  title="Export is ready"
                  description="There are no blockers for generating the latest PDF."
                />
              )}
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <SurfaceCardHeader>
              <h2 className="flex items-center gap-2 font-semibold text-foreground">
                <FileText className="size-4 text-brand" />
                Files and publishing
              </h2>
            </SurfaceCardHeader>

            <SurfaceCardBody className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">PDF file</h3>
                {latestPdf ? (
                  <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-gray-50/30 p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {bundle.job.job_name}.pdf {isExportOutdated ? "(previous export)" : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {bundle.job.page_count} pages • Generated {new Date(latestPdf.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={`/api/files/${latestPdf.id}/download`}
                      className="inline-flex min-h-10 min-w-0 max-w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium leading-5 text-white transition-colors hover:bg-brand-strong"
                    >
                      <Download className="size-4" />
                      Download PDF
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-muted">
                    No PDF generated yet. Use the generation checklist above when you are ready.
                  </div>
                )}
              </div>

              {bundle.job.flipbook_mode !== "disabled" && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Digital flipbook</h3>

                  {bundle.flipbook?.flipbook_url && canPublishFlipbook ? (
                    <div className="rounded-xl border border-brand/30 bg-brand-soft/10 p-4">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-sm font-semibold text-brand">Ready to share!</p>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-strong">{bundle.flipbook.flipbook_url}</p>
                        </div>
                        <a
                          href={bundle.flipbook.flipbook_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 min-w-0 max-w-full items-center justify-center gap-2 rounded-lg border border-brand/20 bg-white px-4 py-2 text-center text-sm font-medium leading-5 text-brand transition-colors hover:bg-brand-soft/20"
                        >
                          <ExternalLink className="size-4" />
                          Open Flipbook
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line p-4">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {isExportOutdated
                              ? "Regenerate PDF first"
                              : bundle.job.flipbook_mode === "manual"
                                ? "Manual Upload Mode"
                                : "Not generated yet"}
                          </p>
                          <p className="mt-1 max-w-[300px] text-xs text-muted">
                            {isExportOutdated
                              ? "The current export is older than the latest catalog changes. Regenerate the PDF before publishing or creating a new flipbook."
                              : bundle.job.flipbook_mode === "manual"
                                ? "Download the PDF above and upload it directly to Heyzine."
                                : "Click below to send the PDF to Heyzine and generate a digital flipbook."}
                          </p>
                        </div>
                        {bundle.job.flipbook_mode === "client_id" && canPublishFlipbook ? (
                          <form action={`/api/jobs/${jobId}/flipbook`} method="post">
                            <Button className="h-auto min-h-10 max-w-full gap-2 px-4 py-2 text-center leading-5">
                              <RefreshCw className="size-4" />
                              Generate Flipbook
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SurfaceCardBody>
          </SurfaceCard>
        </div>

        <div className="space-y-5">
          <SurfaceCard>
            <SurfaceCardBody>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-strong">Total Pages</span>
                  <span className="text-base font-bold text-foreground">{bundle.job.page_count || "-"}</span>
                </div>
                <div className="h-px w-full bg-line" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-strong">Products Included</span>
                  <span className="text-base font-bold text-foreground">{visibleCount}</span>
                </div>
                <div className="h-px w-full bg-line" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-strong">Excluded/Hidden</span>
                  <span className="text-base font-bold text-muted">{hiddenCount}</span>
                </div>
                <div className="h-px w-full bg-line" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-strong">Export freshness</span>
                  <span className={`text-base font-bold ${isExportOutdated ? "text-amber-700" : "text-foreground"}`}>
                    {isExportOutdated ? "Outdated" : latestPdf ? "Current" : "Pending"}
                  </span>
                </div>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard>
            <SurfaceCardBody>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">Actions</h3>
              <div className="space-y-3">
                <form action={duplicateJobAction}>
                  <input type="hidden" name="jobId" value={jobId} />
                  <Button variant="secondary" className="h-10 w-full justify-start gap-2 border-line hover:bg-gray-50">
                    <Copy className="size-4 text-muted-strong" />
                    <span className="font-medium text-foreground">Duplicate Catalog</span>
                  </Button>
                </form>
                <Link
                  href="/catalogs/new"
                  className="flex w-full items-center justify-start gap-2 rounded-lg bg-gray-50 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-gray-100"
                >
                  <span className="flex size-5 items-center justify-center rounded bg-white text-lg leading-none text-brand shadow-sm">+</span>
                  Create New Catalog
                </Link>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          {!isPdfReady ? (
            <SurfaceCard>
              <SurfaceCardBody>
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Export not finished yet</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-700">
                      {matchingInProgress
                        ? "Matching is still running. Wait for the workflow to finish before exporting."
                        : bundle.job.review_required_count > 0
                          ? "Clear the remaining product blockers in Fix Products before generating the latest PDF."
                          : visibleCount === 0
                            ? "Make at least one product visible before generating the latest PDF."
                            : "Generate the PDF first, then this page becomes your hub for download and flipbook publishing."}
                    </p>
                  </div>
                </div>
              </SurfaceCardBody>
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
