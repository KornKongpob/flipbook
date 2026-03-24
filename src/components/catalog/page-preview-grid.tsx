import { chunk } from "@/lib/utils";
import { CatalogPageCanvas } from "@/components/catalog/catalog-page-canvas";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import { getCatalogItemsPerPage } from "@/lib/catalog/layout";
import { deriveCatalogPricing } from "@/lib/catalog/pricing";
import type { CatalogItemView } from "@/lib/catalog/repository";
import type { CatalogStyleOptions } from "@/lib/catalog/style-options";

interface PagePreviewGridProps {
  items: Array<
    CatalogItemView & {
      previewUrl?: string | null;
    }
  >;
  options?: Partial<CatalogStyleOptions>;
}

export function PagePreviewGrid({ items, options }: PagePreviewGridProps) {
  const style = {
    ...DEFAULT_STYLE_OPTIONS,
    ...options,
  };
  const visibleItems = items.filter((item) => item.is_visible);
  const pages = chunk(visibleItems, getCatalogItemsPerPage(style.layoutPreset));

  if (!pages.length) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
        No visible items. Turn at least one product back on to preview the page layout.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pages.map((pageItems, pageIndex) => (
        <CatalogPageCanvas
          key={pageIndex}
          items={pageItems.map((item) => {
            const pricing = deriveCatalogPricing({
              normalPrice: item.normal_price,
              promoPrice: item.promo_price,
            });

            return {
              id: item.id,
              title: item.display_name_override || item.product_name,
              sku: item.sku,
              packSize: item.pack_size,
              unit: item.unit,
              normalPrice: pricing.normalPrice,
              promoPrice: pricing.promoPrice,
              discountAmount: pricing.discountAmount,
              discountPercent: pricing.discountPercent,
              imageUrl: item.previewUrl,
            };
          })}
          options={style}
        />
      ))}
    </div>
  );
}
