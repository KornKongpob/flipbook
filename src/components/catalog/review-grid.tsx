"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Search,
  Upload,
  ChevronDown,
  ChevronRight,
  Loader2,
  ImageOff,
} from "lucide-react";
import { approveCandidateAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Candidate {
  id: string;
  assetId: string | null;
  productName: string;
  previewUrl: string | null;
  confidence: number;
}

interface ReviewItem {
  id: string;
  productName: string;
  sku: string | null;
  confidence: number | null;
  reviewNote: string | null;
  currentImageUrl: string | null;
  candidates: Candidate[];
  jobId: string;
}

interface ManualSearchResult {
  sourceProductId: string | null;
  sku: string | null;
  productName: string;
  imageUrl: string | null;
  confidence: number;
  assetId?: string;
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? "bg-emerald-100 text-emerald-700"
      : pct >= 50
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {pct}%
    </span>
  );
}

function InlineSearchPanel({
  itemId,
  jobId,
  defaultQuery,
  onApproved,
}: {
  itemId: string;
  jobId: string;
  defaultQuery: string;
  onApproved: () => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<ManualSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-line bg-gradient-to-b from-white to-gray-50/80 px-4 py-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Manual search</p>
        <p className="mt-1 text-xs text-muted">Search Makro by SKU or product name, then approve the best replacement asset.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by SKU or product name…"
          className="h-9 text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          className="h-9 shrink-0 px-3 text-xs gap-1"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {results.map((r) => {
            const proxyUrl = r.imageUrl
              ? `/api/images/proxy?url=${encodeURIComponent(r.imageUrl)}`
              : null;
            return (
              <div
                key={`${r.sourceProductId ?? r.productName}`}
                className="rounded-xl border border-line bg-white p-3 shadow-sm"
              >
                <div className="relative h-28 overflow-hidden rounded-lg border border-line bg-gray-50">
                  {proxyUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxyUrl} alt={r.productName} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="size-4 text-muted" />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="line-clamp-2 text-[11px] font-semibold text-foreground">{r.productName}</p>
                  <ConfidenceBadge value={r.confidence} />
                </div>
                <p className="mt-1 text-[10px] text-muted">{r.sku ?? "No SKU"}</p>
                <form
                  action={async (fd) => {
                    await approveCandidateAction(fd);
                    onApproved();
                  }}
                  className="mt-3"
                >
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="assetId" value={r.assetId ?? ""} />
                  <input type="hidden" name="saveManualMapping" value="on" />
                  <Button
                    variant="secondary"
                    className="w-full text-[11px] h-8"
                    disabled={!r.assetId}
                  >
                    Use this
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <p className="text-xs text-muted">No results. Try a different keyword or SKU.</p>
      )}
    </div>
  );
}

