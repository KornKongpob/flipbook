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
    <div className="rounded-[28px] border border-line bg-white/70 p-5">
      <div className="flex flex-col gap-3 md:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by SKU or keyword"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={handleSearch}
          disabled={loading}
        >
          <Search className="mr-2 size-4" />
          {loading ? "Searching..." : "Search Makro"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {results.map((result) => (
          <div
            key={`${result.sourceProductId ?? result.productUrl ?? result.productName}`}
            className="rounded-3xl border border-line bg-white p-4"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{result.productName}</p>
              <p className="text-xs text-muted">
                {result.sku || "No SKU"} • confidence {(result.confidence * 100).toFixed(0)}%
              </p>
            </div>

            <form action={approveCandidateAction} className="mt-4 flex items-center justify-between gap-3">
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="assetId" value={result.assetId} />
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="saveManualMapping" />
                Save as mapping
              </label>
              <Button variant="secondary" disabled={!result.assetId}>
                Use this
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
