import { getEnv } from "@/lib/env";
import { normalizeName, normalizeSku } from "@/lib/utils";

export interface ProviderAssetCandidate {
  sourceProductId: string | null;
  sku: string | null;
  makroId: string | null;
  productCode: string | null;
  providerSku: string | null;
  productName: string;
  productUrl: string | null;
  imageUrl: string | null;
  normalizedSku: string | null;
  normalizedName: string;
  metadata: Record<string, unknown>;
}

export class MakroSearchProvider {
  async search(query: string) {
    const env = getEnv().data;
    if (!env || !query.trim()) {
      return [];
    }

    const apiUrl = "https://search.maknet.siammakro.cloud/search/api/v1/indexes/products/search";
    
    // We send a request structured exactly like Makro's Next.js frontend
    const requestBody = {
      q: query,
      size: 15,
      filters: {
        storeCodes: ["01"], // Generic online store / central warehouse
        isSalesCustomer: false,
        countryCode: "TH",
        lang: "th",
        allowRestrictedProduct: true,
        allowAlcohol: true
      },
      sortBy: "RELEVANCE",
      page: 1,
      source: "web"
    };

    const rawCandidates: ProviderAssetCandidate[] = [];

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "origin": "https://www.makro.pro",
          "referer": "https://www.makro.pro/",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const hits = data?.hits ?? [];

        for (const hit of hits) {
          const doc = hit.document || hit;
          const makroId = doc.makroId ?? null;
          const productCode = doc.productCode ?? null;
          const providerSku = doc.sku ?? null;
          const sku = makroId || productCode || providerSku;
          const productName = doc.title || doc.name || doc.titleEn || doc.productName || "Unknown product";
          const imageUrl = doc.images?.[0] || doc.imageUrls?.[0] || doc.image;
          
          if (!productName && !sku) continue;

          rawCandidates.push({
            sourceProductId: doc.id || sku,
            sku,
            makroId,
            productCode,
            providerSku,
            productName,
            productUrl: sku ? `${env.MAKRO_BASE_URL}/th/p/${sku}` : null,
            imageUrl: imageUrl || null,
            normalizedSku: sku ? normalizeSku(sku) : null,
            normalizedName: normalizeName(productName),
            metadata: { 
              originalPrice: doc.originalPrice,
              displayPrice: doc.displayPrice,
              unit: doc.unitType,
              packSize: doc.unitSize,
            },
          });
        }
      } else {
        console.warn(`[makro-provider] API HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn(`[makro-provider] API fetch failed: ${err instanceof Error ? err.message : "unknown"}`);
    }

    const normalizedQuery = normalizeName(query);
    const queryTokens = new Set(normalizedQuery.split(" ").filter(Boolean));

    const seen = new Set<string>();

    return rawCandidates
      .filter((candidate) => {
        // Deduping
        const key = [
          candidate.sourceProductId,
          candidate.normalizedSku,
          candidate.productUrl,
        ].join("|");

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((candidate) => {
        // Exact or partial SKU match
        const qSkuStr = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const candidateSkuValues = [
          candidate.sku,
          candidate.makroId,
          candidate.productCode,
          candidate.providerSku,
          candidate.sourceProductId,
        ]
          .map((value) => value?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "")
          .filter(Boolean);
        
        if (qSkuStr) {
          if (
            candidateSkuValues.some((value) =>
              value === qSkuStr || value.includes(qSkuStr) || qSkuStr.includes(value),
            )
          ) {
            return true;
          }
        }
        // Name substring match
        if (normalizedQuery && candidate.normalizedName.includes(normalizedQuery)) return true;
        // Token overlap: if at least some query tokens appear in candidate name
        if (queryTokens.size >= 1) {
          const matches = [...queryTokens].filter((t) => candidate.normalizedName.includes(t)).length;
          // Accept if at least 1 token matches (Typesense already handles relevance and ranking,
          // so we don't need to be too restrictive here and accidentally filter out good partial matches)
          if (matches >= 1) return true;
        }
        // Since we are querying an API designed to return relevant results,
        // we can be slightly more lenient if it returned something at all,
        // but we'll stick to our filtering for safety.
        return false;
      })
      .slice(0, 12);
  }
}
