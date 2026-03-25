import type { Json } from "@/lib/database.types";

export interface CatalogPdfImageWarningItem {
  itemId: string;
  sku: string | null;
  displayName: string;
  reason: string;
}

interface CatalogPdfWarningEvent {
  step: string;
  created_at: string;
  metadata_json: Json;
}

export interface CatalogPdfImageWarningSummary {
  createdAt: string;
  items: CatalogPdfImageWarningItem[];
  count: number;
}

function isWarningItem(value: unknown): value is CatalogPdfImageWarningItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const entry = value as Partial<CatalogPdfImageWarningItem>;

  return typeof entry.itemId === "string"
    && (typeof entry.sku === "string" || entry.sku === null)
    && typeof entry.displayName === "string"
    && typeof entry.reason === "string";
}

function getWarningItems(metadataJson: Json): CatalogPdfImageWarningItem[] {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return [];
  }

  const imageWarnings = (metadataJson as { imageWarnings?: unknown }).imageWarnings;

  if (!Array.isArray(imageWarnings)) {
    return [];
  }

  return imageWarnings.filter(isWarningItem);
}

export function getLatestCatalogPdfImageWarningSummary(
  events: CatalogPdfWarningEvent[],
): CatalogPdfImageWarningSummary | null {
  const latestPdfEvent = events.find((event) => event.step === "pdf");

  if (!latestPdfEvent) {
    return null;
  }

  const items = getWarningItems(latestPdfEvent.metadata_json);

  if (!items.length) {
    return null;
  }

  return {
    createdAt: latestPdfEvent.created_at,
    items,
    count: items.length,
  };
}

export function formatCatalogPdfImageWarningDescription(
  summary: CatalogPdfImageWarningSummary,
  maxItems = 3,
) {
  const visibleItems = summary.items.slice(0, maxItems).map((item) => {
    const skuLabel = item.sku ? `${item.sku} - ` : "";
    return `${skuLabel}${item.displayName}`;
  });
  const remainingCount = Math.max(summary.count - visibleItems.length, 0);
  const remainingLabel = remainingCount > 0 ? ` and ${remainingCount} more` : "";

  return `${summary.count} item(s) used a placeholder image in the latest PDF export: ${visibleItems.join(", ")}${remainingLabel}.`;
}
