import { FileSpreadsheet, Download } from "lucide-react";
import { FLIPBOOK_MODE_OPTIONS } from "@/lib/catalog/constants";
import { getActiveTemplates } from "@/lib/catalog/repository";
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">New Catalog</h1>
        <a href="/api/templates/catalog-import" className={`${buttonClassName("secondary")} gap-1.5`}>
          <Download className="size-3.5" />
          Template .xlsx
        </a>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        {/* Column guide */}
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Required columns</p>
          <ul className="space-y-2 text-sm">
            {[["Item number", "SKU / Makro lookup key"], ["Normal price", "Regular retail price"], ["Promo price", "Promotional price"]].map(([name, desc]) => (
              <li key={name}>
                <span className="font-medium text-foreground">{name}</span>
                <span className="block text-xs text-muted">{desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold text-muted uppercase tracking-wide mb-2">Optional</p>
          <p className="text-sm text-muted-strong">Item name — fallback for ambiguous SKU</p>
        </div>

        {/* Import form */}
        <div className="rounded-xl border border-line bg-card p-5">
          <form
            action="/api/jobs/import"
            method="post"
            encType="multipart/form-data"
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="jobName">
                Job name <span className="text-brand">*</span>
              </label>
              <Input id="jobName" name="jobName" placeholder="e.g. April 2026 Beverage Promotions" required />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
              <label className="text-sm font-medium text-foreground" htmlFor="workbook">
                Excel file <span className="text-brand">*</span>
              </label>
              <label
                htmlFor="workbook"
                className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-line px-5 py-5 transition hover:border-brand/40 hover:bg-brand-soft/20"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Click to choose .xlsx file</p>
                  <p className="text-xs text-muted">Excel workbook with product data</p>
                </div>
                <input id="workbook" name="workbook" type="file" accept=".xlsx" required className="sr-only" />
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-strong">
              <input type="checkbox" name="reuseManualMappings" defaultChecked className="size-4 accent-brand" />
              Reuse saved manual mappings
            </label>

            {params.error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {decodeURIComponent(params.error)}
              </p>
            ) : null}

            <Button className="w-full">Create catalog job</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
