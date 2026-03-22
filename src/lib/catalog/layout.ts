export type CatalogLayoutPreset = "3x3" | "4x3" | "2x3";

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
  padding: number;
  gap: number;
  headerSpace: number;
  footerSpace: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
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
    padding,
    gap,
    headerSpace,
    footerSpace,
    frameX: padding,
    frameY: padding + headerSpace,
    frameWidth,
    frameHeight,
    cardWidth,
    cardHeight,
  };
}
