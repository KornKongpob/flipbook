import { Download, ChevronRight } from "lucide-react";
import { FLIPBOOK_MODE_OPTIONS } from "@/lib/catalog/constants";
import { getActiveTemplates } from "@/lib/catalog/repository";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Button, buttonClassName } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { StatusBanner } from "@/components/ui/status-banner";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";

const steps = ["Upload Excel", "Auto-match", "Review", "Generate PDF"];

export default async function NewCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const templates = await getActiveTemplates();
  const params = await searchParams;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Catalog workflow"
        title="Create a new catalog"
        description="Set up the job, choose the export mode, and upload the workbook that starts the matching pipeline."
        actions={
          <a href="/api/templates/catalog-import" className={`${buttonClassName("secondary")} gap-1.5`}>
            <Download className="size-3.5" />
            Download template
          </a>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Workflow</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Upload → Match → Review → Export</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Templates</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{templates.length} active layout option(s)</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Source</p>
            <p className="mt-2 text-sm font-semibold text-foreground">Excel workbook (.xlsx)</p>
          </div>
        </div>
      </PageHeader>

      <div className="flex items-center gap-1 rounded-2xl border border-line bg-card p-3 shadow-sm">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-muted shrink-0" />}
            <span className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition ${i === 0 ? "bg-brand text-white" : "text-muted"}`}>
              <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? "bg-white/20 text-white" : "bg-gray-100 text-muted"}`}>{i + 1}</span>
              {step}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <SurfaceCard>
          <SurfaceCardHeader>
            <h2 className="text-sm font-semibold text-foreground">Spreadsheet checklist</h2>
            <p className="mt-1 text-xs text-muted">Make sure the workbook has the minimum columns we expect.</p>
          </SurfaceCardHeader>
          <SurfaceCardBody>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Required columns</p>
            <ul className="space-y-3 text-sm">
              {[["Item number", "SKU / Makro lookup key"], ["Normal price", "Regular retail price"], ["Promo price", "Promotional price"]].map(([name, desc]) => (
                <li key={name} className="flex items-start gap-2.5">
                  <span className="mt-1.5 status-dot status-dot-brand" />
                  <div>
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="block text-xs text-muted mt-0.5">{desc}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Optional</p>
              <p className="text-sm text-muted-strong">Item name — fallback for ambiguous SKU</p>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard>
          <SurfaceCardHeader>
            <h2 className="text-sm font-semibold text-foreground">Job setup</h2>
            <p className="mt-1 text-xs text-muted">Define the catalog, choose the output mode, and upload the workbook.</p>
          </SurfaceCardHeader>
          <SurfaceCardBody>
          <form
            action="/api/jobs/import"
            method="post"
            encType="multipart/form-data"
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="jobName">
                Job name <span className="text-brand">*</span>
              </label>
              <Input id="jobName" name="jobName" placeholder="e.g. April 2026 Beverage Promotions" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="templateId">Template</label>
              <Select id="templateId" name="templateId" required defaultValue={templates[0]?.id}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.variant})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-foreground">Flipbook integration</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {FLIPBOOK_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="relative flex cursor-pointer flex-col rounded-xl border border-line bg-card p-4 shadow-sm hover:border-brand/50 hover:bg-brand-soft/10 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/20 transition-all"
                  >
                    <input
                      type="radio"
                      name="flipbookMode"
                      value={option.value}
                      defaultChecked={option.value === "client_id"}
                      className="peer sr-only"
                    />
                    <span className="text-sm font-semibold text-foreground mb-1">{option.label}</span>
                    <span className="text-xs text-muted leading-relaxed">{option.description}</span>
                    <div className="absolute right-4 top-4 hidden size-4 items-center justify-center rounded-full bg-brand text-white peer-checked:flex">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-foreground">
                Excel file <span className="text-brand">*</span>
              </label>
              <FileDropzone name="workbook" accept=".xlsx" required id="workbook" />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-gray-50/50 px-4 py-3 text-sm text-muted-strong transition hover:bg-gray-50">
              <input type="checkbox" name="reuseManualMappings" defaultChecked className="size-4 rounded accent-brand" />
              Reuse saved manual mappings when SKU matches
            </label>

            {params.error && (
              <StatusBanner tone="danger" title="Could not create the catalog job" description={decodeURIComponent(params.error)} />
            )}

            <Button className="w-full h-10 text-base">Create catalog job</Button>
          </form>
          </SurfaceCardBody>
        </SurfaceCard>
      </div>
    </div>
  );
}
