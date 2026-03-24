export interface CatalogPricingInput {
  normalPrice?: number | null;
  promoPrice?: number | null;
}

export interface CatalogDerivedPricing {
  normalPrice: number | null;
  promoPrice: number | null;
  discountAmount: number | null;
  discountPercent: number | null;
  hasPromo: boolean;
}

function normalizePrice(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Number(value.toFixed(2));
}

export function deriveCatalogPricing({
  normalPrice,
  promoPrice,
}: CatalogPricingInput): CatalogDerivedPricing {
  const normalizedNormalPrice = normalizePrice(normalPrice);
  const normalizedPromoPrice = normalizePrice(promoPrice);
  const hasPromo =
    normalizedNormalPrice !== null &&
    normalizedPromoPrice !== null &&
    normalizedPromoPrice > 0 &&
    normalizedPromoPrice < normalizedNormalPrice;

  return {
    normalPrice: normalizedNormalPrice,
    promoPrice: normalizedPromoPrice,
    discountAmount: hasPromo
      ? Number((normalizedNormalPrice - normalizedPromoPrice).toFixed(2))
      : null,
    discountPercent: hasPromo
      ? Number((((normalizedNormalPrice - normalizedPromoPrice) / normalizedNormalPrice) * 100).toFixed(2))
      : null,
    hasPromo,
  };
}
