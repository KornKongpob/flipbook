import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSetupDiagnostics } from "@/lib/env";
import { signInAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";

const errorMap: Record<string, string> = {
  missing_env: "Supabase environment variables are missing.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const diagnostics = getSetupDiagnostics();
  const errorParam = params.error;
  const errorMessage = errorParam
    ? errorMap[errorParam] ?? decodeURIComponent(errorParam)
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="noise-grid overflow-hidden rounded-[36px] p-8 lg:p-10">
          <SectionHeading
            eyebrow="Internal catalog workflow"
            title="Upload promotions, review images, publish clean PDFs."
            description="Promo Catalog Studio is built for internal sales teams that need reliable Makro-style catalog generation with manual review where it matters."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Excel import",
                description:
                  "Validate columns, normalize prices, and lock the source workbook into storage.",
              },
              {
                title: "Asset review",
                description:
                  "Auto-match by SKU first, then name similarity, with a manual rescue path for uncertain products.",
              },
              {
                title: "A4 PDF output",
                description:
                  "Generate deterministic 3x3 printable pages and keep a flipbook-ready PDF workflow.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-line bg-white/75 p-5"
              >
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[36px] p-8 lg:p-10">
          <SectionHeading
            eyebrow="Secure access"
            title="Sign in"
            description="Use your Supabase-authenticated internal account to access catalog jobs and stored files."
          />

          <form action={signInAction} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="team@company.com" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <Input id="password" name="password" type="password" required />
            </div>

            {errorMessage ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            {!diagnostics.supabaseClient ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Supabase is not configured yet. Fill in [`.env.example`](/Users/Teera/OneDrive/Documents/New%20project/.env.example) values before signing in.
              </p>
            ) : null}

            <Button className="w-full">Sign in</Button>
          </form>

          <div className="mt-8 rounded-[28px] border border-line bg-white/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Environment diagnostics
            </p>
            <div className="mt-3 space-y-2 text-sm text-muted-strong">
              <p>Supabase client: {diagnostics.supabaseClient ? "configured" : "missing"}</p>
              <p>Service role: {diagnostics.supabaseServiceRole ? "configured" : "missing"}</p>
              <p>Heyzine client_id: {diagnostics.heyzineClientId ? "configured" : "optional"}</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
