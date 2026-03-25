"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Search,
  Upload,
  ChevronDown,
  ChevronRight,
  Loader2,
  ImageOff,
  Trash2,
} from "lucide-react";
import {
  approveCandidateAction,
  removeCatalogItemAction,
  removeCatalogItemsAction,
} from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Candidate {
  id: string;
  assetId: string | null;
  productName: string;
  previewUrl: string | null;
  confidence: number;
  isExactSkuMatch?: boolean;
}

interface ReviewItem {
  id: string;
  productName: string;
  sku: string | null;
  matchStatus: "pending" | "matched" | "needs_review" | "approved" | "rejected" | "rendered";
  confidence: number | null;
  reviewNote: string | null;
  currentImageUrl: string | null;
  usedPdfPlaceholder?: boolean;
  candidates: Candidate[];
  jobId: string;
}

interface ManualSearchResult {
  sourceProductId: string | null;
  sku: string | null;
  productName: string;
  imageUrl: string | null;
  previewUrl?: string | null;
  confidence: number;
  reasons: string[];
  assetId?: string;
  exactSkuMatch?: boolean;
}

type ReviewFilter = "needs-action" | "approved" | "all";

function getNeedsAction(item: ReviewItem) {
  return item.matchStatus !== "approved";
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

function ExactSkuBadge() {
  return (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      Exact SKU
    </span>
  );
}

function MatchStatusBadge({ item }: { item: ReviewItem }) {
  if (item.matchStatus === "approved") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        Approved
      </span>
    );
  }

  if (item.matchStatus === "needs_review") {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Needs action
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
      {item.matchStatus}
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

      if (!res.ok) {
        throw new Error(data.error ?? "Search failed.");
      }

      setResults(data.results ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-line bg-gradient-to-b from-white to-gray-50/80 px-4 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Manual search</p>
        <p className="mt-1 text-xs text-muted">
          Search Makro by SKU or product name, then approve the best replacement asset.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleSearch()}
          placeholder="Search by SKU or product name..."
          className="h-9 text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          className="h-9 shrink-0 gap-1 px-3 text-xs"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {results.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {results.map((result) => {
            const previewUrl = result.previewUrl ?? (
              result.imageUrl
                ? `/api/images/proxy?url=${encodeURIComponent(result.imageUrl)}`
                : null
            );

            return (
              <div
                key={`${result.sourceProductId ?? result.productName}`}
                className="rounded-xl border border-line bg-white p-3 shadow-sm"
              >
                <div className="relative h-28 overflow-hidden rounded-lg border border-line bg-gray-50">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={result.productName} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="size-4 text-muted" />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="line-clamp-2 text-[11px] font-semibold text-foreground">{result.productName}</p>
                    {result.exactSkuMatch ? <ExactSkuBadge /> : null}
                  </div>
                  <ConfidenceBadge value={result.confidence} />
                </div>
                <p className="mt-1 text-[10px] text-muted">{result.sku ?? "No SKU"}</p>
                <form
                  action={async (formData) => {
                    await approveCandidateAction(formData);
                    onApproved();
                  }}
                  className="mt-3"
                >
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="assetId" value={result.assetId ?? ""} />
                  <input type="hidden" name="saveManualMapping" value="on" />
                  <Button
                    variant="secondary"
                    className="h-8 w-full text-[11px]"
                    disabled={!result.assetId}
                  >
                    Use this
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      ) : null}

      {!loading && results.length === 0 && query ? (
        <p className="text-xs text-muted">No results. Try a different keyword or SKU.</p>
      ) : null}
    </div>
  );
}

