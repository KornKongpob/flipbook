import type { Json } from "@/lib/database.types";

export type CatalogPricingMode = "promotion" | "slab";

export interface SlabPriceTier {
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
  label: string | null;
}

export const MAX_SLAB_PRICE_TIERS = 6;

export function isCatalogPricingMode(value: unknown): value is CatalogPricingMode {
  return value === "promotion" || value === "slab";
}

function asFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSlabPriceTiers(value: unknown): SlabPriceTier[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const tiers = value.slice(0, MAX_SLAB_PRICE_TIERS).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Slab tier ${index + 1} is invalid.`);
    }

    const source = entry as Record<string, unknown>;
    const minQuantity = asFiniteNumber(source.minQuantity);
    const maxQuantity = asFiniteNumber(source.maxQuantity);
    const price = asFiniteNumber(source.price);
    const label = typeof source.label === "string" ? source.label.trim() || null : null;

    if (minQuantity === null || !Number.isInteger(minQuantity) || minQuantity < 1) {
      throw new Error(`Slab tier ${index + 1} needs a minimum quantity of 1 or more.`);
    }

    if (maxQuantity !== null && (!Number.isInteger(maxQuantity) || maxQuantity < minQuantity)) {
      throw new Error(`Slab tier ${index + 1} has an invalid maximum quantity.`);
    }

    if (price === null || price < 0) {
      throw new Error(`Slab tier ${index + 1} needs a valid price.`);
    }

    return {
      minQuantity,
      maxQuantity,
      price: Number(price.toFixed(2)),
      label,
    } satisfies SlabPriceTier;
  });

  tiers.sort((left, right) => left.minQuantity - right.minQuantity);

  tiers.forEach((tier, index) => {
    const previous = tiers[index - 1];
    if (previous && tier.minQuantity <= previous.minQuantity) {
      throw new Error("Each slab tier must start at a different quantity.");
    }

    if (previous && previous.maxQuantity !== null && previous.maxQuantity >= tier.minQuantity) {
      throw new Error("Slab quantity ranges cannot overlap.");
    }
  });

  return tiers;
}

export function getCatalogItemSlabPrices(metadata: Json | unknown): SlabPriceTier[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  try {
    return normalizeSlabPriceTiers((metadata as Record<string, unknown>).slabPrices);
  } catch {
    return [];
  }
}

export function mergeCatalogItemSlabPrices(
  metadata: Json | unknown,
  slabPrices: SlabPriceTier[],
) {
  const source = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, Json | undefined>
    : {};

  return {
    ...source,
    pricingMode: "slab",
    slabPrices: slabPrices.map((tier) => ({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      price: tier.price,
      label: tier.label,
    })),
  } satisfies Record<string, Json | undefined>;
}

export function formatSlabQuantityLabel(tier: SlabPriceTier, unit?: string | null) {
  if (tier.label) {
    return tier.label;
  }

  const suffix = unit?.trim() ? ` ${unit.trim()}` : " units";

  if (tier.maxQuantity !== null) {
    return `${tier.minQuantity}-${tier.maxQuantity}${suffix}`;
  }

  return `${tier.minQuantity}+${suffix}`;
}
