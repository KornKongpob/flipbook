import type { EventRow } from "@/components/catalog/types";
import type { CatalogJobStatus } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";

const stepOrder: Array<{ key: CatalogJobStatus; label: string }> = [
  { key: "uploaded", label: "Upload" },
  { key: "parsing", label: "Parse rows" },
  { key: "matching", label: "Match assets" },
  { key: "needs_review", label: "Review" },
  { key: "ready_to_generate", label: "Ready" },
  { key: "generating_pdf", label: "Generate PDF" },
  { key: "pdf_ready", label: "PDF ready" },
  { key: "converting_flipbook", label: "Flipbook" },
  { key: "completed", label: "Completed" },
];

interface GenerationTimelineProps {
  status: CatalogJobStatus;
  events: EventRow[];
}

export function GenerationTimeline({ status, events }: GenerationTimelineProps) {
  const activeIndex = stepOrder.findIndex((entry) => entry.key === status);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-3 rounded-[28px] border border-line bg-white/70 p-5">
        {stepOrder.map((step, index) => {
          const active = index <= activeIndex || step.key === status;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${active ? "bg-brand" : "bg-line-strong"}`}
              />
              <div className="flex items-center gap-2">
                <span className={`text-sm ${active ? "font-semibold text-foreground" : "text-muted"}`}>
                  {step.label}
                </span>
                {status === step.key ? <Badge tone="warning">Current</Badge> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-line bg-white/70 p-5">
        <div className="space-y-4">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="rounded-3xl border border-line bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{event.step}</p>
                  <p className="text-xs text-muted">
                    {new Date(event.created_at).toLocaleString("th-TH")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-strong">{event.message}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No generation events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
