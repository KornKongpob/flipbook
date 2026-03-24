import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import type { CatalogStyleOptions } from "@/lib/catalog/style-options";

export interface CatalogCardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CatalogResolvedCardLayout {
  innerRect: CatalogCardRect;
  imageRect: CatalogCardRect;
  badgeRect: CatalogCardRect | null;
  titleRect: CatalogCardRect | null;
  metaRect: CatalogCardRect | null;
  promoPriceRect: CatalogCardRect | null;
  normalPriceRowRect: CatalogCardRect | null;
  singlePriceRect: CatalogCardRect | null;
  titleFontSize: number;
  metaFontSize: number;
  promoPriceFontSize: number;
  normalPriceFontSize: number;
  titleLineHeight: number;
  metaLineHeight: number;
  promoPriceLineHeight: number;
  normalPriceLineHeight: number;
  singlePriceLineHeight: number;
  singlePriceFontSize: number;
}

export const CATALOG_CARD_TITLE_MAX_LINES = 2;
export const CATALOG_CARD_TITLE_LINE_HEIGHT = 1.15;
export const CATALOG_CARD_META_LINE_HEIGHT = 1.15;
export const CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT = 1;
export const CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT = 1.1;
export const CATALOG_CARD_BADGE_HEIGHT = 22;
export const CATALOG_CARD_IMAGE_GAP = 8;
export const CATALOG_CARD_BADGE_GAP = 8;
export const CATALOG_CARD_TITLE_META_GAP = 4;
export const CATALOG_CARD_IMAGE_TOP_INSET_FACTOR = 0.42;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rect(x: number, y: number, width: number, height: number): CatalogCardRect {
  return {
    x,
    y,
    width: Math.max(width, 0),
    height: Math.max(height, 0),
  };
}

function optionalRect(x: number, y: number, width: number, height: number) {
  const nextRect = rect(x, y, width, height);
  return nextRect.width > 0 && nextRect.height > 0 ? nextRect : null;
}

export function getCatalogLineGap(fontSize: number, lineHeight: number) {
  return Math.max(fontSize * (lineHeight - 1), 0);
}

export function getCatalogBaseFontScale(options: CatalogStyleOptions) {
  const defaultBaseFontSize = DEFAULT_STYLE_OPTIONS.baseFontSize || 13;

  if (defaultBaseFontSize <= 0) {
    return 1;
  }

  return Math.max(options.baseFontSize / defaultBaseFontSize, 0.72);
}

