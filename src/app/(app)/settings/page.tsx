import { getSetupDiagnostics } from "@/lib/env";

export default function SettingsPage() {
  const diagnostics = getSetupDiagnostics();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Environment and deployment diagnostics</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-line bg-card shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Environment variables</h2>
          </div>
          <div className="divide-y divide-line">
            {[
              ["Supabase URL + anon key", diagnostics.supabaseClient],
              ["Supabase service role", diagnostics.supabaseServiceRole],
              ["Heyzine client_id", diagnostics.heyzineClientId],
              ["Heyzine API key", diagnostics.heyzineApiKey],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-foreground">{label}</p>
                <span className={`text-xs font-semibold ${ ok ? "text-success" : "text-muted"}`}>
                  {ok ? "✓ Configured" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">Notes</h2>
          <ul className="space-y-2 text-sm text-muted-strong">
            <li>Jobs and PDFs are private by default.</li>
            <li>Makro search is best-effort — review low-confidence matches.</li>
            <li>PDF uses PDFKit with Sarabun for Thai text.</li>
            <li>Flipbooks are optional; PDF is always the primary artifact.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
