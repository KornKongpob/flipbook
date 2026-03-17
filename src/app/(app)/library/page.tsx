import { requireUser } from "@/lib/auth";
import { getLibraryData } from "@/lib/catalog/repository";

export default async function LibraryPage() {
  const user = await requireUser();
  const library = await getLibraryData(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Library</h1>
        <p className="mt-0.5 text-sm text-muted">Saved mappings and cached product assets</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Manual mappings */}
        <div className="rounded-xl border border-line bg-card shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Manual mappings</h2>
            <p className="text-xs text-muted">Reused when normalized SKU matches</p>
          </div>
          <div className="divide-y divide-line">
            {library.mappings.length ? (
              library.mappings.map((mapping) => (
                <div key={mapping.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{mapping.sku}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Image locked: {mapping.locked_image ? "yes" : "no"} · Name locked: {mapping.locked_name ? "yes" : "no"}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-muted">No mappings saved yet.</p>
            )}
          </div>
        </div>

        {/* Asset cache */}
        <div className="rounded-xl border border-line bg-card shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Asset cache</h2>
            <p className="text-xs text-muted">Makro matches and manual uploads</p>
          </div>
          <div className="divide-y divide-line">
            {library.assets.length ? (
              library.assets.map((asset) => (
                <div key={asset.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{asset.product_name}</p>
                  <p className="mt-0.5 text-xs text-muted">{asset.source} · {asset.sku || "No SKU"}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-muted">No assets cached yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
