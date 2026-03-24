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

export interface CatalogCardElementSizeAdjustment {
  width: number;
  height: number;
}

export interface CatalogMasterCardElementLayout extends CatalogCardElementOffset, CatalogCardElementSizeAdjustment {
  visible: boolean;
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
  imageRect: CatalogRectLike | null;
  badgeRect: CatalogRectLike | null;
  titleRect: CatalogRectLike | null;
  metaRect: CatalogRectLike | null;
  promoPriceRect: CatalogRectLike | null;
  normalPriceRect: CatalogRectLike | null;
  discountPercentRect: CatalogRectLike | null;
  singlePriceRect: CatalogRectLike | null;
  strikeLineRect: CatalogRectLike | null;
}

export type CatalogMasterCardLayout = Record<CatalogCardElementKey, CatalogMasterCardElementLayout>;

const ADJUSTMENT_MIN = -160;
const ADJUSTMENT_MAX = 160;
const MIN_ELEMENT_SIZE = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function asAdjustmentValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return clamp(parsed, ADJUSTMENT_MIN, ADJUSTMENT_MAX);
}

function asVisibleValue(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

export function createDefaultCatalogMasterCardElementLayout(): CatalogMasterCardElementLayout {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: true,
  };
}

export function createDefaultCatalogMasterCardLayout(): CatalogMasterCardLayout {
  return {
    image: createDefaultCatalogMasterCardElementLayout(),
    discountBadge: createDefaultCatalogMasterCardElementLayout(),
    title: createDefaultCatalogMasterCardElementLayout(),
    meta: createDefaultCatalogMasterCardElementLayout(),
    promoPrice: createDefaultCatalogMasterCardElementLayout(),
    normalPrice: createDefaultCatalogMasterCardElementLayout(),
    discountPercent: createDefaultCatalogMasterCardElementLayout(),
    singlePrice: createDefaultCatalogMasterCardElementLayout(),
    strikeLine: createDefaultCatalogMasterCardElementLayout(),
  };
}

export function mergeCatalogMasterCardLayout(raw: unknown): CatalogMasterCardLayout {
  const fallback = createDefaultCatalogMasterCardLayout();

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const source = raw as Partial<Record<CatalogCardElementKey, {
    x?: unknown;
    y?: unknown;
    width?: unknown;
    height?: unknown;
    visible?: unknown;
  }>>;
  const nextLayout = createDefaultCatalogMasterCardLayout();

  CATALOG_CARD_ELEMENT_KEYS.forEach((key) => {
    const entry = source[key];

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return;
    }

    nextLayout[key] = {
      x: asAdjustmentValue(entry.x),
      y: asAdjustmentValue(entry.y),
      width: asAdjustmentValue(entry.width),
      height: asAdjustmentValue(entry.height),
      visible: asVisibleValue(entry.visible),
    };
  });

  return nextLayout;
}

export function getCatalogCardElementLayout(
  layout: CatalogMasterCardLayout | null | undefined,
  key: CatalogCardElementKey,
): CatalogMasterCardElementLayout {
  if (!layout) {
    return createDefaultCatalogMasterCardElementLayout();
  }

  return layout[key] ?? createDefaultCatalogMasterCardElementLayout();
}

export function adjustCatalogRect<T extends CatalogRectLike>(
  rect: T | null,
  layoutEntry: CatalogMasterCardElementLayout,
): T | null {
  if (!rect || !layoutEntry.visible) {
    return null;
  }

  return {
    ...rect,
    x: rect.x + layoutEntry.x,
    y: rect.y + layoutEntry.y,
    width: Math.max(rect.width + layoutEntry.width, MIN_ELEMENT_SIZE),
    height: Math.max(rect.height + layoutEntry.height, MIN_ELEMENT_SIZE),
  };
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
  const normalPriceRect = adjustCatalogRect(
    baseRects.normalPriceRect,
    getCatalogCardElementLayout(masterCardLayout, "normalPrice"),
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
    imageRect: adjustCatalogRect(baseRects.imageRect, getCatalogCardElementLayout(masterCardLayout, "image")),
    badgeRect: adjustCatalogRect(baseRects.badgeRect, getCatalogCardElementLayout(masterCardLayout, "discountBadge")),
    titleRect: adjustCatalogRect(baseRects.titleRect, getCatalogCardElementLayout(masterCardLayout, "title")),
    metaRect: adjustCatalogRect(baseRects.metaRect, getCatalogCardElementLayout(masterCardLayout, "meta")),
    promoPriceRect: adjustCatalogRect(baseRects.promoPriceRect, getCatalogCardElementLayout(masterCardLayout, "promoPrice")),
    normalPriceRect,
    discountPercentRect: adjustCatalogRect(
      discountPercentBaseRect,
      getCatalogCardElementLayout(masterCardLayout, "discountPercent"),
    ),
    singlePriceRect: adjustCatalogRect(baseRects.singlePriceRect, getCatalogCardElementLayout(masterCardLayout, "singlePrice")),
    strikeLineRect: adjustCatalogRect(
      strikeLineBaseRect,
      getCatalogCardElementLayout(masterCardLayout, "strikeLine"),
    ),
  } satisfies CatalogResolvedCardElementRects;
}
