import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCatalogJobBundle } from "@/lib/catalog/repository";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
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
    <div className="space-y-6">
      <Card className="rounded-[34px] p-8">
        <WorkflowStepper jobId={jobId} currentStep="mapping" jobStatus={bundle.job.status} />
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Step 1 — Column mapping"
            title={bundle.job.job_name}
            description="Detected columns and a preview of the normalized import rows before manual matching begins."
          />
          <div className="flex flex-wrap gap-3">
            <Link href={`/catalogs/${jobId}/review`} className={buttonClassName("primary")}>
              Continue to review
            </Link>
            <Link
              href={`/catalogs/${jobId}/preview`}
              className={buttonClassName("secondary")}
            >
              Jump to preview
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-line bg-white/75 p-5">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Detected columns
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              {Object.entries(mapping).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3"
                >
                  <span className="font-medium capitalize text-foreground">{key}</span>
                  <span className="text-muted">{String(value ?? "")}</span>
                </div>
              ))}
            </div>

            {warnings.length ? (
              <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Warnings</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-line bg-white/75 p-5">
            <h3 className="font-display text-xl font-semibold text-foreground">Preview rows</h3>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-line">
              <table className="min-w-full divide-y divide-line text-left text-sm">
                <thead className="bg-white/80 text-muted">
                  <tr>
                    {Object.keys(previewRows[0] ?? {}).map((header) => (
                      <th key={header} className="px-4 py-3 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white/60">
                  {previewRows.map((row, index) => (
                    <tr key={index}>
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="px-4 py-3 text-muted-strong">
                          {String(value ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
