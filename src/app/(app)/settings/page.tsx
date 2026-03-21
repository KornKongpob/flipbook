import { getSetupDiagnostics } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";

export default function SettingsPage() {
  const diagnostics = getSetupDiagnostics();
  const missingCount = [
    diagnostics.supabaseClient,
    diagnostics.supabaseServiceRole,
    diagnostics.heyzineClientId,
    diagnostics.heyzineApiKey,
  ].filter((value) => !value).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="System diagnostics"
        title="Settings"
        description="Review environment readiness for Supabase, PDF generation, and Heyzine flipbook integration."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Configuration health</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {missingCount === 0 ? "All required integrations are configured" : `${missingCount} configuration item(s) missing`}
            </p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Primary output</p>
            <p className="mt-2 text-sm font-semibold text-foreground">PDF remains the primary artifact for every workflow</p>
          </div>
        </div>
      </PageHeader>

      {missingCount > 0 ? (
        <StatusBanner
          tone="warning"
          title="Some integrations are not fully configured"
          description="The app can still run partially, but missing keys may block login, PDF export, or Heyzine publishing."
        />
      ) : (
        <StatusBanner
          tone="success"
          title="Environment looks healthy"
          description="Core services are configured and ready for normal catalog operations."
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <SurfaceCard className="overflow-hidden">
          <SurfaceCardHeader>
            <h2 className="text-sm font-semibold text-foreground">Environment variables</h2>
          </SurfaceCardHeader>
          <div className="divide-y divide-line">
            {[
              ["Supabase URL + anon key", diagnostics.supabaseClient],
              ["Supabase service role", diagnostics.supabaseServiceRole],
              ["Heyzine client_id", diagnostics.heyzineClientId],
              ["Heyzine API key", diagnostics.heyzineApiKey],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="mt-1 text-xs text-muted">{ok ? "Available in the current environment" : "Missing from the current environment"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {ok ? "Configured" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SurfaceCardBody>
            <h2 className="text-sm font-semibold text-foreground mb-3">Operational notes</h2>
            <ul className="space-y-2 text-sm text-muted-strong">
              <li>Jobs and PDFs are private by default.</li>
              <li>Makro search is best-effort — review low-confidence matches.</li>
              <li>PDF uses PDFKit with Sarabun for Thai text.</li>
              <li>Flipbooks are optional; PDF is always the primary artifact.</li>
            </ul>
          </SurfaceCardBody>
        </SurfaceCard>
      </div>
    </div>
  );
}
