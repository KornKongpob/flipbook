import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import {
  isCatalogBackgroundAnchor,
  isCatalogLayoutPreset,
  isCatalogMediaFit,
  type CatalogBackgroundAnchor,
  type CatalogLayoutPreset,
  type CatalogMediaFit,
} from "@/lib/catalog/layout";

export type CatalogLayoutVariant = "promo" | "clean";
export type CatalogBackgroundFit = CatalogMediaFit;

export interface CatalogStyleOptions {
  variant: CatalogLayoutVariant;
  layoutPreset: CatalogLayoutPreset;
  showNormalPrice: boolean;
  showPromoPrice: boolean;
  showDiscountAmount: boolean;
  showDiscountPercent: boolean;
  showSku: boolean;
  showPackSize: boolean;
  pageBackgroundColor: string;
  pageBackgroundImageBucket: string | null;
  pageBackgroundImagePath: string | null;
  pageBackgroundFit: CatalogBackgroundFit;
  pageBackgroundOpacity: number;
  pageBackgroundOffsetX: number;
  pageBackgroundOffsetY: number;
  pageBackgroundScale: number;
  pageBackgroundAnchor: CatalogBackgroundAnchor;
  headerMediaBucket: string | null;
  headerMediaPath: string | null;
  headerMediaFit: CatalogMediaFit;
  headerMediaOpacity: number;
  headerMediaOffsetX: number;
  headerMediaOffsetY: number;
  headerMediaScale: number;
  footerMediaBucket: string | null;
  footerMediaPath: string | null;
  footerMediaFit: CatalogMediaFit;
  footerMediaOpacity: number;
  footerMediaOffsetX: number;
  footerMediaOffsetY: number;
  footerMediaScale: number;
  pagePadding: number;
  pageGap: number;
  headerSpace: number;
  footerSpace: number;
  cardPadding: number;
  cardRadius: number;
  imageAreaHeight: number;
  titleFontSize: number;
  skuFontSize: number;
  promoPriceFontSize: number;
  normalPriceFontSize: number;
  cardBackgroundColor: string;
  cardBorderColor: string;
  imageBackgroundColor: string;
  titleColor: string;
  metaColor: string;
  promoPriceColor: string;
  normalPriceColor: string;
  discountBadgeBackgroundColor: string;
  discountBadgeTextColor: string;
}

export interface EditorCatalogStyleOptions extends CatalogStyleOptions {
  pageBackgroundPreviewUrl: string | null;
  headerMediaPreviewUrl: string | null;
  footerMediaPreviewUrl: string | null;
}

export interface CatalogStylePreset {
  id: string;
  label: string;
  options: Partial<CatalogStyleOptions>;
}

export const CATALOG_STYLE_PRESETS: CatalogStylePreset[] = [
  {
    id: "warm-promo",
    label: "Warm Promo",
    options: {
      variant: "promo",
      pageBackgroundColor: "#fff8f2",
      cardBackgroundColor: "#ffffff",
      cardBorderColor: "#eedbcf",
      imageBackgroundColor: "#fff5ef",
      titleColor: "#211914",
      metaColor: "#75675a",
      promoPriceColor: "#e60000",
      normalPriceColor: "#98816a",
      discountBadgeBackgroundColor: "#ffc107",
      discountBadgeTextColor: "#a81a05",
    },
  },
  {
    id: "clean-blue",
    label: "Clean Blue",
    options: {
      variant: "clean",
      pageBackgroundColor: "#f5f8ff",
      cardBackgroundColor: "#ffffff",
      cardBorderColor: "#dbe7ff",
      imageBackgroundColor: "#eef4ff",
      titleColor: "#1e3a5f",
      metaColor: "#58708d",
      promoPriceColor: "#d62828",
      normalPriceColor: "#64748b",
      discountBadgeBackgroundColor: "#fde68a",
      discountBadgeTextColor: "#92400e",
    },
  },
  {
    id: "soft-market",
    label: "Soft Market",
    options: {
      variant: "promo",
      pageBackgroundColor: "#f7fbf7",
      cardBackgroundColor: "#ffffff",
      cardBorderColor: "#d9ead8",
      imageBackgroundColor: "#eef8ee",
      titleColor: "#193326",
      metaColor: "#5b6f60",
      promoPriceColor: "#c62828",
      normalPriceColor: "#8b6f5a",
      discountBadgeBackgroundColor: "#facc15",
      discountBadgeTextColor: "#7c2d12",
    },
  },
];

function isVariant(value: unknown): value is CatalogLayoutVariant {
  return value === "promo" || value === "clean";
}

