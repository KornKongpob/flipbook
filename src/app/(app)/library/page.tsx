import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireUser } from "@/lib/auth";
import { getLibraryData } from "@/lib/catalog/repository";

export default async function LibraryPage() {
  const user = await requireUser();
  const library = await getLibraryData(user.id);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-[34px] p-6">
        <SectionHeading
          eyebrow="Manual mappings"
          title="Reusable overrides"
          description="Mappings saved during review are reused whenever the normalized SKU appears again."
        />

        <div className="mt-6 space-y-3">
          {library.mappings.length ? (
            library.mappings.map((mapping) => (
              <div key={mapping.id} className="rounded-[24px] border border-line bg-white/70 p-4">
                <p className="text-sm font-semibold text-foreground">{mapping.sku}</p>
                <p className="mt-1 text-xs text-muted">
                  locked image: {mapping.locked_image ? "yes" : "no"} • locked name:{" "}
                  {mapping.locked_name ? "yes" : "no"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No manual mappings saved yet.</p>
          )}
        </div>
      </Card>

      <Card className="rounded-[34px] p-6">
        <SectionHeading
          eyebrow="Asset cache"
          title="Recent product assets"
          description="Makro matches and manual uploads are stored here so later jobs can reuse them."
        />

        <div className="mt-6 space-y-3">
          {library.assets.map((asset) => (
            <div key={asset.id} className="rounded-[24px] border border-line bg-white/70 p-4">
              <p className="text-sm font-semibold text-foreground">{asset.product_name}</p>
              <p className="mt-1 text-xs text-muted">
                {asset.source} • {asset.sku || "No SKU"}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
