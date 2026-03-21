import { BookImage, Link2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLibraryData } from "@/lib/catalog/repository";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard, SurfaceCardHeader } from "@/components/ui/surface-card";

export default async function LibraryPage() {
  const user = await requireUser();
  const library = await getLibraryData(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Workspace assets"
        title="Library"
        description="Browse reusable manual mappings and cached product assets that speed up future catalog jobs."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Manual mappings</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{library.mappings.length} reusable SKU rule(s)</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Asset cache</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{library.assets.length} cached product asset(s)</p>
          </div>
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-2">
        <SurfaceCard className="overflow-hidden">
          <SurfaceCardHeader>
            <h2 className="text-sm font-semibold text-foreground">Manual mappings</h2>
            <p className="text-xs text-muted">Reused when normalized SKU matches</p>
          </SurfaceCardHeader>
          <div className="divide-y divide-line">
            {library.mappings.length ? (
              library.mappings.map((mapping) => (
                <div key={mapping.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Link2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{mapping.sku}</p>
                      <p className="mt-1 text-xs text-muted">
                        Image locked: {mapping.locked_image ? "yes" : "no"} · Name locked: {mapping.locked_name ? "yes" : "no"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Link2}
                title="No mappings saved yet"
                description="Manual approvals will start to build a reusable SKU mapping library here."
              />
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden">
          <SurfaceCardHeader>
            <h2 className="text-sm font-semibold text-foreground">Asset cache</h2>
            <p className="text-xs text-muted">Makro matches and manual uploads</p>
          </SurfaceCardHeader>
          <div className="divide-y divide-line">
            {library.assets.length ? (
              library.assets.map((asset) => (
                <div key={asset.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <BookImage className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{asset.product_name}</p>
                      <p className="mt-1 text-xs text-muted">{asset.source} · {asset.sku || "No SKU"}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={BookImage}
                title="No assets cached yet"
                description="Matched Makro assets and manual uploads will appear here for reuse in future jobs."
              />
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
