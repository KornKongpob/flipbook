import { FileSpreadsheet, Download, ChevronRight } from "lucide-react";
import { FLIPBOOK_MODE_OPTIONS } from "@/lib/catalog/constants";
import { getActiveTemplates } from "@/lib/catalog/repository";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button, buttonClassName } from "@/components/ui/button";

export default async function NewCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const templates = await getActiveTemplates();
  const params = await searchParams;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-[34px] p-8">
        <SectionHeading
          eyebrow="New catalog"
          title="Start from an Excel sheet."
          description="Upload an .xlsx file, choose a template, and let the pipeline parse, match, and build a reviewable job automatically."
        />

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted">
          {["Upload Excel", "Auto-match images", "Review & edit", "Generate PDF"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="size-3 text-line-strong" />}
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${i === 0 ? "bg-brand-soft text-brand" : "bg-white/70 text-muted-strong border border-line"}`}>
                <span className="flex size-4 items-center justify-center rounded-full bg-current/10 text-[10px] font-bold">{i + 1}</span>
                {step}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        {/* Template guide */}
        <Card className="rounded-[34px] p-6">
          <SectionHeading
            eyebrow="Before you start"
            title="Download the import template"
            description="Use the official workbook so column names are always recognized correctly."
          />

          <a
            href="/api/templates/catalog-import"
            className={`${buttonClassName("secondary")} mt-5 w-full gap-2`}
          >
            <Download className="size-4" />
            Download Excel template (.xlsx)
          </a>

          <div className="mt-5 space-y-3">
            <div className="rounded-[22px] border border-line bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Required columns</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand/60" />
                  <span><span className="font-medium text-foreground">Item number</span> <span className="text-muted">— Makro Pro lookup key</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand/60" />
                  <span><span className="font-medium text-foreground">Normal price</span> <span className="text-muted">— regular retail price</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand/60" />
                  <span><span className="font-medium text-foreground">Promo price</span> <span className="text-muted">— promotional price</span></span>
                </li>
              </ul>
            </div>

            <div className="rounded-[22px] border border-line bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Optional column</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-line-strong" />
                  <span><span className="font-medium text-foreground">Item name</span> <span className="text-muted">— fallback when SKU lookup is ambiguous</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-line-strong" />
                  <span className="text-muted">One product per row. Do not rename the header row.</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Import form */}
        <Card className="rounded-[34px] p-6">
          <SectionHeading
            eyebrow="Create job"
            title="Import settings"
            description="Configure the job before uploading. You can adjust style options after import."
          />

          <form
            action="/api/jobs/import"
            method="post"
            encType="multipart/form-data"
            className="mt-6 space-y-5"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="jobName">
                Catalog job name <span className="text-brand">*</span>
              </label>
              <Input id="jobName" name="jobName" placeholder="e.g. April 2026 Beverage Promotions" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="templateId">
                  Template <span className="text-brand">*</span>
                </label>
                <Select id="templateId" name="templateId" required defaultValue={templates[0]?.id}>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.variant})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="flipbookMode">
                  Flipbook mode
                </label>
                <Select id="flipbookMode" name="flipbookMode" defaultValue="manual">
                  {FLIPBOOK_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="workbook">
                Excel workbook <span className="text-brand">*</span>
              </label>
              <label
                htmlFor="workbook"
                className="flex cursor-pointer flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-line-strong bg-white/60 px-6 py-8 text-center transition hover:border-brand/40 hover:bg-brand-soft/30"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Click to choose your .xlsx file</p>
                  <p className="mt-1 text-xs text-muted">Excel workbook with product data and prices</p>
                </div>
                <input
                  id="workbook"
                  name="workbook"
                  type="file"
                  accept=".xlsx"
                  required
                  className="sr-only"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-line bg-white/70 px-4 py-3 text-sm text-muted-strong transition hover:bg-white/90">
              <input type="checkbox" name="reuseManualMappings" defaultChecked className="size-4 accent-brand" />
              <span>Reuse saved manual mappings when normalized SKU matches</span>
            </label>

            {params.error ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <p className="font-semibold">Import error</p>
                <p className="mt-1">{decodeURIComponent(params.error)}</p>
              </div>
            ) : null}

            <Button className="w-full">
              Create catalog job
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
