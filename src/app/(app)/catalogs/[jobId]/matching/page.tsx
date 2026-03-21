"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";

interface StatusEvent {
  step: string;
  message: string;
  created_at: string;
}

interface JobStatusData {
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
          setTimeout(() => router.push(`/catalogs/${jobId}/review`), 800);
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

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header card */}
        <div className="rounded-2xl border border-line bg-card p-8 shadow-sm text-center space-y-2">
          {error ? (
            <AlertCircle className="mx-auto size-12 text-rose-400" />
          ) : isDone ? (
            <CheckCircle className="mx-auto size-12 text-emerald-500" />
          ) : (
            <Loader2 className="mx-auto size-12 text-brand animate-spin" />
          )}

          <h1 className="mt-4 text-xl font-bold text-foreground">
            {error
              ? "Matching Failed"
              : isDone
              ? "Matching Complete!"
              : "Matching Products…"}
          </h1>
          <p className="text-sm text-muted">
            {error
              ? error
              : isDone
              ? "Redirecting to review…"
              : "Finding product images from Makro. This may take a moment."}
          </p>
        </div>

        {/* Progress bar */}
        {!error && data && (
          <div className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Progress</span>
              <span className="font-bold text-brand">
                {data.matchedCount} / {data.totalCount}
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="font-bold text-foreground text-base">{data.totalCount}</p>
                <p className="text-muted mt-0.5">Total products</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <p className="font-bold text-emerald-700 text-base">{data.matchedCount}</p>
                <p className="text-emerald-600 mt-0.5">Matched</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                <p className="font-bold text-amber-700 text-base">{data.totalCount - data.matchedCount}</p>
                <p className="text-amber-600 mt-0.5">Pending</p>
              </div>
            </div>
          </div>
        )}

        {/* Live event log */}
        {!error && data?.events && data.events.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Activity
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar">
              {data.events.map((event, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <Clock className="mt-0.5 size-3.5 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">
                      {STEP_LABELS[event.step] ?? event.step}
                    </span>
                    <span className="text-muted"> — {event.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder skeleton while loading first data */}
        {!error && !data && (
          <div className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-3 animate-pulse">
            <div className="h-3 rounded-full bg-gray-100 w-3/4" />
            <div className="h-3 rounded-full bg-gray-100 w-full" />
            <div className="h-3 rounded-full bg-gray-100 w-2/3" />
          </div>
        )}
      </div>
    </div>
  );
}
