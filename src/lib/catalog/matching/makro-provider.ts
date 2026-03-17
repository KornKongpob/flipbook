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
      asString(record.image)
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
      `${env.MAKRO_BASE_URL}/en/search?keyword=${encodeURIComponent(query)}`,
    ];

    const rawCandidates: ProviderAssetCandidate[] = [];

    for (const url of queryUrls) {
      const response = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; PromoCatalogStudio/1.0; +https://vercel.com)",
        },
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        continue;
      }

      const html = await response.text();
      const $ = load(html);
      const nextData = $("#__NEXT_DATA__").html();

      if (nextData) {
        try {
          walkCandidates(env.MAKRO_BASE_URL, JSON.parse(nextData), rawCandidates);
        } catch {
          // Ignore malformed JSON and fall back to DOM extraction.
        }
      }

      $("a[href*='/p/']").each((_, element) => {
        const anchor = $(element);
        const image = anchor.find("img").first();
        const title = image.attr("alt") ?? anchor.text().trim();

        if (!title) {
          return;
        }

        rawCandidates.push({
          sourceProductId: null,
          sku: null,
          productName: title,
          productUrl: getAbsoluteUrl(env.MAKRO_BASE_URL, anchor.attr("href")),
          imageUrl: getAbsoluteUrl(env.MAKRO_BASE_URL, image.attr("src")),
          normalizedSku: null,
          normalizedName: normalizeName(title),
          metadata: {
            href: anchor.attr("href"),
          },
        });
      });
    }

    const normalizedQuery = normalizeName(query);

    return dedupeCandidates(rawCandidates)
      .filter((candidate) => {
        const skuMatch = candidate.normalizedSku?.includes(normalizeSku(query));
        const nameMatch = candidate.normalizedName.includes(normalizedQuery);
        return Boolean(skuMatch || nameMatch);
      })
      .slice(0, 8);
  }
}
