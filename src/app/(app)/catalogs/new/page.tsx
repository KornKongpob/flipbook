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
      <Card className="rounded-[34px] p-8">
        <SectionHeading
          eyebrow="New catalog"
          title="Start from an Excel sheet."
          description="Upload an `.xlsx` file, choose a seeded template, decide how flipbooks should behave, and let the pipeline build a reviewable job."
        />

        <div className="mt-8 rounded-[28px] border border-line bg-white/75 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h3 className="font-display text-xl font-semibold text-foreground">
                Download the import template
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-muted">
                Use the official workbook template so the uploaded file always contains the correct
                column names and required fields.
              </p>
            </div>
            <a href="/api/templates/catalog-import" className={buttonClassName("secondary")}>
              Download Excel template
            </a>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-line bg-white/70 p-4 text-sm">
              <p className="font-semibold text-foreground">Required columns</p>
              <ul className="mt-2 space-y-2 text-muted-strong">
                <li>
                  <span className="font-medium text-foreground">Item number</span>: main Makro Pro
                  lookup key
                </li>
                <li>
                  <span className="font-medium text-foreground">Normal price</span>: shown as the
                  regular price
                </li>
                <li>
                  <span className="font-medium text-foreground">Promo price</span>: shown as the
                  promotional price
                </li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-line bg-white/70 p-4 text-sm">
              <p className="font-semibold text-foreground">Optional column</p>
              <ul className="mt-2 space-y-2 text-muted-strong">
                <li>
                  <span className="font-medium text-foreground">Item name</span>: fallback name
                  when item number matching is not enough
                </li>
                <li>Keep one product per row and do not rename the header row before uploading.</li>
              </ul>
            </div>
          </div>
        </div>

        <form
          action="/api/jobs/import"
          method="post"
          encType="multipart/form-data"
          className="mt-8 grid gap-5 lg:grid-cols-2"
        >
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="jobName">
              Catalog job name
            </label>
            <Input id="jobName" name="jobName" placeholder="April 2026 beverage promotions" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="templateId">
              Template
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
            <label className="text-sm font-medium text-foreground" htmlFor="flipbookMode">
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

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="workbook">
              Excel workbook
            </label>
            <input
              id="workbook"
              name="workbook"
              type="file"
              accept=".xlsx"
              required
              className="block w-full rounded-[24px] border border-dashed border-line-strong bg-white/70 px-4 py-8 text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </div>

          <label className="flex items-center gap-3 rounded-[24px] border border-line bg-white/70 px-4 py-3 text-sm text-muted-strong lg:col-span-2">
            <input type="checkbox" name="reuseManualMappings" defaultChecked className="size-4" />
            Reuse saved manual mappings when the normalized SKU matches.
          </label>

          {params.error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:col-span-2">
              {decodeURIComponent(params.error)}
            </p>
          ) : null}

          <div className="flex items-center justify-end lg:col-span-2">
            <Button>Create catalog job</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
