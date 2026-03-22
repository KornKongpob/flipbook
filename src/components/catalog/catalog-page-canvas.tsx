"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import {
  CATALOG_A4_PAGE_HEIGHT,
  CATALOG_A4_PAGE_WIDTH,
  getCatalogBackgroundRect,
  getCatalogFooterRect,
  getCatalogHeaderRect,
  getCatalogMediaRenderRect,
  resolveCatalogPageLayout,
  type CatalogRect,
} from "@/lib/catalog/layout";
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
  headerMediaPreviewUrl?: string | null;
  footerMediaPreviewUrl?: string | null;
  showSafeAreaGuides?: boolean;
}

function rectStyle(rect: CatalogRect) {
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

function MediaLayer({
  rect,
  previewUrl,
  fit,
  opacity,
  offsetX,
  offsetY,
  scale,
}: {
  rect: CatalogRect;
  previewUrl: string | null;
  fit: "cover" | "contain";
  opacity: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}) {
  if (!previewUrl || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const renderRect = getCatalogMediaRenderRect(rect, scale, offsetX, offsetY);

  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={rectStyle(rect)}
    >
      <div
        className="absolute"
        style={{
          left: `${renderRect.x - rect.x}px`,
          top: `${renderRect.y - rect.y}px`,
          width: `${renderRect.width}px`,
          height: `${renderRect.height}px`,
          opacity,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt=""
          className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
        />
      </div>
    </div>
  );
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
  headerMediaPreviewUrl = null,
  footerMediaPreviewUrl = null,
  showSafeAreaGuides = false,
}: CatalogPageCanvasProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const style = useMemo(
    () => ({
      ...DEFAULT_STYLE_OPTIONS,
      ...options,
    }),
    [options],
  );
  const layout = useMemo(
    () => resolveCatalogPageLayout(CATALOG_A4_PAGE_WIDTH, CATALOG_A4_PAGE_HEIGHT, {
      layoutPreset: style.layoutPreset,
      pagePadding: style.pagePadding,
      pageGap: style.pageGap,
      headerSpace: style.headerSpace,
      footerSpace: style.footerSpace,
    }),
    [style.footerSpace, style.headerSpace, style.layoutPreset, style.pageGap, style.pagePadding],
  );
  const backgroundRect = getCatalogBackgroundRect(layout, style.pageBackgroundAnchor);
  const headerRect = getCatalogHeaderRect(layout);
  const footerRect = getCatalogFooterRect(layout);
  const previewScale = previewSize.width > 0 && previewSize.height > 0
    ? Math.min(previewSize.width / layout.pageWidth, previewSize.height / layout.pageHeight)
    : 1;

  useEffect(() => {
    const element = pageRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const styles = window.getComputedStyle(element);
      const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
      const borderRight = Number.parseFloat(styles.borderRightWidth) || 0;
      const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
      const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0;
      const nextWidth = Number.parseFloat(styles.width) - borderLeft - borderRight;
      const nextHeight = Number.parseFloat(styles.height) - borderTop - borderBottom;

      if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
        return;
      }

      setPreviewSize((previous) => {
        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => {
        window.removeEventListener("resize", updateSize);
      };
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={pageRef}
      className="catalog-page relative overflow-hidden"
      style={{
        backgroundColor: style.pageBackgroundColor,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="relative shrink-0"
          style={{
            width: `${layout.pageWidth * previewScale}px`,
            height: `${layout.pageHeight * previewScale}px`,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: `${layout.pageWidth}px`,
              height: `${layout.pageHeight}px`,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
            }}
          >
            <MediaLayer
              rect={backgroundRect}
              previewUrl={pageBackgroundPreviewUrl}
              fit={style.pageBackgroundFit}
              opacity={style.pageBackgroundOpacity}
              offsetX={style.pageBackgroundOffsetX}
              offsetY={style.pageBackgroundOffsetY}
              scale={style.pageBackgroundScale}
            />

            <MediaLayer
              rect={headerRect}
              previewUrl={headerMediaPreviewUrl}
              fit={style.headerMediaFit}
              opacity={style.headerMediaOpacity}
              offsetX={style.headerMediaOffsetX}
              offsetY={style.headerMediaOffsetY}
              scale={style.headerMediaScale}
            />

            <MediaLayer
              rect={footerRect}
              previewUrl={footerMediaPreviewUrl}
              fit={style.footerMediaFit}
              opacity={style.footerMediaOpacity}
              offsetX={style.footerMediaOffsetX}
              offsetY={style.footerMediaOffsetY}
              scale={style.footerMediaScale}
            />

            <div className="relative z-10 flex h-full flex-col" style={{ padding: `${layout.padding}px` }}>
              <SafeAreaGuide height={layout.headerSpace} label="Header media space" show={showSafeAreaGuides} />

              <div
                className="grid min-h-0 flex-1"
                style={{
                  width: `${layout.frameWidth}px`,
                  height: `${layout.frameHeight}px`,
                  gap: `${layout.gap}px`,
                  gridTemplateColumns: `repeat(${layout.columns}, ${layout.cardWidth}px)`,
                  gridTemplateRows: `repeat(${layout.rows}, ${layout.cardHeight}px)`,
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
        </div>
      </div>
    </div>
  );
}