function isBackgroundFit(value: unknown): value is CatalogBackgroundFit {
  return isCatalogMediaFit(value);
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function asColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return fallback;
}

export function mergeCatalogStyleOptions(raw: Record<string, unknown> | null | undefined): CatalogStyleOptions {
  const source = raw ?? {};

  return {
    ...DEFAULT_STYLE_OPTIONS,
    variant: isVariant(source.variant) ? source.variant : DEFAULT_STYLE_OPTIONS.variant,
    layoutPreset: isCatalogLayoutPreset(source.layoutPreset)
      ? source.layoutPreset
      : DEFAULT_STYLE_OPTIONS.layoutPreset,
    showNormalPrice: asBoolean(source.showNormalPrice, DEFAULT_STYLE_OPTIONS.showNormalPrice),
    showPromoPrice: asBoolean(source.showPromoPrice, DEFAULT_STYLE_OPTIONS.showPromoPrice),
    showDiscountAmount: asBoolean(source.showDiscountAmount, DEFAULT_STYLE_OPTIONS.showDiscountAmount),
    showDiscountPercent: asBoolean(source.showDiscountPercent, DEFAULT_STYLE_OPTIONS.showDiscountPercent),
    showSku: asBoolean(source.showSku, DEFAULT_STYLE_OPTIONS.showSku),
    showPackSize: asBoolean(source.showPackSize, DEFAULT_STYLE_OPTIONS.showPackSize),
    pageBackgroundColor: asColor(source.pageBackgroundColor, DEFAULT_STYLE_OPTIONS.pageBackgroundColor),
    pageBackgroundImageBucket: asNullableString(source.pageBackgroundImageBucket),
    pageBackgroundImagePath: asNullableString(source.pageBackgroundImagePath),
    pageBackgroundFit: isBackgroundFit(source.pageBackgroundFit)
      ? source.pageBackgroundFit
      : DEFAULT_STYLE_OPTIONS.pageBackgroundFit,
    pageBackgroundOpacity: asNumber(
      source.pageBackgroundOpacity,
      DEFAULT_STYLE_OPTIONS.pageBackgroundOpacity,
      0,
      1,
    ),
    pageBackgroundOffsetX: asNumber(
      source.pageBackgroundOffsetX,
      DEFAULT_STYLE_OPTIONS.pageBackgroundOffsetX,
      -100,
      100,
    ),
    pageBackgroundOffsetY: asNumber(
      source.pageBackgroundOffsetY,
      DEFAULT_STYLE_OPTIONS.pageBackgroundOffsetY,
      -100,
      100,
    ),
    pageBackgroundScale: asNumber(
      source.pageBackgroundScale,
      DEFAULT_STYLE_OPTIONS.pageBackgroundScale,
      0.5,
      2.5,
    ),
    pageBackgroundAnchor: isCatalogBackgroundAnchor(source.pageBackgroundAnchor)
      ? source.pageBackgroundAnchor
      : DEFAULT_STYLE_OPTIONS.pageBackgroundAnchor,
    headerMediaBucket: asNullableString(source.headerMediaBucket),
    headerMediaPath: asNullableString(source.headerMediaPath),
    headerMediaFit: isCatalogMediaFit(source.headerMediaFit)
      ? source.headerMediaFit
      : DEFAULT_STYLE_OPTIONS.headerMediaFit,
    headerMediaOpacity: asNumber(
      source.headerMediaOpacity,
      DEFAULT_STYLE_OPTIONS.headerMediaOpacity,
      0,
      1,
    ),
    headerMediaOffsetX: asNumber(
      source.headerMediaOffsetX,
      DEFAULT_STYLE_OPTIONS.headerMediaOffsetX,
      -100,
      100,
    ),
    headerMediaOffsetY: asNumber(
      source.headerMediaOffsetY,
      DEFAULT_STYLE_OPTIONS.headerMediaOffsetY,
      -100,
      100,
    ),
    headerMediaScale: asNumber(
      source.headerMediaScale,
      DEFAULT_STYLE_OPTIONS.headerMediaScale,
      0.5,
      2.5,
    ),
    footerMediaBucket: asNullableString(source.footerMediaBucket),
    footerMediaPath: asNullableString(source.footerMediaPath),
    footerMediaFit: isCatalogMediaFit(source.footerMediaFit)
      ? source.footerMediaFit
      : DEFAULT_STYLE_OPTIONS.footerMediaFit,
    footerMediaOpacity: asNumber(
      source.footerMediaOpacity,
      DEFAULT_STYLE_OPTIONS.footerMediaOpacity,
      0,
      1,
    ),
    footerMediaOffsetX: asNumber(
      source.footerMediaOffsetX,
      DEFAULT_STYLE_OPTIONS.footerMediaOffsetX,
      -100,
      100,
    ),
    footerMediaOffsetY: asNumber(
      source.footerMediaOffsetY,
      DEFAULT_STYLE_OPTIONS.footerMediaOffsetY,
      -100,
      100,
    ),
    footerMediaScale: asNumber(
      source.footerMediaScale,
      DEFAULT_STYLE_OPTIONS.footerMediaScale,
      0.5,
      2.5,
    ),
    pagePadding: asNumber(source.pagePadding, DEFAULT_STYLE_OPTIONS.pagePadding, 8, 40),
    pageGap: asNumber(source.pageGap, DEFAULT_STYLE_OPTIONS.pageGap, 4, 24),
    headerSpace: asNumber(source.headerSpace, DEFAULT_STYLE_OPTIONS.headerSpace, 0, 180),
    footerSpace: asNumber(source.footerSpace, DEFAULT_STYLE_OPTIONS.footerSpace, 0, 120),
    cardPadding: asNumber(source.cardPadding, DEFAULT_STYLE_OPTIONS.cardPadding, 6, 28),
    cardRadius: asNumber(source.cardRadius, DEFAULT_STYLE_OPTIONS.cardRadius, 8, 32),
    imageAreaHeight: asNumber(source.imageAreaHeight, DEFAULT_STYLE_OPTIONS.imageAreaHeight, 64, 180),
    titleFontSize: asNumber(source.titleFontSize, DEFAULT_STYLE_OPTIONS.titleFontSize, 10, 24),
    skuFontSize: asNumber(source.skuFontSize, DEFAULT_STYLE_OPTIONS.skuFontSize, 8, 18),
    promoPriceFontSize: asNumber(
      source.promoPriceFontSize,
      DEFAULT_STYLE_OPTIONS.promoPriceFontSize,
      16,
      40,
    ),
    normalPriceFontSize: asNumber(
      source.normalPriceFontSize,
      DEFAULT_STYLE_OPTIONS.normalPriceFontSize,
      8,
      22,
    ),
    cardBackgroundColor: asColor(source.cardBackgroundColor, DEFAULT_STYLE_OPTIONS.cardBackgroundColor),
    cardBorderColor: asColor(source.cardBorderColor, DEFAULT_STYLE_OPTIONS.cardBorderColor),
    imageBackgroundColor: asColor(source.imageBackgroundColor, DEFAULT_STYLE_OPTIONS.imageBackgroundColor),
    titleColor: asColor(source.titleColor, DEFAULT_STYLE_OPTIONS.titleColor),
    metaColor: asColor(source.metaColor, DEFAULT_STYLE_OPTIONS.metaColor),
    promoPriceColor: asColor(source.promoPriceColor, DEFAULT_STYLE_OPTIONS.promoPriceColor),
    normalPriceColor: asColor(source.normalPriceColor, DEFAULT_STYLE_OPTIONS.normalPriceColor),
    discountBadgeBackgroundColor: asColor(
      source.discountBadgeBackgroundColor,
      DEFAULT_STYLE_OPTIONS.discountBadgeBackgroundColor,
    ),
    discountBadgeTextColor: asColor(
      source.discountBadgeTextColor,
      DEFAULT_STYLE_OPTIONS.discountBadgeTextColor,
    ),
  };
}

export function withCatalogBackgroundPreview(
  raw: Record<string, unknown> | null | undefined,
  previewUrl: string | null,
): EditorCatalogStyleOptions {
  return {
    ...mergeCatalogStyleOptions(raw),
    pageBackgroundPreviewUrl: previewUrl,
    headerMediaPreviewUrl: null,
    footerMediaPreviewUrl: null,
  };
}

export function withCatalogMediaPreviews(
  raw: Record<string, unknown> | null | undefined,
  previews: {
    pageBackgroundPreviewUrl?: string | null;
    headerMediaPreviewUrl?: string | null;
    footerMediaPreviewUrl?: string | null;
  },
): EditorCatalogStyleOptions {
  return {
    ...mergeCatalogStyleOptions(raw),
    pageBackgroundPreviewUrl: previews.pageBackgroundPreviewUrl ?? null,
    headerMediaPreviewUrl: previews.headerMediaPreviewUrl ?? null,
    footerMediaPreviewUrl: previews.footerMediaPreviewUrl ?? null,
  };
}
