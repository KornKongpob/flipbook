"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { approveCandidateAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ManualSearchResult {
  sourceProductId: string | null;
  sku: string | null;
  productName: string;
  productUrl: string | null;
  imageUrl: string | null;
  normalizedSku: string | null;
  normalizedName: string;
  confidence: number;
  reasons: string[];
  assetId?: string;
}

interface ManualSearchPanelProps {
  itemId: string;
  jobId: string;
  defaultQuery: string;
}

export function ManualSearchPanel({
  itemId,
  jobId,
  defaultQuery,
}: ManualSearchPanelProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<ManualSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/items/${itemId}/search?q=${encodeURIComponent(query)}`,
      );
      const data = (await response.json()) as { results: ManualSearchResult[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Search failed.");
      }

      setResults(data.results);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-background p-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by SKU or keyword"
          className="h-9"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 h-9 px-3"
          onClick={handleSearch}
          disabled={loading}
        >
          <Search className="mr-1.5 size-3.5" />
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {results.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((result) => {
            const proxyUrl = result.imageUrl
              ? `/api/images/proxy?url=${encodeURIComponent(result.imageUrl)}`
              : null;
            return (
              <div
                key={`${result.sourceProductId ?? result.productUrl ?? result.productName}`}
                className="rounded-lg border border-line bg-card p-2"
              >
                {/* Product image */}
                <div className="relative h-24 overflow-hidden rounded-md bg-background">
                  {proxyUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proxyUrl}
                      alt={result.productName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
                  )}
                </div>

                <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">{result.productName}</p>
                <p className="text-[10px] text-muted">{result.sku || "No SKU"} · {(result.confidence * 100).toFixed(0)}% match</p>

                <form action={approveCandidateAction} className="mt-2 space-y-1.5">
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="assetId" value={result.assetId} />
                  <label className="flex items-center gap-1.5 text-[10px] text-muted">
                    <input type="checkbox" name="saveManualMapping" defaultChecked className="accent-brand" />
                    Save mapping
                  </label>
                  <Button variant="secondary" className="w-full text-xs" style={{ height: "28px" }} disabled={!result.assetId}>
                    Use this
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && query !== defaultQuery && (
        <p className="mt-2 text-xs text-muted">No results. Try a different keyword.</p>
      )}
    </div>
  );
}
