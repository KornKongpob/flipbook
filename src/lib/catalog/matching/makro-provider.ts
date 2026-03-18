import { getEnv } from "@/lib/env";
import { normalizeName, normalizeSku } from "@/lib/utils";

export interface ProviderAssetCandidate {
  sourceProductId: string | null;
  sku: string | null;
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
          const sku = doc.productCode || doc.sku || doc.makroId;
          const productName = doc.title || doc.name || doc.titleEn || doc.productName || "Unknown product";
          const imageUrl = doc.images?.[0] || doc.imageUrls?.[0] || doc.image;
          
          if (!productName && !sku) continue;

          rawCandidates.push({
            sourceProductId: doc.id || sku,
            sku,
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
    const normalizedQuerySku = normalizeSku(query);
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
        const cSkuStr = candidate.sku?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || '';
        const mSkuStr = candidate.sourceProductId?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || '';
        
        if (qSkuStr) {
          if (cSkuStr === qSkuStr || cSkuStr.includes(qSkuStr) || qSkuStr.includes(cSkuStr)) return true;
          if (mSkuStr === qSkuStr || mSkuStr.includes(qSkuStr) || qSkuStr.includes(mSkuStr)) return true;
        }
        // Name substring match
        if (normalizedQuery && candidate.normalizedName.includes(normalizedQuery)) return true;
        // Token overlap: if at least half of query tokens appear in candidate name
        if (queryTokens.size >= 2) {
          const matches = [...queryTokens].filter((t) => candidate.normalizedName.includes(t)).length;
          if (matches >= Math.ceil(queryTokens.size * 0.5)) return true;
        }
        // Since we are querying an API designed to return relevant results,
        // we can be slightly more lenient if it returned something at all,
        // but we'll stick to our filtering for safety.
        return false;
      })
      .slice(0, 12);
  }
}
