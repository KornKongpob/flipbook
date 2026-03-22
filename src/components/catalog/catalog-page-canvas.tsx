"use client";

import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import { resolveCatalogPageLayout } from "@/lib/catalog/layout";
import type { CatalogStyleOptions } from "@/lib/catalog/style-options";

export interface CatalogPageCanvasItem {
  id: string;
  title: string;
  sku?: string | null;
  packSize?: string | null;
  unit?: string | null;
  normalPrice?: number | null;
  promoPrice?: number | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  imageUrl?: string | null;
}

interface CatalogPageCanvasProps {
  items: CatalogPageCanvasItem[];
  options?: Partial<CatalogStyleOptions>;
  pageBackgroundPreviewUrl?: string | null;
  showSafeAreaGuides?: boolean;
}

function SafeAreaGuide({
  height,
  label,
  show,
}: {
  height: number;
  label: string;
  show: boolean;
}) {
  if (height <= 0) {
    return null;
  }

  if (!show) {
    return <div className="shrink-0" style={{ height: `${height}px` }} />;
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-dashed border-white/80 bg-white/45"
      style={{ height: `${height}px` }}
    >
      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-strong shadow-sm">
        {label}
      </span>
    </div>
  );
}

export function CatalogPageCanvas({
  items,
  options,
  pageBackgroundPreviewUrl = null,
  showSafeAreaGuides = false,
}: CatalogPageCanvasProps) {
  const style = {
    ...DEFAULT_STYLE_OPTIONS,
    ...options,
  };
  const layout = resolveCatalogPageLayout(210, 297, {
    layoutPreset: style.layoutPreset,
    pagePadding: style.pagePadding,
    pageGap: style.pageGap,
    headerSpace: style.headerSpace,
    footerSpace: style.footerSpace,
  });

  return (
    <div
      className="catalog-page relative overflow-hidden"
      style={{
        backgroundColor: style.pageBackgroundColor,
      }}
    >
      {pageBackgroundPreviewUrl ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${pageBackgroundPreviewUrl})`,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: style.pageBackgroundFit,
            opacity: style.pageBackgroundOpacity,
          }}
        />
      ) : null}

      <div className="relative flex h-full flex-col" style={{ padding: `${layout.padding}px` }}>
        <SafeAreaGuide height={layout.headerSpace} label="Header media space" show={showSafeAreaGuides} />

        <div
          className="grid min-h-0 flex-1"
          style={{
            gap: `${layout.gap}px`,
            gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item) => (
            <div key={item.id} className="min-h-0 min-w-0 overflow-hidden">
              <CatalogCardPreview
                title={item.title}
                sku={item.sku}
                packSize={item.packSize}
                unit={item.unit}
                normalPrice={item.normalPrice}
                promoPrice={item.promoPrice}
                discountAmount={item.discountAmount}
                discountPercent={item.discountPercent}
                imageUrl={item.imageUrl}
                options={style}
              />
            </div>
          ))}
        </div>

        <SafeAreaGuide height={layout.footerSpace} label="Footer media space" show={showSafeAreaGuides} />
      </div>
    </div>
  );
}
