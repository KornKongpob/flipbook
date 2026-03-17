import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getSetupDiagnostics } from "@/lib/env";
import { signInAction, signInAnonymouslyAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const errorMap: Record<string, string> = {
  missing_env: "Supabase environment variables are not configured.",
};

const steps = [
  {
    step: "01",
    title: "Excel import",
    description: "Upload your promo spreadsheet — prices and SKUs are validated automatically.",
  },
  {
    step: "02",
    title: "Image matching",
    description: "SKUs are matched to Makro assets automatically. Uncertain items go to manual review.",
  },
  {
    step: "03",
    title: "Page preview",
    description: "Arrange products, adjust names, and preview the 3×3 A4 grid before export.",
  },
  {
    step: "04",
    title: "PDF & flipbook",
    description: "Generate a print-ready PDF and optionally push to Heyzine for a digital flipbook.",
  },
];

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
    <main className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:bg-slate-900 lg:px-12 lg:py-16">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand">
            <BookOpen className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Catalog Studio</p>
            <p className="text-xs text-slate-400">Promo workflow</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white leading-tight">
          Upload promotions,<br />review images,<br />
          <span className="text-brand">publish clean PDFs.</span>
        </h1>

        <div className="mt-10 grid grid-cols-2 gap-3">
          {steps.map((item) => (
            <div key={item.step} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold text-brand/70">{item.step}</p>
              <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 lg:max-w-md">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-brand">
              <BookOpen className="size-3.5 text-white" />
            </div>
            <p className="text-sm font-semibold text-foreground">Catalog Studio</p>
          </div>

          <h2 className="text-xl font-bold text-foreground">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Access your catalog jobs.</p>

          <form action={signInAction} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
              <Input id="email" name="email" type="email" required placeholder="team@company.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>

            {errorMessage && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{errorMessage}</p>
            )}
            {!diagnostics.supabaseClient && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                Configure <code>.env.local</code> before signing in.
              </p>
            )}

            <Button className="w-full" disabled={!diagnostics.supabaseClient}>Sign in</Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form action={signInAnonymouslyAction}>
            <Button variant="secondary" className="w-full">Continue as guest</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