export function resolveCatalogCardLayout(args: {
  cardWidth: number;
  cardHeight: number;
  options: CatalogStyleOptions;
  showDiscountBadge: boolean;
  showMeta?: boolean;
  showPromoLine: boolean;
  showNormalPrice: boolean;
  showSinglePrice?: boolean;
  metricScale?: number;
}) {
  const {
    cardWidth,
    cardHeight,
    options,
    showDiscountBadge,
    showMeta = true,
    showPromoLine,
    showNormalPrice,
    showSinglePrice = true,
    metricScale = 1,
  } = args;
  const scale = Math.max(metricScale, 0);
  const baseFontScale = getCatalogBaseFontScale(options);
  const typographyScale = baseFontScale * scale;
  const isNormalFlyer = options.flyerType === "normal";
  const effectiveShowDiscountBadge = !isNormalFlyer && showDiscountBadge;
  const effectiveShowMeta = showMeta;
  const effectiveShowPromoLine = !isNormalFlyer && showPromoLine;
  const effectiveShowNormalPrice = !isNormalFlyer && showNormalPrice;
  const effectiveShowSinglePrice = !effectiveShowPromoLine && showSinglePrice;
  const scaledCardPadding = options.cardPadding * scale;
  const scaledImageAreaHeight = options.imageAreaHeight * scale;
  const scaledTitleFontSize = options.titleFontSize * typographyScale;
  const scaledSkuFontSize = options.skuFontSize * typographyScale;
  const scaledPromoPriceFontSize = options.promoPriceFontSize * typographyScale;
  const scaledNormalPriceFontSize = options.normalPriceFontSize * typographyScale;
  const scaledBadgeHeight = CATALOG_CARD_BADGE_HEIGHT * scale;
  const scaledImageGap = CATALOG_CARD_IMAGE_GAP * scale;
  const scaledBadgeGap = CATALOG_CARD_BADGE_GAP * scale;
  const scaledTitleMetaGap = CATALOG_CARD_TITLE_META_GAP * scale;
  const padding = Math.max(scaledCardPadding, 0);
  const innerRect = rect(padding, padding, cardWidth - padding * 2, cardHeight - padding * 2);
  const innerBottom = innerRect.y + innerRect.height;
  const imageTopInset = Math.min(
    Math.max(padding * CATALOG_CARD_IMAGE_TOP_INSET_FACTOR, 4 * scale),
    padding,
  );
  const normalImageBoost = isNormalFlyer
    ? Math.max(20 * scale, scaledTitleFontSize * 0.75 + scaledNormalPriceFontSize * 0.55)
    : 0;
  const imageHeight = clamp(
    scaledImageAreaHeight + Math.max(padding - imageTopInset, 0) + normalImageBoost,
    0,
    innerBottom - imageTopInset,
  );
  const imageRect = rect(innerRect.x, imageTopInset, innerRect.width, imageHeight);
  const badgeRect = effectiveShowDiscountBadge
    ? optionalRect(
        innerRect.x,
        imageRect.y + imageRect.height + scaledImageGap,
        innerRect.width,
        scaledBadgeHeight,
      )
    : null;
  const contentTop = imageRect.y + imageRect.height + scaledImageGap + (badgeRect ? scaledBadgeHeight + scaledBadgeGap : 0);
  const singlePriceFontSize = isNormalFlyer
    ? Math.max(scaledPromoPriceFontSize, scaledNormalPriceFontSize + 10 * scale)
    : Math.max(
        scaledPromoPriceFontSize - 4 * scale,
        scaledNormalPriceFontSize + 6 * scale,
      );
  const promoPriceLineHeight = scaledPromoPriceFontSize * CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT;
  const normalPriceLineHeight = scaledNormalPriceFontSize * CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT;
  const singlePriceLineHeight = singlePriceFontSize * CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT;
  const priceBlockHeight = effectiveShowPromoLine
    ? promoPriceLineHeight + (effectiveShowNormalPrice ? scaledTitleMetaGap + normalPriceLineHeight : 0)
    : effectiveShowSinglePrice
      ? singlePriceLineHeight
      : 0;
  const priceBlockTop = priceBlockHeight <= 0
    ? innerBottom
    : isNormalFlyer
      ? Math.max(contentTop, innerBottom - priceBlockHeight - scaledTitleMetaGap)
      : Math.max(contentTop, innerBottom - priceBlockHeight);
  const availablePriceHeight = Math.max(innerBottom - priceBlockTop, 0);
  const availableContentHeight = Math.max(priceBlockTop - contentTop, 0);
  const metaHeight = scaledSkuFontSize * CATALOG_CARD_META_LINE_HEIGHT;
  const reservedMetaHeight = effectiveShowMeta && metaHeight > 0 ? metaHeight + scaledTitleMetaGap : 0;
  const titleLineHeight = scaledTitleFontSize * CATALOG_CARD_TITLE_LINE_HEIGHT;
  const titleMaxHeight = titleLineHeight * CATALOG_CARD_TITLE_MAX_LINES;
  const titleHeight = Math.min(Math.max(availableContentHeight - reservedMetaHeight, 0), titleMaxHeight);
  const titleRect = optionalRect(innerRect.x, contentTop, innerRect.width, titleHeight);
  const metaTop = contentTop + titleHeight + (titleRect ? scaledTitleMetaGap : 0);
  const metaRect = effectiveShowMeta
    ? optionalRect(innerRect.x, metaTop, innerRect.width, Math.min(metaHeight, Math.max(priceBlockTop - metaTop, 0)))
    : null;

  return {
    innerRect,
    imageRect,
    badgeRect,
    titleRect,
    metaRect,
    promoPriceRect: effectiveShowPromoLine
      ? optionalRect(
          innerRect.x,
          priceBlockTop,
          innerRect.width,
          Math.min(promoPriceLineHeight, availablePriceHeight),
        )
      : null,
    normalPriceRowRect: effectiveShowPromoLine && effectiveShowNormalPrice
      ? optionalRect(
          innerRect.x,
          priceBlockTop + promoPriceLineHeight + scaledTitleMetaGap,
          innerRect.width,
          Math.min(
            normalPriceLineHeight,
            Math.max(
              innerBottom - (priceBlockTop + promoPriceLineHeight + scaledTitleMetaGap),
              0,
            ),
          ),
        )
      : null,
    singlePriceRect: effectiveShowPromoLine || !effectiveShowSinglePrice
      ? null
      : optionalRect(
          innerRect.x,
          priceBlockTop,
          innerRect.width,
          Math.min(singlePriceLineHeight, availablePriceHeight),
        ),
    titleFontSize: scaledTitleFontSize,
    metaFontSize: scaledSkuFontSize,
    promoPriceFontSize: scaledPromoPriceFontSize,
    normalPriceFontSize: scaledNormalPriceFontSize,
    titleLineHeight,
    metaLineHeight: metaHeight,
    promoPriceLineHeight,
    normalPriceLineHeight,
    singlePriceLineHeight,
    singlePriceFontSize,
  } satisfies CatalogResolvedCardLayout;
}
