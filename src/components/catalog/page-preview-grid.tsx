import { chunk } from "@/lib/utils";
import { PRODUCTS_PER_PAGE } from "@/lib/catalog/constants";
import type { CatalogItemView } from "@/lib/catalog/repository";
import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";
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
  const visibleItems = items.filter((item) => item.is_visible);
  const pages = chunk(visibleItems, PRODUCTS_PER_PAGE);

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
        <div
          key={pageIndex}
          className="catalog-page overflow-hidden"
          style={{
            backgroundColor: options?.pageBackgroundColor,
            padding: `${options?.pagePadding ?? 18}px`,
          }}
        >
          <div className="grid h-full grid-cols-3 grid-rows-3" style={{ gap: `${options?.pageGap ?? 12}px` }}>
            {pageItems.map((item) => (
              <div key={item.id} className="min-h-0 min-w-0 overflow-hidden">
                <CatalogCardPreview
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
