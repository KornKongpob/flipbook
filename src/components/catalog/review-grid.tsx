"use client";

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
    <div className="border-t border-line bg-gray-50/60 px-4 py-3 space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by SKU or product name…"
          className="h-8 text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          className="h-8 shrink-0 px-3 text-xs gap-1"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {results.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {results.map((r) => {
            const proxyUrl = r.imageUrl
              ? `/api/images/proxy?url=${encodeURIComponent(r.imageUrl)}`
              : null;
            return (
              <div
                key={`${r.sourceProductId ?? r.productName}`}
                className="rounded-lg border border-line bg-white p-2"
              >
                <div className="relative h-20 overflow-hidden rounded-md bg-gray-50">
                  {proxyUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxyUrl} alt={r.productName} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="size-4 text-muted" />
                    </div>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] font-medium text-foreground">{r.productName}</p>
                <p className="text-[10px] text-muted">{r.sku ?? "—"}</p>
                <form
                  action={async (fd) => {
                    await approveCandidateAction(fd);
                    onApproved();
                  }}
                  className="mt-1.5"
                >
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="assetId" value={r.assetId ?? ""} />
                  <input type="hidden" name="saveManualMapping" value="on" />
                  <Button
                    variant="secondary"
                    className="w-full text-[11px]"
                    style={{ height: "26px" }}
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
      <div className="rounded-xl border border-line bg-card px-6 py-12 text-center shadow-sm">
        <CheckCircle className="mx-auto size-10 text-emerald-500 mb-3" />
        <p className="text-sm font-semibold text-foreground">All items reviewed!</p>
        <p className="mt-1 text-sm text-muted">Ready to proceed to the editor.</p>
        <a
          href={`/catalogs/${jobId}/editor`}
          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          Go to Editor
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk action toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 shadow-sm">
        <span className="text-sm font-medium text-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""} need review
        </span>

        <div className="flex-1" />

        {selected.size > 0 ? (
          <>
            <span className="text-xs text-muted">{selected.size} selected</span>
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

      {bulkMessage && (
        <p className={`rounded-lg px-4 py-2 text-sm ${bulkMessage.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {bulkMessage}
        </p>
      )}

      {/* Item rows */}
      <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
        {items.map((item, idx) => (
          <div key={item.id} className={idx > 0 ? "border-t border-line" : ""}>
            {/* Main row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="size-4 rounded accent-brand shrink-0 cursor-pointer"
              />

              {/* Thumbnail */}
              <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-gray-50">
                {item.currentImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.currentImageUrl}
                    alt={item.productName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageOff className="size-4 text-muted" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{item.productName}</p>
                <p className="text-xs text-muted">
                  SKU: {item.sku ?? "—"}
                  {item.reviewNote && (
                    <span className="ml-2 text-amber-600">{item.reviewNote}</span>
                  )}
                </p>
              </div>

              {/* Confidence */}
              <div className="shrink-0">
                {item.confidence != null ? (
                  <ConfidenceBadge value={item.confidence} />
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </div>

              {/* Candidates pill */}
              {item.candidates.length > 0 && (
                <div className="flex shrink-0 gap-1">
                  {item.candidates.slice(0, 3).map((c) => (
                    <form key={c.id} action={approveCandidateAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="assetId" value={c.assetId ?? ""} />
                      <input type="hidden" name="saveManualMapping" value="on" />
                      <button
                        type="submit"
                        title={`Use ${c.productName}`}
                        disabled={!c.assetId}
                        className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white hover:border-brand/40 hover:shadow-sm transition-all"
                      >
                        {c.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.previewUrl} alt={c.productName} className="h-full w-full object-contain" />
                        ) : (
                          <ImageOff className="size-3 text-muted" />
                        )}
                        <span className="absolute bottom-0 right-0 rounded-tl bg-brand px-0.5 text-[8px] font-bold text-white">
                          {Math.round(c.confidence * 100)}
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <form
                action={`/api/items/${item.id}/upload`}
                method="post"
                encType="multipart/form-data"
                className="shrink-0 flex items-center gap-1"
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="saveManualMapping" value="on" />
                <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2 text-xs text-muted transition hover:border-brand/30 hover:text-brand">
                  <Upload className="size-3" />
                  <input name="asset" type="file" accept="image/png,image/jpeg,image/webp" required className="sr-only" onChange={(e) => e.target.form?.requestSubmit()} />
                  Upload
                </label>
              </form>

              {/* Search toggle */}
              <button
                type="button"
                onClick={() => toggleSearch(item.id)}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-xs transition ${expandedSearch.has(item.id) ? "border-brand/30 bg-brand-soft/10 text-brand" : "border-line bg-white text-muted hover:border-brand/30 hover:text-brand"}`}
              >
                <Search className="size-3" />
                <span className="hidden sm:inline">Search</span>
                {expandedSearch.has(item.id) ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
              </button>
            </div>

            {/* Inline search panel */}
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
