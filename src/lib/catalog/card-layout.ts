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

export function resolveCatalogCardLayout(args: {
  cardWidth: number;
  cardHeight: number;
  options: CatalogStyleOptions;
  showDiscountBadge: boolean;
  showPromoLine: boolean;
  showNormalPrice: boolean;
}) {
  const { cardWidth, cardHeight, options, showDiscountBadge, showPromoLine, showNormalPrice } = args;
  const padding = Math.max(options.cardPadding, 0);
  const innerRect = rect(padding, padding, cardWidth - padding * 2, cardHeight - padding * 2);
  const innerBottom = innerRect.y + innerRect.height;
  const imageHeight = clamp(options.imageAreaHeight, 0, innerRect.height);
  const imageRect = rect(innerRect.x, innerRect.y, innerRect.width, imageHeight);
  const badgeRect = showDiscountBadge
    ? optionalRect(
        innerRect.x,
        imageRect.y + imageRect.height + CATALOG_CARD_IMAGE_GAP,
        innerRect.width,
        CATALOG_CARD_BADGE_HEIGHT,
      )
    : null;
  const contentTop = imageRect.y + imageRect.height + CATALOG_CARD_IMAGE_GAP + (badgeRect ? CATALOG_CARD_BADGE_HEIGHT + CATALOG_CARD_BADGE_GAP : 0);
  const singlePriceFontSize = Math.max(options.promoPriceFontSize - 4, options.normalPriceFontSize + 6);
  const promoPriceLineHeight = options.promoPriceFontSize * CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT;
  const normalPriceLineHeight = options.normalPriceFontSize * CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT;
  const singlePriceLineHeight = singlePriceFontSize * CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT;
  const priceBlockHeight = showPromoLine
    ? promoPriceLineHeight + (showNormalPrice ? CATALOG_CARD_TITLE_META_GAP + normalPriceLineHeight : 0)
    : singlePriceLineHeight;
  const priceBlockTop = Math.max(contentTop, innerBottom - priceBlockHeight);
  const availablePriceHeight = Math.max(innerBottom - priceBlockTop, 0);
  const availableContentHeight = Math.max(priceBlockTop - contentTop, 0);
  const metaHeight = options.skuFontSize * CATALOG_CARD_META_LINE_HEIGHT;
  const reservedMetaHeight = metaHeight > 0 ? metaHeight + CATALOG_CARD_TITLE_META_GAP : 0;
  const titleLineHeight = options.titleFontSize * CATALOG_CARD_TITLE_LINE_HEIGHT;
  const titleMaxHeight = titleLineHeight * CATALOG_CARD_TITLE_MAX_LINES;
  const titleHeight = Math.min(Math.max(availableContentHeight - reservedMetaHeight, 0), titleMaxHeight);
  const titleRect = optionalRect(innerRect.x, contentTop, innerRect.width, titleHeight);
  const metaTop = contentTop + titleHeight + (titleRect ? CATALOG_CARD_TITLE_META_GAP : 0);
  const metaRect = optionalRect(innerRect.x, metaTop, innerRect.width, Math.min(metaHeight, Math.max(priceBlockTop - metaTop, 0)));

  return {
    innerRect,
    imageRect,
    badgeRect,
    titleRect,
    metaRect,
    promoPriceRect: showPromoLine
      ? optionalRect(
          innerRect.x,
          priceBlockTop,
          innerRect.width,
          Math.min(promoPriceLineHeight, availablePriceHeight),
        )
      : null,
    normalPriceRowRect: showPromoLine && showNormalPrice
      ? optionalRect(
          innerRect.x,
          priceBlockTop + promoPriceLineHeight + CATALOG_CARD_TITLE_META_GAP,
          innerRect.width,
          Math.min(
            normalPriceLineHeight,
            Math.max(
              innerBottom - (priceBlockTop + promoPriceLineHeight + CATALOG_CARD_TITLE_META_GAP),
              0,
            ),
          ),
        )
      : null,
    singlePriceRect: showPromoLine
      ? null
      : optionalRect(
          innerRect.x,
          priceBlockTop,
          innerRect.width,
          Math.min(singlePriceLineHeight, availablePriceHeight),
        ),
    titleLineHeight,
    metaLineHeight: metaHeight,
    promoPriceLineHeight,
    normalPriceLineHeight,
    singlePriceLineHeight,
    singlePriceFontSize,
  } satisfies CatalogResolvedCardLayout;
}
