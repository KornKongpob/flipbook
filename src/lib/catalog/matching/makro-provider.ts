import { load } from "cheerio";
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

function getAbsoluteUrl(baseUrl: string, value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractImageUrl(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = extractImageUrl(entry);
      if (candidate) {
        return candidate;
      }
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      asString(record.url) ??
      asString(record.src) ??
      asString(record.mediaUrl) ??
      asString(record.image) ??
      asString(record.thumbnailUrl) ??
      asString(record.coverImage) ??
      asString(record.primaryImage) ??
      asString(record.imageUrl) ??
      extractImageUrl(record.galleryImages)
    );
  }

  return null;
}

function maybeCandidate(baseUrl: string, node: Record<string, unknown>) {
  const productName =
    asString(node.title) ?? asString(node.productName) ?? asString(node.name);
  const sku =
    asString(node.sku) ?? asString(node.productCode) ?? asString(node.code);

  if (!productName && !sku) {
    return null;
  }

  const imageUrl =
    extractImageUrl(node.imageUrls) ??
    extractImageUrl(node.image) ??
    extractImageUrl(node.images);
  const productUrl =
    getAbsoluteUrl(
      baseUrl,
      asString(node.url) ?? asString(node.productUrl) ?? asString(node.href) ?? asString(node.slug),
    );
  const sourceProductId =
    asString(node.id) ?? asString(node.productId) ?? asString(node.variantId);

  return {
    sourceProductId,
    sku,
    productName: productName ?? sku ?? "Unknown product",
    productUrl,
    imageUrl: getAbsoluteUrl(baseUrl, imageUrl),
    normalizedSku: sku ? normalizeSku(sku) : null,
    normalizedName: normalizeName(productName ?? sku ?? ""),
    metadata: node,
  } satisfies ProviderAssetCandidate;
}

function walkCandidates(baseUrl: string, value: unknown, results: ProviderAssetCandidate[]) {
  if (Array.isArray(value)) {
    value.forEach((entry) => walkCandidates(baseUrl, entry, results));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const candidate = maybeCandidate(baseUrl, record);

  if (candidate) {
    results.push(candidate);
  }

  Object.values(record).forEach((entry) => walkCandidates(baseUrl, entry, results));
}

function dedupeCandidates(candidates: ProviderAssetCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = [
      candidate.sourceProductId,
      candidate.normalizedSku,
      candidate.productUrl,
      candidate.imageUrl,
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export class MakroSearchProvider {
  async search(query: string) {
    const env = getEnv().data;
    if (!env || !query.trim()) {
      return [];
    }

    const queryUrls = [
      env.MAKRO_SEARCH_URL_TEMPLATE.replace("{query}", encodeURIComponent(query)),
      `${env.MAKRO_BASE_URL}/th/c/all?keyword=${encodeURIComponent(query)}`,
    ];

    const rawCandidates: ProviderAssetCandidate[] = [];

    for (const url of queryUrls) {
      const response = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "th-TH,th;q=0.9,en;q=0.8",
          "referer": env.MAKRO_BASE_URL,
        },
        cache: "no-store",
      }).catch((err) => {
        console.warn(`[makro-provider] fetch failed for ${url}: ${err instanceof Error ? err.message : "unknown"}`);
        return null;
      });

      if (!response?.ok) {
        if (response) {
          console.warn(`[makro-provider] HTTP ${response.status} for ${url}`);
        }
        continue;
      }

      const html = await response.text();
      const $ = load(html);
      const nextData = $("#__NEXT_DATA__").html();

      if (nextData) {
        try {
          walkCandidates(env.MAKRO_BASE_URL, JSON.parse(nextData), rawCandidates);
        } catch (err) {
          console.warn(`[makro-provider] __NEXT_DATA__ parse error: ${err instanceof Error ? err.message : "unknown"}`);
        }
      }

      // Also try extracting from <script> tags that contain JSON product data
      $("script[type='application/ld+json']").each((_, el) => {
        try {
          const json = $(el).html();
          if (json) walkCandidates(env.MAKRO_BASE_URL, JSON.parse(json), rawCandidates);
        } catch {
          // ignore
        }
      });

      $("a[href*='/p/'], a[href*='/th/p/'], a[href*='/en/p/']").each((_, element) => {
        const anchor = $(element);
        const image = anchor.find("img").first();
        const title = image.attr("alt") ?? anchor.text().trim();
        const href = anchor.attr("href") ?? "";

        if (!title) {
          return;
        }

        // Try to extract SKU from product URL pattern /p/XXXXXX
        const skuFromUrl = href.match(/\/p\/(\d{5,})/)?.[1] ?? null;

        rawCandidates.push({
          sourceProductId: skuFromUrl,
          sku: skuFromUrl,
          productName: title,
          productUrl: getAbsoluteUrl(env.MAKRO_BASE_URL, href),
          imageUrl: getAbsoluteUrl(env.MAKRO_BASE_URL, image.attr("src") ?? image.attr("data-src")),
          normalizedSku: skuFromUrl ? normalizeSku(skuFromUrl) : null,
          normalizedName: normalizeName(title),
          metadata: { href },
        });
      });

      if (rawCandidates.length > 0) {
        break; // Got results from one URL, no need to try the next
      }
    }

    const normalizedQuery = normalizeName(query);
    const normalizedQuerySku = normalizeSku(query);
    const queryTokens = new Set(normalizedQuery.split(" ").filter(Boolean));

    return dedupeCandidates(rawCandidates)
      .filter((candidate) => {
        // Exact or partial SKU match
        if (normalizedQuerySku && candidate.normalizedSku) {
          if (candidate.normalizedSku === normalizedQuerySku) return true;
          if (candidate.normalizedSku.includes(normalizedQuerySku)) return true;
          if (normalizedQuerySku.includes(candidate.normalizedSku)) return true;
        }
        // Name substring match
        if (normalizedQuery && candidate.normalizedName.includes(normalizedQuery)) return true;
        // Token overlap: if at least half of query tokens appear in candidate name
        if (queryTokens.size >= 2) {
          const hits = [...queryTokens].filter((t) => candidate.normalizedName.includes(t)).length;
          if (hits >= Math.ceil(queryTokens.size * 0.5)) return true;
        }
        return false;
      })
      .slice(0, 12);
  }
}
