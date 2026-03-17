import { Download, ChevronRight } from "lucide-react";
import { FLIPBOOK_MODE_OPTIONS } from "@/lib/catalog/constants";
import { getActiveTemplates } from "@/lib/catalog/repository";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button, buttonClassName } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">New Catalog</h1>
          <p className="mt-0.5 text-sm text-muted">Upload a product spreadsheet to start a new catalog job.</p>
        </div>
        <a href="/api/templates/catalog-import" className={`${buttonClassName("secondary")} gap-1.5`}>
          <Download className="size-3.5" />
          Download template
        </a>
      </div>

      {/* Step pipeline */}
      <div className="flex items-center gap-1 rounded-xl border border-line bg-card p-3 shadow-sm">
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
        {/* Column guide */}
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
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
          <div className="mt-5 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Optional</p>
            <p className="text-sm text-muted-strong">Item name — fallback for ambiguous SKU</p>
          </div>
        </div>

        {/* Import form */}
        <div className="rounded-xl border border-line bg-card p-6 shadow-sm">
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

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="flipbookMode">Flipbook mode</label>
                <Select id="flipbookMode" name="flipbookMode" defaultValue="manual">
                  {FLIPBOOK_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
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
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {decodeURIComponent(params.error)}
              </div>
            )}

            <Button className="w-full h-10 text-base">Create catalog job</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