export function ReviewGrid({
  items,
  jobId,
  initialFocusPdfPlaceholders = false,
}: {
  items: ReviewItem[];
  jobId: string;
  initialFocusPdfPlaceholders?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ReviewItem[]>(items);
  const [expandedSearch, setExpandedSearch] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>(() =>
    initialFocusPdfPlaceholders ? "all" : items.some((item) => getNeedsAction(item)) ? "needs-action" : "all",
  );
  const [focusPdfPlaceholders, setFocusPdfPlaceholders] = useState(initialFocusPdfPlaceholders);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [approving, startApproving] = useTransition();
  const [removing, startRemoving] = useTransition();

  useEffect(() => {
    setRows(items);
  }, [items]);

  function toggleSearch(itemId: string) {
    setExpandedSearch((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  function toggleSelect(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  const needsActionCount = useMemo(
    () => rows.filter((item) => getNeedsAction(item)).length,
    [rows],
  );
  const approvedCount = useMemo(
    () => rows.filter((item) => item.matchStatus === "approved").length,
    [rows],
  );

  const filteredItems = useMemo(() => {
    const byFilter = rows.filter((item) => {
      if (activeFilter === "needs-action") {
        return getNeedsAction(item);
      }

      if (activeFilter === "approved") {
        return item.matchStatus === "approved";
      }

      return true;
    });

    if (!focusPdfPlaceholders) {
      return byFilter;
    }

    return byFilter.filter((item) => item.usedPdfPlaceholder);
  }, [activeFilter, focusPdfPlaceholders, rows]);

  const highConfidenceCount = rows.filter(
    (item) => getNeedsAction(item) && (item.confidence ?? 0) >= 0.8 && item.candidates.length > 0,
  ).length;

  function selectAllFiltered() {
    setSelected(new Set(filteredItems.map((item) => item.id)));
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

      if (!res.ok) {
        throw new Error(data.error ?? "Bulk approve failed.");
      }

      setBulkMessage(`Success: Approved ${data.approved} item(s).`);
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "Bulk approve failed.");
    }
  }

  async function removeItems(itemIds: string[], label: string) {
    setBulkMessage(null);

    try {
      const result = await removeCatalogItemsAction({ jobId, itemIds });
      const removedIds = new Set(result.removedItemIds);

      setRows((prev) => prev.filter((item) => !removedIds.has(item.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        itemIds.forEach((itemId) => next.delete(itemId));
        return next;
      });
      setExpandedSearch((prev) => {
        const next = new Set(prev);
        itemIds.forEach((itemId) => next.delete(itemId));
        return next;
      });
      setBulkMessage(`Success: Removed ${label}.`);
      router.refresh();
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "Could not remove products from this catalog.");
    }
  }

  function handleBulkRemove() {
    const itemIds = [...selected];

    if (!itemIds.length) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${itemIds.length} selected product(s) from this catalog? This only removes them from this job and cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    startRemoving(() => {
      void removeItems(itemIds, `${itemIds.length} item(s)`);
    });
  }

  function handleSingleRemove(item: ReviewItem) {
    const skuLine = item.sku ? `\nSKU: ${item.sku}` : "";
    const confirmed = window.confirm(
      `Remove "${item.productName}" from this catalog?${skuLine}\n\nThis only removes it from this job. Assets and saved mappings stay intact.`,
    );

    if (!confirmed) {
      return;
    }

    startRemoving(() => {
      void removeCatalogItemAction({ jobId, itemId: item.id })
        .then((result) => {
          const removedIds = new Set(result.removedItemIds);
          setRows((prev) => prev.filter((row) => !removedIds.has(row.id)));
          setExpandedSearch((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          setBulkMessage(`Success: Removed ${item.productName} from this catalog.`);
          router.refresh();
        })
        .catch((error: unknown) => {
          setBulkMessage(error instanceof Error ? error.message : "Could not remove the selected product.");
        });
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center shadow-sm">
        <CheckCircle className="mx-auto mb-3 size-10 text-emerald-500" />
        <p className="text-sm font-semibold text-foreground">This catalog has no products left.</p>
        <p className="mt-1 text-sm text-muted">Start a new catalog or go back to the upload flow if this removal was intentional.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={`/catalogs/${jobId}/page-design`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
          >
            Open Design Catalog
          </Link>
          <Link
            href="/catalogs/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            Create New Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-5 z-10 rounded-2xl border border-line bg-card/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Audit products before design and export</p>
            <p className="mt-1 text-xs text-muted">
              Approve matches, search or upload replacements, and remove products that should not stay in this catalog.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[{
              key: "needs-action",
              label: `Needs action (${needsActionCount})`,
            }, {
              key: "approved",
              label: `Approved (${approvedCount})`,
            }, {
              key: "all",
              label: `All (${rows.length})`,
            }].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key as ReviewFilter)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  activeFilter === filter.key
                    ? "border-brand/30 bg-brand-soft/15 text-brand"
                    : "border-line bg-white text-muted-strong hover:border-brand/20 hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                className="h-8 gap-1 px-3 text-xs"
                disabled={approving}
                onClick={() => startApproving(() => bulkApprove({ itemIds: [...selected] }))}
              >
                {approving ? <Loader2 className="size-3 animate-spin" /> : null}
                Approve selected ({selected.size})
              </Button>
              <Button
                type="button"
                variant="danger"
                className="h-8 gap-1 px-3 text-xs"
                disabled={removing}
                onClick={handleBulkRemove}
              >
                {removing ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                Remove selected ({selected.size})
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-3 text-xs"
                onClick={selectAllFiltered}
              >
                Select current filter
              </Button>
              {highConfidenceCount > 0 ? (
                <Button
                  type="button"
                  className="h-8 gap-1 px-3 text-xs"
                  disabled={approving}
                  onClick={() => startApproving(() => bulkApprove({ minConfidence: 0.8 }))}
                >
                  {approving ? <Loader2 className="size-3 animate-spin" /> : null}
                  Approve all {"\u003e="} 80% ({highConfidenceCount})
                </Button>
              ) : null}
            </>
          )}
          {rows.some((item) => item.usedPdfPlaceholder) ? (
            <button
              type="button"
              onClick={() => setFocusPdfPlaceholders((prev) => !prev)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                focusPdfPlaceholders
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-line bg-white text-muted-strong hover:border-rose-200 hover:text-rose-700"
              }`}
            >
              {focusPdfPlaceholders ? "Showing PDF placeholder items" : "Focus PDF placeholder items"}
            </button>
          ) : null}
        </div>
      </div>

      {bulkMessage ? (
        <p
          className={`rounded-lg px-4 py-2 text-sm ${
            bulkMessage.startsWith("Success:")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {bulkMessage}
        </p>
      ) : null}

      {!filteredItems.length ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-10 text-center text-sm text-muted shadow-sm">
          No products match the current filter.
        </div>
      ) : null}

      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="mt-1 size-4 shrink-0 cursor-pointer rounded accent-brand"
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
                        <span>SKU: {item.sku ?? "-"}</span>
                        <MatchStatusBadge item={item} />
                        {item.reviewNote ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                            {item.reviewNote}
                          </span>
                        ) : null}
                        {item.usedPdfPlaceholder ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                            PDF placeholder used last export
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

                  {getNeedsAction(item) ? (
                    item.candidates.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                            Suggested matches
                          </p>
                          <p className="text-[11px] text-muted">
                            Pick the best asset or open manual search below.
                          </p>
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
                                    <div className="min-w-0 space-y-1">
                                      <p className="line-clamp-2 text-[11px] font-semibold text-foreground">
                                        {candidate.productName}
                                      </p>
                                      {candidate.isExactSkuMatch ? <ExactSkuBadge /> : null}
                                    </div>
                                    <ConfidenceBadge value={candidate.confidence} />
                                  </div>
                                  <span className="inline-flex rounded-full border border-brand/20 bg-brand-soft/30 px-2.5 py-1 text-[11px] font-medium text-brand">
                                    Approve this match
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
                    )
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                      This product is approved and ready for design. You can still replace the image with manual search or upload if needed.
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:w-56 xl:border-l xl:border-line xl:pl-4">
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
                      <input
                        name="asset"
                        type="file"
                        accept="image/png,image/jpeg"
                        required
                        className="sr-only"
                        onChange={(event) => event.target.form?.requestSubmit()}
                      />
                    </label>
                  </form>

                  <button
                    type="button"
                    onClick={() => toggleSearch(item.id)}
                    className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
                      expandedSearch.has(item.id)
                        ? "border-brand/30 bg-brand-soft/10 text-brand"
                        : "border-line bg-white text-muted-strong hover:border-brand/30 hover:text-brand"
                    }`}
                  >
                    <Search className="size-3.5" />
                    Manual search
                    {expandedSearch.has(item.id) ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>

                  <Button
                    type="button"
                    variant="danger"
                    className="h-10 gap-1.5 text-xs"
                    disabled={removing}
                    onClick={() => handleSingleRemove(item)}
                  >
                    {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Remove from catalog
                  </Button>

                  <p className="rounded-xl bg-white/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
                    Uploaded assets can also be saved as reusable manual mappings for the same SKU.
                  </p>
                </div>
              </div>
            </div>

            {expandedSearch.has(item.id) ? (
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
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
