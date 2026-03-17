import { FLIPBOOK_MODE_OPTIONS } from "@/lib/catalog/constants";
import { getActiveTemplates } from "@/lib/catalog/repository";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
