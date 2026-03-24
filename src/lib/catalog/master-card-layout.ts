export const CATALOG_CARD_ELEMENT_KEYS = [
  "image",
  "discountBadge",
  "title",
  "meta",
  "promoPrice",
  "normalPrice",
  "discountPercent",
  "singlePrice",
  "strikeLine",
] as const;

export type CatalogCardElementKey = (typeof CATALOG_CARD_ELEMENT_KEYS)[number];

export interface CatalogCardElementOffset {
  x: number;
  y: number;
}

export interface CatalogRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CatalogBaseCardElementRects {
  imageRect: CatalogRectLike;
  badgeRect: CatalogRectLike | null;
  titleRect: CatalogRectLike | null;
  metaRect: CatalogRectLike | null;
  promoPriceRect: CatalogRectLike | null;
  normalPriceRect: CatalogRectLike | null;
  singlePriceRect: CatalogRectLike | null;
  normalPriceFontSize: number;
}

export interface CatalogResolvedCardElementRects {
  imageRect: CatalogRectLike;
  badgeRect: CatalogRectLike | null;
  titleRect: CatalogRectLike | null;
  metaRect: CatalogRectLike | null;
  promoPriceRect: CatalogRectLike | null;
  normalPriceRect: CatalogRectLike | null;
  discountPercentRect: CatalogRectLike | null;
  singlePriceRect: CatalogRectLike | null;
  strikeLineRect: CatalogRectLike | null;
}

export type CatalogMasterCardLayout = Record<CatalogCardElementKey, CatalogCardElementOffset>;

const OFFSET_MIN = -160;
const OFFSET_MAX = 160;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function asOffsetValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return clamp(parsed, OFFSET_MIN, OFFSET_MAX);
}

export function createDefaultCatalogMasterCardLayout(): CatalogMasterCardLayout {
  return {
    image: { x: 0, y: 0 },
    discountBadge: { x: 0, y: 0 },
    title: { x: 0, y: 0 },
    meta: { x: 0, y: 0 },
    promoPrice: { x: 0, y: 0 },
    normalPrice: { x: 0, y: 0 },
    discountPercent: { x: 0, y: 0 },
    singlePrice: { x: 0, y: 0 },
    strikeLine: { x: 0, y: 0 },
  };
}

export function mergeCatalogMasterCardLayout(raw: unknown): CatalogMasterCardLayout {
  const fallback = createDefaultCatalogMasterCardLayout();

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const source = raw as Partial<Record<CatalogCardElementKey, { x?: unknown; y?: unknown }>>;
  const nextLayout = createDefaultCatalogMasterCardLayout();

  CATALOG_CARD_ELEMENT_KEYS.forEach((key) => {
    const entry = source[key];

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return;
    }

    nextLayout[key] = {
      x: asOffsetValue(entry.x),
      y: asOffsetValue(entry.y),
    };
  });

  return nextLayout;
}

export function offsetCatalogRect<T extends { x: number; y: number }>(
  rect: T | null,
  offset: CatalogCardElementOffset,
): T | null {
  if (!rect) {
    return null;
  }

  return {
    ...rect,
    x: rect.x + offset.x,
    y: rect.y + offset.y,
  };
}

export function getCatalogCardElementOffset(
  layout: CatalogMasterCardLayout | null | undefined,
  key: CatalogCardElementKey,
): CatalogCardElementOffset {
  if (!layout) {
    return { x: 0, y: 0 };
  }

  return layout[key] ?? { x: 0, y: 0 };
}

function createRect(x: number, y: number, width: number, height: number): CatalogRectLike | null {
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

export function resolveCatalogCardElementRects(args: {
  baseRects: CatalogBaseCardElementRects;
  masterCardLayout: CatalogMasterCardLayout | null | undefined;
  normalPriceTextWidth: number;
  showDiscountPercent: boolean;
}) {
  const {
    baseRects,
    masterCardLayout,
    normalPriceTextWidth,
    showDiscountPercent,
  } = args;
  const normalPriceRect = offsetCatalogRect(
    baseRects.normalPriceRect,
    getCatalogCardElementOffset(masterCardLayout, "normalPrice"),
  );
  const strikeLineBaseRect = normalPriceRect
    ? createRect(
        normalPriceRect.x,
        normalPriceRect.y + Math.max(baseRects.normalPriceFontSize * 0.55, 6),
        Math.max(normalPriceTextWidth, 0),
        1,
      )
    : null;
  const discountPercentBaseRect = normalPriceRect && showDiscountPercent
    ? createRect(
        normalPriceRect.x + Math.max(normalPriceTextWidth, 0) + 8,
        normalPriceRect.y,
        Math.max(normalPriceRect.width - Math.max(normalPriceTextWidth, 0) - 8, 0),
        normalPriceRect.height,
      )
    : null;

  return {
    imageRect: offsetCatalogRect(baseRects.imageRect, getCatalogCardElementOffset(masterCardLayout, "image")) ?? baseRects.imageRect,
    badgeRect: offsetCatalogRect(baseRects.badgeRect, getCatalogCardElementOffset(masterCardLayout, "discountBadge")),
    titleRect: offsetCatalogRect(baseRects.titleRect, getCatalogCardElementOffset(masterCardLayout, "title")),
    metaRect: offsetCatalogRect(baseRects.metaRect, getCatalogCardElementOffset(masterCardLayout, "meta")),
    promoPriceRect: offsetCatalogRect(baseRects.promoPriceRect, getCatalogCardElementOffset(masterCardLayout, "promoPrice")),
    normalPriceRect,
    discountPercentRect: offsetCatalogRect(
      discountPercentBaseRect,
      getCatalogCardElementOffset(masterCardLayout, "discountPercent"),
    ),
    singlePriceRect: offsetCatalogRect(baseRects.singlePriceRect, getCatalogCardElementOffset(masterCardLayout, "singlePrice")),
    strikeLineRect: offsetCatalogRect(
      strikeLineBaseRect,
      getCatalogCardElementOffset(masterCardLayout, "strikeLine"),
    ),
  } satisfies CatalogResolvedCardElementRects;
}
