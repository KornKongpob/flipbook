export type CatalogLayoutPreset = "3x3" | "4x3" | "2x3";
export type CatalogMediaFit = "cover" | "contain";
export type CatalogBackgroundAnchor = "page" | "safeArea";

export interface CatalogRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CatalogLayoutPresetDefinition {
  id: CatalogLayoutPreset;
  label: string;
  description: string;
  columns: number;
  rows: number;
}

export interface CatalogPageLayoutOptions {
  layoutPreset: CatalogLayoutPreset;
  pagePadding: number;
  pageGap: number;
  headerSpace: number;
  footerSpace: number;
}

export interface CatalogResolvedPageLayout extends CatalogLayoutPresetDefinition {
  itemsPerPage: number;
  pageWidth: number;
  pageHeight: number;
  padding: number;
  gap: number;
  headerSpace: number;
  footerSpace: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
  headerX: number;
  headerY: number;
  headerWidth: number;
  headerHeight: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  footerX: number;
  footerY: number;
  footerWidth: number;
  footerHeight: number;
  cardWidth: number;
  cardHeight: number;
}

export const CATALOG_LAYOUT_PRESETS: CatalogLayoutPresetDefinition[] = [
  {
    id: "3x3",
    label: "3x3 Standard",
    description: "Balanced layout with 9 items per page.",
    columns: 3,
    rows: 3,
  },
  {
    id: "4x3",
    label: "4x3 Dense",
    description: "Fits 12 items per page for dense promo sheets.",
    columns: 4,
    rows: 3,
  },
  {
    id: "2x3",
    label: "2x3 Feature",
    description: "Larger product cards with 6 items per page.",
    columns: 2,
    rows: 3,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function isCatalogLayoutPreset(value: unknown): value is CatalogLayoutPreset {
  return value === "3x3" || value === "4x3" || value === "2x3";
}

export function isCatalogMediaFit(value: unknown): value is CatalogMediaFit {
  return value === "cover" || value === "contain";
}

export function isCatalogBackgroundAnchor(value: unknown): value is CatalogBackgroundAnchor {
  return value === "page" || value === "safeArea";
}

export function getCatalogLayoutPresetDefinition(
  preset: CatalogLayoutPreset,
): CatalogLayoutPresetDefinition {
  return CATALOG_LAYOUT_PRESETS.find((entry) => entry.id === preset) ?? CATALOG_LAYOUT_PRESETS[0];
}

export function getCatalogItemsPerPage(preset: CatalogLayoutPreset) {
  const definition = getCatalogLayoutPresetDefinition(preset);
  return definition.columns * definition.rows;
}

export function resolveCatalogPageLayout(
  pageWidth: number,
  pageHeight: number,
  options: CatalogPageLayoutOptions,
): CatalogResolvedPageLayout {
  const definition = getCatalogLayoutPresetDefinition(options.layoutPreset);
  const padding = Math.max(options.pagePadding, 0);
  const gap = Math.max(options.pageGap, 0);
  const availableWidth = Math.max(pageWidth - padding * 2, 0);
  const availableHeight = Math.max(pageHeight - padding * 2, 0);
  const headerSpace = clamp(options.headerSpace, 0, availableHeight);
  const footerSpace = clamp(options.footerSpace, 0, Math.max(availableHeight - headerSpace, 0));
  const frameHeight = Math.max(availableHeight - headerSpace - footerSpace, 0);
  const frameWidth = availableWidth;
  const contentX = padding;
  const contentY = padding;
  const contentWidth = availableWidth;
  const contentHeight = availableHeight;
  const headerX = contentX;
  const headerY = contentY;
  const headerWidth = contentWidth;
  const headerHeight = headerSpace;
  const frameX = contentX;
  const frameY = contentY + headerSpace;
  const footerX = contentX;
  const footerY = frameY + frameHeight;
  const footerWidth = contentWidth;
  const footerHeight = footerSpace;
  const cardWidth = Math.max(
    (frameWidth - gap * (definition.columns - 1)) / definition.columns,
    0,
  );
  const cardHeight = Math.max(
    (frameHeight - gap * (definition.rows - 1)) / definition.rows,
    0,
  );

  return {
    ...definition,
    itemsPerPage: definition.columns * definition.rows,
    pageWidth,
    pageHeight,
    padding,
    gap,
    headerSpace,
    footerSpace,
    contentX,
    contentY,
    contentWidth,
    contentHeight,
    headerX,
    headerY,
    headerWidth,
    headerHeight,
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    footerX,
    footerY,
    footerWidth,
    footerHeight,
    cardWidth,
    cardHeight,
  };
}

export function getCatalogPageRect(layout: CatalogResolvedPageLayout): CatalogRect {
  return {
    x: 0,
    y: 0,
    width: layout.pageWidth,
    height: layout.pageHeight,
  };
}

export function getCatalogBackgroundRect(
  layout: CatalogResolvedPageLayout,
  anchor: CatalogBackgroundAnchor,
): CatalogRect {
  if (anchor === "safeArea") {
    return {
      x: layout.frameX,
      y: layout.frameY,
      width: layout.frameWidth,
      height: layout.frameHeight,
    };
  }

  return getCatalogPageRect(layout);
}

export function getCatalogHeaderRect(layout: CatalogResolvedPageLayout): CatalogRect {
  return {
    x: layout.headerX,
    y: layout.headerY,
    width: layout.headerWidth,
    height: layout.headerHeight,
  };
}

export function getCatalogFooterRect(layout: CatalogResolvedPageLayout): CatalogRect {
  return {
    x: layout.footerX,
    y: layout.footerY,
    width: layout.footerWidth,
    height: layout.footerHeight,
  };
}

export function scaleRectFromCenter(rect: CatalogRect, scale: number): CatalogRect {
  const nextWidth = rect.width * Math.max(scale, 0);
  const nextHeight = rect.height * Math.max(scale, 0);

  return {
    x: rect.x + (rect.width - nextWidth) / 2,
    y: rect.y + (rect.height - nextHeight) / 2,
    width: nextWidth,
    height: nextHeight,
  };
}

export function offsetRectByPercent(rect: CatalogRect, offsetX: number, offsetY: number): CatalogRect {
  return {
    ...rect,
    x: rect.x + rect.width * (offsetX / 100),
    y: rect.y + rect.height * (offsetY / 100),
  };
}
