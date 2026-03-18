import { duplicateJobAction } from "@/app/(app)/actions";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle, getLatestPdfFile } from "@/lib/catalog/repository";
import { Download, FileText, ExternalLink, RefreshCw, AlertCircle, Copy } from "lucide-react";

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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Catalog Generated</h1>
          <p className="mt-1 text-sm text-muted">Your PDF catalog is ready to download or publish.</p>
        </div>
        <WorkflowStepper jobId={jobId} currentStep="result" jobStatus={bundle.job.status} />
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-rose-800">Issue with Generation</h3>
            <p className="mt-1 text-sm text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left Column: PDF & Flipbook Actions */}
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
            <div className="border-b border-line bg-gray-50/50 px-5 py-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-brand" />
                Your Files
              </h2>
            </div>
            
            <div className="p-5 space-y-6">
              {/* PDF Download */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">PDF File</h3>
                {latestPdf ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-line p-4 bg-gray-50/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bundle.job.job_name}.pdf</p>
                      <p className="text-xs text-muted mt-0.5">{bundle.job.page_count} pages • Generated {new Date(latestPdf.created_at).toLocaleDateString()}</p>
                    </div>
                    <a
                      href={`/api/files/${latestPdf.id}/download`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover transition-colors whitespace-nowrap"
                    >
                      <Download className="size-4" />
                      Download PDF
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted italic">No PDF generated yet.</p>
                )}
              </div>

              {/* Flipbook Section */}
              {bundle.job.flipbook_mode !== "disabled" && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Digital Flipbook</h3>
                  
                  {bundle.flipbook?.flipbook_url ? (
                    <div className="rounded-lg border border-brand/30 bg-brand-soft/10 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-brand">Ready to share!</p>
                          <p className="text-xs text-muted-strong mt-1 line-clamp-1">{bundle.flipbook.flipbook_url}</p>
                        </div>
                        <a
                          href={bundle.flipbook.flipbook_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white border border-brand/20 text-brand px-4 text-sm font-medium hover:bg-brand-soft/20 transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="size-4" />
                          Open Flipbook
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-line p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {bundle.job.flipbook_mode === "manual" ? "Manual Upload Mode" : "Not generated yet"}
                          </p>
                          <p className="text-xs text-muted mt-1 max-w-[300px]">
                            {bundle.job.flipbook_mode === "manual" 
                              ? "Download the PDF above and upload it directly to Heyzine."
                              : "Click below to send the PDF to Heyzine and generate a digital flipbook."}
                          </p>
                        </div>
                        {bundle.job.flipbook_mode === "client_id" && (
                          <form action={`/api/jobs/${jobId}/flipbook`} method="post">
                            <Button className="h-10 gap-2 whitespace-nowrap">
                              <RefreshCw className="size-4" />
                              Generate Flipbook
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Actions */}
        <div className="space-y-5">
          {/* Stats Card */}
          <div className="rounded-xl border border-line bg-card shadow-sm p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-strong">Total Pages</span>
                <span className="text-base font-bold text-foreground">{bundle.job.page_count || "—"}</span>
              </div>
              <div className="h-px w-full bg-line" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-strong">Products Included</span>
                <span className="text-base font-bold text-foreground">{bundle.items.filter(i => i.is_visible).length}</span>
              </div>
              <div className="h-px w-full bg-line" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-strong">Excluded/Hidden</span>
                <span className="text-base font-bold text-muted">{bundle.items.filter(i => !i.is_visible).length}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-line bg-card shadow-sm p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Actions</h3>
            <div className="space-y-3">
              <form action={duplicateJobAction}>
                <input type="hidden" name="jobId" value={jobId} />
                <Button variant="secondary" className="w-full justify-start gap-2 h-10 border-line hover:bg-gray-50">
                  <Copy className="size-4 text-muted-strong" />
                  <span className="text-foreground font-medium">Duplicate Catalog</span>
                </Button>
              </form>
              <a 
                href="/catalogs/new" 
                className="flex w-full items-center justify-start gap-2 rounded-lg bg-gray-50 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-gray-100"
              >
                <span className="flex size-5 items-center justify-center rounded bg-white text-brand shadow-sm text-lg leading-none">+</span>
                Create New Catalog
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
