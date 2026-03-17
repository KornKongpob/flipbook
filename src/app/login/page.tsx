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
      <div className="hidden lg:flex lg:w-[55%] lg:flex-col lg:justify-center lg:bg-gradient-to-br lg:from-sidebar lg:via-gray-900 lg:to-brand/60 lg:px-14 lg:py-16 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-64 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-purple-500 shadow-lg shadow-brand/30">
              <BookOpen className="size-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Catalog Studio</p>
              <p className="text-xs text-white/50">Promo workflow v2</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white leading-[1.15]">
            Upload promotions,<br />review images,<br />
            <span className="gradient-text bg-gradient-to-r from-indigo-300 to-purple-300" style={{ WebkitTextFillColor: "transparent", backgroundClip: "text" }}>publish clean PDFs.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
            Built for teams that need reliable catalog generation with Makro product matching and fast manual review.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4 transition hover:bg-white/[0.07]">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-brand/20 text-[10px] font-bold text-brand">{item.step}</span>
                <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-purple-500">
              <BookOpen className="size-4 text-white" />
            </div>
            <span className="text-base font-bold text-foreground">Catalog Studio</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Sign in to access your catalog jobs.</p>

          <form action={signInAction} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
              <Input id="email" name="email" type="email" required placeholder="team@company.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                <span className="shrink-0 mt-0.5 status-dot status-dot-danger" />
                {errorMessage}
              </div>
            )}
            {!diagnostics.supabaseClient && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                <span className="shrink-0 mt-0.5 status-dot status-dot-warning" />
                Configure <code className="rounded bg-amber-100/80 px-1">.env.local</code> first.
              </div>
            )}

            <Button className="w-full h-10" disabled={!diagnostics.supabaseClient}>Sign in</Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form action={signInAnonymouslyAction}>
            <Button variant="secondary" className="w-full h-10">Continue as guest</Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Guest accounts have limited access. Use a team account for full features.
          </p>
        </div>
      </div>
    </main>
  );
}
