import Link from "next/link";
import { Loader2, Play, RefreshCw } from "lucide-react";
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

export default async function CatalogGeneratePage({
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
    : bundle.job.status === "failed"
      ? bundle.job.error_message
      : null;
  const isGenerating = bundle.job.status === "generating_pdf";
  const isPdfReady = ["pdf_ready", "completed", "converting_flipbook"].includes(bundle.job.status);
  const visibleCount = bundle.items.filter((item) => item.is_visible).length;
  const hiddenCount = bundle.items.length - visibleCount;
  const matchingInProgress = ["uploaded", "parsing", "matching"].includes(bundle.job.status);
  const canGenerate = !isGenerating && !matchingInProgress && bundle.job.review_required_count === 0 && visibleCount > 0;
  const pdfImageWarningSummary = getLatestCatalogPdfImageWarningSummary(bundle.events);

  return (
    <div className="space-y-4 animate-fade-in">
      <CatalogJobHeader
        jobId={jobId}
        jobName={bundle.job.job_name}
        currentStep="generate"
        jobStatus={bundle.job.status}
        title="Generate PDF"
        description="Review the final catalog summary, then generate or regenerate the PDF before opening the result and publishing hub."
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            <Link href={`/catalogs/${jobId}/page-design`} className={buttonClassName("secondary", "h-auto min-h-9 max-w-full px-3 py-2 text-center text-xs leading-4")}>
              Back to Page Design
            </Link>
            {isPdfReady ? (
              <Link href={`/catalogs/${jobId}/result`} className={buttonClassName("secondary", "h-auto min-h-9 max-w-full px-3 py-2 text-center text-xs leading-4")}>
                Open Result
              </Link>
            ) : null}
            <form action={`/api/jobs/${jobId}/generate-pdf`} method="post">
              <input type="hidden" name="returnTo" value="generate" />
              <Button className="h-auto min-h-9 max-w-full gap-1.5 px-3 py-2 text-center text-xs leading-4" disabled={!canGenerate}>
                {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : latestPdf ? <RefreshCw className="size-3.5" /> : <Play className="size-3.5" />}
                {isGenerating ? "Generating..." : latestPdf ? "Regenerate PDF" : "Generate PDF"}
              </Button>
            </form>
          </div>
        }
        metrics={[
          { label: "Visible products", value: `${visibleCount}` },
          { label: "Hidden products", value: `${hiddenCount}` },
          { label: "Pages", value: bundle.job.page_count ? `${bundle.job.page_count}` : latestPdf ? "Generated" : "Pending" },
        ]}
      />

      {errorMessage ? (
        <StatusBanner
          tone="danger"
          title="PDF generation needs attention"
          description={errorMessage}
        />
      ) : null}

      {isGenerating ? (
        <StatusBanner
          tone="brand"
          title="PDF generation is running"
          description="This step stays available while the background render finishes. You can refresh later or wait for the result page once the PDF is ready."
        />
      ) : null}

      {pdfImageWarningSummary ? (
        <StatusBanner
          tone="warning"
          title="Some images used placeholders in the latest PDF"
          description={formatCatalogPdfImageWarningDescription(pdfImageWarningSummary)}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SurfaceCard>
          <SurfaceCardHeader>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Generation checklist</h2>
              <p className="mt-1 text-xs text-muted">Confirm the job is ready before you start the final PDF render.</p>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Layout preset</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{String((bundle.job.style_options_json as Record<string, unknown> | null)?.layoutPreset ?? "3x3")}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Latest PDF</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{latestPdf ? "Available" : "Not yet"}</p>
              </div>
            </div>

            {matchingInProgress ? (
              <StatusBanner
                tone="warning"
                title="Matching is still in progress"
                description="Wait for matching and review preparation to finish before generating the PDF."
              />
            ) : bundle.job.review_required_count > 0 ? (
              <StatusBanner
                tone="warning"
                title="Review is not fully cleared"
                description="Resolve remaining review-required items before generating the final PDF."
              />
            ) : visibleCount === 0 ? (
              <StatusBanner
                tone="warning"
                title="No visible products to export"
                description="Make at least one product visible in Page Design before generating the final PDF."
              />
            ) : (
              <StatusBanner
                tone="success"
                title="Ready for final PDF generation"
                description="Your job has no review blockers, so you can generate the PDF from this step whenever you are ready."
              />
            )}
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard>
          <SurfaceCardHeader>
            <h2 className="text-sm font-semibold text-foreground">Next action</h2>
          </SurfaceCardHeader>
          <SurfaceCardBody className="space-y-3">
            <p className="text-sm text-muted-strong">
              Use this step whenever you want to create the current PDF output from the latest page design and master card settings.
            </p>
            <form action={`/api/jobs/${jobId}/generate-pdf`} method="post">
              <input type="hidden" name="returnTo" value="generate" />
              <Button className="h-10 w-full gap-2" disabled={!canGenerate}>
                {isGenerating ? <Loader2 className="size-4 animate-spin" /> : latestPdf ? <RefreshCw className="size-4" /> : <Play className="size-4" />}
                {isGenerating ? "Generating..." : latestPdf ? "Regenerate PDF" : "Generate PDF"}
              </Button>
            </form>
            <Link href={`/catalogs/${jobId}/page-design`} className={buttonClassName("secondary", "h-10 w-full text-sm")}>
              Back to Page Design
            </Link>
            {isPdfReady ? (
              <Link href={`/catalogs/${jobId}/result`} className={buttonClassName("secondary", "h-10 w-full text-sm")}>
                Open Result Hub
              </Link>
            ) : null}
          </SurfaceCardBody>
        </SurfaceCard>
      </div>
    </div>
  );
}
