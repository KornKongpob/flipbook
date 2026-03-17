import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle } from "@/lib/catalog/repository";
import { buttonClassName } from "@/components/ui/button";
import { WorkflowStepper } from "@/components/catalog/workflow-stepper";

export default async function CatalogMappingPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireUser();
  const bundle = await getCatalogJobBundle(jobId, user.id);
  const mappingMeta =
    bundle.job.column_mapping_json &&
    typeof bundle.job.column_mapping_json === "object" &&
    !Array.isArray(bundle.job.column_mapping_json)
      ? (bundle.job.column_mapping_json as Record<string, unknown>)
      : {};
  const rawMapping = mappingMeta.mapping;
  const mapping =
    rawMapping && typeof rawMapping === "object" && !Array.isArray(rawMapping)
      ? (rawMapping as Record<string, unknown>)
      : {};
  const rawWarnings = mappingMeta.warnings;
  const warnings = Array.isArray(rawWarnings)
    ? rawWarnings.map((warning) => String(warning))
    : [];
  const rawPreviewRows = mappingMeta.previewRows;
  const previewRows = Array.isArray(rawPreviewRows)
    ? rawPreviewRows.filter(
        (row): row is Record<string, string | number | null> =>
          Boolean(row) && typeof row === "object" && !Array.isArray(row),
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <WorkflowStepper jobId={jobId} currentStep="mapping" jobStatus={bundle.job.status} />
          <div className="flex shrink-0 gap-2">
            <Link href={`/catalogs/${jobId}/review`} className={buttonClassName("primary")}>Continue</Link>
          </div>
        </div>
        <h1 className="mt-3 text-base font-semibold text-foreground">{bundle.job.job_name}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Columns */}
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Detected columns</p>
          <div className="space-y-1.5 text-sm">
            {Object.entries(mapping).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                <span className="font-medium capitalize text-foreground">{key}</span>
                <span className="text-muted text-xs">{String(value ?? "")}</span>
              </div>
            ))}
          </div>
          {warnings.length ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-800 mb-1">Warnings</p>
              {warnings.map((w) => <p key={w} className="text-xs text-amber-700">{w}</p>)}
            </div>
          ) : null}
        </div>

        {/* Preview rows */}
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Preview rows</p>
          <div className="overflow-auto rounded-lg border border-line">
            <table className="min-w-full divide-y divide-line text-left text-xs">
              <thead className="bg-background">
                <tr>
                  {Object.keys(previewRows[0] ?? {}).map((h) => (
                    <th key={h} className="px-3 py-2 font-medium text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-background/60">
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k} className="px-3 py-2 text-foreground whitespace-nowrap">{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
