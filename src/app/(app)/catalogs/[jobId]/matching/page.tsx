"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";

interface StatusEvent {
  step: string;
  message: string;
  created_at: string;
}

interface JobStatusData {
  jobName: string;
  status: string;
  totalCount: number;
  matchedCount: number;
  reviewCount: number;
  events: StatusEvent[];
}

const DONE_STATUSES = new Set([
  "needs_review",
  "ready_to_generate",
  "generating_pdf",
  "pdf_ready",
  "completed",
]);

const FAILED_STATUSES = new Set(["failed", "cancelled"]);

const STEP_LABELS: Record<string, string> = {
  upload: "Uploaded source file",
  parse: "Parsed product rows",
  match: "Matching products",
  review: "Review complete",
  pdf: "PDF generated",
  style: "Style updated",
  job: "Job created",
};

function getNextHref(jobId: string, status: string) {
  if (status === "needs_review") return `/catalogs/${jobId}/review`;
  if (["pdf_ready", "completed", "converting_flipbook", "generating_pdf"].includes(status)) {
    return `/catalogs/${jobId}/result`;
  }
  return `/catalogs/${jobId}/master-card`;
}

export default function CatalogMatchingPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [data, setData] = useState<JobStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    params.then(({ jobId: id }) => setJobId(id));
  }, [params]);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/status`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Failed to load status.");
          return;
        }
        const json: JobStatusData = await res.json();
        setData(json);

        if (DONE_STATUSES.has(json.status) && !redirectedRef.current) {
          redirectedRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => router.push(getNextHref(jobId, json.status)), 800);
        }

        if (FAILED_STATUSES.has(json.status)) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setError("Matching failed. Please try again or contact support.");
        }
      } catch {
        setError("Network error while polling status.");
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, router]);

  const isDone = data ? DONE_STATUSES.has(data.status) : false;
  const progress =
    data && data.totalCount > 0
      ? Math.round((data.matchedCount / data.totalCount) * 100)
      : 0;
  const nextHref = jobId && data ? getNextHref(jobId, data.status) : null;
  const actionHref = isDone ? nextHref : null;
  const nextLabel = data?.status === "needs_review" ? "Go to Review" : "Continue to Master Card";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Catalog workflow"
        title={error ? "Matching failed" : isDone ? "Matching complete" : "Matching products"}
        description={
          error
            ? "Something interrupted automatic matching. Review the status details below and try again."
            : isDone
            ? "Automatic matching is finished. You can continue immediately to the next workflow stage."
            : "We’re matching uploaded rows against Makro assets. This screen updates automatically as work progresses."
        }
        actions={
          actionHref ? (
            <Link href={actionHref} className={buttonClassName("primary", "h-10")}>
              {nextLabel}
            </Link>
          ) : null
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Job</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data?.jobName ?? "Preparing job details…"}</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Progress</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data ? `${data.matchedCount} / ${data.totalCount} matched` : "Waiting for first status update"}</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Next step</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {data ? (data.reviewCount > 0 ? `${data.reviewCount} item(s) likely need review` : "Ready for editor when done") : "Determining route"}
            </p>
          </div>
        </div>
      </PageHeader>

      {error ? (
        <StatusBanner tone="danger" title="Matching failed" description={error} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <SurfaceCard>
          <SurfaceCardHeader>
            <div className="flex items-center gap-2">
              {error ? (
                <AlertCircle className="size-5 text-rose-500" />
              ) : isDone ? (
                <CheckCircle className="size-5 text-emerald-500" />
              ) : (
                <Loader2 className="size-5 animate-spin text-brand" />
              )}
              <div>
                <h2 className="text-sm font-semibold text-foreground">Matching status</h2>
                <p className="mt-1 text-xs text-muted">
                  {error
                    ? "The workflow stopped before completion."
                    : isDone
                    ? "The job finished matching and is ready for the next stage."
                    : "Automatic matching is running in the background."}
                </p>
              </div>
            </div>
          </SurfaceCardHeader>

          <SurfaceCardBody className="space-y-5">
            {!error && data ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Progress</span>
                    <span className="font-bold text-brand">{progress}%</span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-white/70 px-4 py-3 text-center">
                    <p className="text-base font-bold text-foreground">{data.totalCount}</p>
                    <p className="mt-1 text-xs text-muted">Total products</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
                    <p className="text-base font-bold text-emerald-700">{data.matchedCount}</p>
                    <p className="mt-1 text-xs text-emerald-600">Matched</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                    <p className="text-base font-bold text-amber-700">{Math.max(data.totalCount - data.matchedCount, 0)}</p>
                    <p className="mt-1 text-xs text-amber-600">Pending</p>
                  </div>
                </div>

                {isDone && nextHref ? (
                  <div className="rounded-xl border border-brand/20 bg-brand-soft/10 px-4 py-4">
                    <p className="text-sm font-semibold text-foreground">Next step ready</p>
                    <p className="mt-1 text-sm text-muted-strong">
                      {data.reviewCount > 0
                        ? `We found ${data.reviewCount} item(s) that still need human review.`
                        : "No review blockers detected. You can continue straight into the editor."}
                    </p>
                    <Link href={nextHref} className={`${buttonClassName("primary")} mt-4 inline-flex`}>
                      {nextLabel}
                    </Link>
                  </div>
                ) : null}
              </>
            ) : !error ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-3 rounded-full bg-gray-100 w-3/4" />
                <div className="h-3 rounded-full bg-gray-100 w-full" />
                <div className="h-3 rounded-full bg-gray-100 w-2/3" />
              </div>
            ) : null}
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard>
          <SurfaceCardHeader>
            <h2 className="text-sm font-semibold text-foreground">Activity timeline</h2>
            <p className="mt-1 text-xs text-muted">Latest backend events from parsing through matching.</p>
          </SurfaceCardHeader>

          <SurfaceCardBody>
            {!error && data?.events && data.events.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto thin-scrollbar">
                {data.events.map((event, index) => (
                  <div key={`${event.step}-${event.created_at}-${index}`} className="flex items-start gap-3 rounded-xl border border-line bg-white/70 px-3 py-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Clock className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {STEP_LABELS[event.step] ?? event.step}
                      </p>
                      <p className="mt-1 text-sm text-foreground">{event.message}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Waiting for matching events…</p>
            )}
          </SurfaceCardBody>
        </SurfaceCard>
      </div>
    </div>
  );
}