export function ReviewGrid({
  items,
  jobId,
}: {
  items: ReviewItem[];
  jobId: string;
}) {
  const router = useRouter();
  const [expandedSearch, setExpandedSearch] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, startApproving] = useTransition();
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  function toggleSearch(itemId: string) {
    setExpandedSearch((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function toggleSelect(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(items.map((i) => i.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkApprove(opts: { minConfidence?: number; itemIds?: string[] }) {
    setBulkMessage(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/bulk-approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk approve failed.");
      setBulkMessage(`✓ Approved ${data.approved} item(s).`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : "Bulk approve failed.");
    }
  }

  const highConfidenceCount = items.filter(
    (i) => (i.confidence ?? 0) >= 0.8 && i.candidates.length > 0,
  ).length;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center shadow-sm">
        <CheckCircle className="mx-auto size-10 text-emerald-500 mb-3" />
        <p className="text-sm font-semibold text-foreground">All items reviewed!</p>
        <p className="mt-1 text-sm text-muted">Ready to proceed to the master card editor.</p>
        <Link
          href={`/catalogs/${jobId}/master-card`}
          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          Continue to Master Card
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-5 z-10 rounded-2xl border border-line bg-card/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""} need review
            </p>
            <p className="mt-1 text-xs text-muted">
              Approve high-confidence suggestions quickly, then resolve the harder rows with upload or search.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selected.size > 0 ? (
              <>
                <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-xs text-muted-strong">
                  {selected.size} selected
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  className="h-8 px-3 text-xs gap-1"
                  disabled={approving}
                  onClick={() => startApproving(() => bulkApprove({ itemIds: [...selected] }))}
                >
                  {approving && <Loader2 className="size-3 animate-spin" />}
                  Approve selected ({selected.size})
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={selectAll}
                >
                  Select all
                </Button>
                {highConfidenceCount > 0 && (
                  <Button
                    type="button"
                    className="h-8 px-3 text-xs gap-1"
                    disabled={approving}
                    onClick={() => startApproving(() => bulkApprove({ minConfidence: 0.8 }))}
                  >
                    {approving && <Loader2 className="size-3 animate-spin" />}
                    Approve all ≥ 80% ({highConfidenceCount})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {bulkMessage && (
        <p className={`rounded-lg px-4 py-2 text-sm ${bulkMessage.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {bulkMessage}
        </p>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="mt-1 size-4 rounded accent-brand shrink-0 cursor-pointer"
                />

                <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-gray-50">
                  {item.currentImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.currentImageUrl}
                      alt={item.productName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageOff className="size-5 text-muted" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.productName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>SKU: {item.sku ?? "—"}</span>
                        {item.reviewNote ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                            {item.reviewNote}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.confidence != null ? (
                        <ConfidenceBadge value={item.confidence} />
                      ) : (
                        <span className="text-xs text-muted">No confidence score</span>
                      )}
                      <span className="rounded-full border border-line bg-white/80 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                        {item.candidates.length} suggestion{item.candidates.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {item.candidates.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Suggested matches</p>
                        <p className="text-[11px] text-muted">Pick the best asset or open manual search below.</p>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-3">
                        {item.candidates.slice(0, 3).map((candidate) => (
                          <form key={candidate.id} action={approveCandidateAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="jobId" value={jobId} />
                            <input type="hidden" name="assetId" value={candidate.assetId ?? ""} />
                            <input type="hidden" name="saveManualMapping" value="on" />
                            <button
                              type="submit"
                              title={`Use ${candidate.productName}`}
                              disabled={!candidate.assetId}
                              className="flex w-full flex-col gap-3 rounded-xl border border-line bg-white p-3 text-left transition-all hover:border-brand/30 hover:shadow-sm disabled:opacity-60"
                            >
                              <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-line bg-gray-50">
                                {candidate.previewUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={candidate.previewUrl} alt={candidate.productName} className="h-full w-full object-contain" />
                                ) : (
                                  <ImageOff className="size-4 text-muted" />
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-2 text-[11px] font-semibold text-foreground">{candidate.productName}</p>
                                  <ConfidenceBadge value={candidate.confidence} />
                                </div>
                                <span className="inline-flex rounded-full border border-brand/20 bg-brand-soft/30 px-2.5 py-1 text-[11px] font-medium text-brand">
                                  Use this match
                                </span>
                              </div>
                            </button>
                          </form>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line bg-white/50 px-4 py-3 text-sm text-muted">
                      No suggested candidates. Use manual search or upload a replacement image.
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:w-48 xl:border-l xl:border-line xl:pl-4">
                <div className="flex h-full flex-col gap-2">
                  <form
                    action={`/api/items/${item.id}/upload`}
                    method="post"
                    encType="multipart/form-data"
                    className="shrink-0"
                  >
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="saveManualMapping" value="on" />
                    <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-medium text-muted-strong transition hover:border-brand/30 hover:text-brand">
                      <Upload className="size-3.5" />
                      Upload image
                      <input name="asset" type="file" accept="image/png,image/jpeg" required className="sr-only" onChange={(e) => e.target.form?.requestSubmit()} />
                    </label>
                  </form>

                  <button
                    type="button"
                    onClick={() => toggleSearch(item.id)}
                    className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${expandedSearch.has(item.id) ? "border-brand/30 bg-brand-soft/10 text-brand" : "border-line bg-white text-muted-strong hover:border-brand/30 hover:text-brand"}`}
                  >
                    <Search className="size-3.5" />
                    Manual search
                    {expandedSearch.has(item.id) ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>

                  <p className="rounded-xl bg-white/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
                    Uploaded assets can also be saved as reusable manual mappings for the same SKU.
                  </p>
                </div>
              </div>
            </div>

            {expandedSearch.has(item.id) && (
              <InlineSearchPanel
                itemId={item.id}
                jobId={jobId}
                defaultQuery={item.sku ?? item.productName}
                onApproved={() => {
                  setExpandedSearch((prev) => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                  });
                  router.refresh();
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
