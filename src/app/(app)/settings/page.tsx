import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSetupDiagnostics } from "@/lib/env";

export default function SettingsPage() {
  const diagnostics = getSetupDiagnostics();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="rounded-[34px] p-6">
        <SectionHeading
          eyebrow="Environment"
          title="Deployment diagnostics"
          description="Use these checks before pushing to Vercel or handing the workspace to another operator."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Supabase URL + anon key", diagnostics.supabaseClient],
            ["Supabase service role", diagnostics.supabaseServiceRole],
            ["Heyzine client_id", diagnostics.heyzineClientId],
            ["Heyzine API key", diagnostics.heyzineApiKey],
          ].map(([label, ok]) => (
            <div
              key={String(label)}
              className="rounded-[24px] border border-line bg-white/75 p-4"
            >
              <p className="text-sm font-medium text-muted">{label}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {ok ? "Configured" : "Missing / optional"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[34px] p-6">
        <SectionHeading
          eyebrow="Operational notes"
          title="Default production posture"
          description="These are the assumptions baked into the app and Supabase schema."
        />

        <div className="mt-6 space-y-3 text-sm leading-6 text-muted-strong">
          <p>Jobs, generated PDFs, and manual assets are private by default.</p>
          <p>Makro search is best-effort and should be reviewed when confidence is not high.</p>
          <p>PDF generation is server-side and deterministic using PDFKit with Sarabun fonts for Thai support.</p>
          <p>Flipbooks stay optional; the PDF is always the primary source artifact.</p>
        </div>
      </Card>
    </div>
  );
}
