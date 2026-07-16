import { ChevronRight } from "lucide-react";
import { getActiveTemplates } from "@/lib/catalog/repository";
import { PageHeader } from "@/components/ui/page-header";
import { NewCatalogForm } from "@/components/catalog/new-catalog-form";

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
            <p className="mt-2 text-sm font-semibold text-foreground">Promotion or slab price workbook</p>
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

      <NewCatalogForm
        templates={templates.map((template) => ({ id: template.id, name: template.name, variant: template.variant }))}
        error={params.error}
      />
    </div>
  );
}
