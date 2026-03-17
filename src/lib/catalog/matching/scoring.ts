import { normalizeName, normalizeSku } from "@/lib/utils";

export interface MatchableItem {
  sku?: string | null;
  normalizedSku?: string | null;
  productName: string;
  normalizedName?: string | null;
  packSize?: string | null;
}

export interface MatchableAsset {
  sku?: string | null;
  normalizedSku?: string | null;
  productName: string;
  normalizedName?: string | null;
}

function tokenize(value: string) {
  return new Set(
    normalizeName(value)
      .split(" ")
      .filter(Boolean),
  );
}

function overlapScore(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) {
    return 0;
  }

  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / new Set([...left, ...right]).size;
}

export function scoreMatch(item: MatchableItem, asset: MatchableAsset) {
  const reasons: string[] = [];
  let score = 0;

  const itemSku = item.normalizedSku ?? normalizeSku(item.sku);
  const assetSku = asset.normalizedSku ?? normalizeSku(asset.sku);

  if (itemSku && assetSku && itemSku === assetSku) {
    score += 0.7;
    reasons.push("exact_sku");
  } else if (itemSku && assetSku && assetSku.includes(itemSku)) {
    score += 0.45;
    reasons.push("normalized_sku");
  }

  const itemName = item.normalizedName ?? normalizeName(item.productName);
  const assetName = asset.normalizedName ?? normalizeName(asset.productName);
  const tokenScore = overlapScore(tokenize(itemName), tokenize(assetName));

  if (tokenScore > 0) {
    score += tokenScore * 0.4;
    reasons.push("name_similarity");
  }

  if (item.packSize && asset.productName.toLowerCase().includes(item.packSize.toLowerCase())) {
    score += 0.08;
    reasons.push("pack_size_hint");
  }

  return {
    confidence: Math.min(Number(score.toFixed(4)), 1),
    reasons,
  };
}
