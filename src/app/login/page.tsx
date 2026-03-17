import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getSetupDiagnostics } from "@/lib/env";
import { signInAction, signInAnonymouslyAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">

        {/* Left panel — marketing / feature overview */}
        <Card className="noise-grid overflow-hidden rounded-[36px] p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand shadow-[0_6px_18px_rgba(235,69,41,0.3)]">
              <BookOpen className="size-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">Promo Studio</p>
              <p className="font-display text-sm font-bold text-foreground">Catalog Workflow</p>
            </div>
          </div>

          <div className="mt-8">
            <h1 className="font-display text-3xl font-semibold leading-snug tracking-tight text-foreground lg:text-4xl">
              Upload promotions,<br />review images,<br />
              <span className="text-brand">publish clean PDFs.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">
              Promo Catalog Studio is built for internal sales teams that need reliable Makro-style catalog generation with a fast manual review path.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {steps.map((item) => (
              <div
                key={item.step}
                className="rounded-[24px] border border-line bg-white/75 p-4"
              >
                <p className="font-display text-xs font-bold tracking-[0.18em] text-brand opacity-60">
                  {item.step}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Right panel — sign in form */}
        <Card className="rounded-[36px] p-8 lg:p-10">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Internal access</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">Sign in</h2>
            <p className="text-sm text-muted">Use your team account to access catalog jobs.</p>
          </div>

          <form action={signInAction} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="email">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="team@company.com" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="password">
                Password
              </label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>

            {errorMessage ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <p className="font-semibold">Sign-in failed</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            ) : null}

            {!diagnostics.supabaseClient ? (
              <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Setup required</p>
                <p className="mt-0.5">Fill in the <code className="rounded bg-amber-100 px-1">.env.local</code> environment variables before signing in.</p>
              </div>
            ) : null}

            <Button className="w-full" disabled={!diagnostics.supabaseClient}>
              Sign in
            </Button>
          </form>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form action={signInAnonymouslyAction} className="mt-3">
            <Button variant="secondary" className="w-full">
              Continue as guest
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Guest access has limited permissions. Sign in with a team account for full access.
          </p>
        </Card>
      </div>
    </main>
  );
}
