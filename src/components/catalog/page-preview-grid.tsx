import { chunk } from "@/lib/utils";
import type { CatalogItemView } from "@/lib/catalog/repository";
import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";

interface PagePreviewGridProps {
  items: Array<
    CatalogItemView & {
      previewUrl?: string | null;
    }
  >;
  options?: {
    variant?: string;
    showNormalPrice?: boolean;
    showPromoPrice?: boolean;
    showDiscountAmount?: boolean;
    showDiscountPercent?: boolean;
    showSku?: boolean;
    showPackSize?: boolean;
  };
}

export function PagePreviewGrid({ items, options }: PagePreviewGridProps) {
  const visibleItems = items.filter((item) => item.is_visible);
  const pages = chunk(visibleItems, 9);

  if (!pages.length) {
    return (
      <div className="glass-panel rounded-[30px] border border-dashed border-line p-10 text-center text-sm text-muted">
        No visible items. Turn at least one product back on to preview the page layout.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pages.map((pageItems, pageIndex) => (
        <div key={pageIndex} className="catalog-page p-5">
          <div className="grid h-full grid-cols-3 gap-4">
            {pageItems.map((item) => (
              <CatalogCardPreview
                key={item.id}
                title={item.display_name_override || item.product_name}
                sku={item.sku}
                packSize={item.pack_size}
                unit={item.unit}
                normalPrice={item.normal_price}
                promoPrice={item.promo_price}
                discountAmount={item.discount_amount}
                discountPercent={item.discount_percent}
                imageUrl={item.previewUrl}
                options={options}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
