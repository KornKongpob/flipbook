"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { wrapThaiTextWithAutoScaling } from "@/lib/catalog/pdf/text-layout";
import {
  CATALOG_CARD_META_LINE_HEIGHT,
  CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
  CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
  CATALOG_CARD_TITLE_LINE_HEIGHT,
  resolveCatalogCardLayout,
} from "@/lib/catalog/card-layout";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import { getCatalogMediaRenderRect } from "@/lib/catalog/layout";
import {
  resolveCatalogCardElementRects,
  type CatalogResolvedCardElementRects,
} from "@/lib/catalog/master-card-layout";
import type { CatalogStyleOptions } from "@/lib/catalog/style-options";
import { formatCurrency } from "@/lib/utils";

interface CatalogCardPreviewProps {
  title: string;
  sku?: string | null;
  packSize?: string | null;
  unit?: string | null;
  normalPrice?: number | null;
  promoPrice?: number | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  imageUrl?: string | null;
  options?: Partial<CatalogStyleOptions>;
  onResolvedElementRects?: (rects: CatalogResolvedCardElementRects | null) => void;
}

function rectStyle(rect: { x: number; y: number; width: number; height: number }) {
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

let browserTextMeasureCanvas: HTMLCanvasElement | null = null;

function getBrowserFontFamily() {
  if (typeof window === "undefined") {
    return "Sarabun, sans-serif";
  }

  return window.getComputedStyle(document.body).fontFamily || "Sarabun, sans-serif";
}

function measureBrowserTextWidth(text: string, fontSize: number, fontWeight = 400) {
  if (typeof document === "undefined" || !text) {
    return 0;
  }

  const canvas = browserTextMeasureCanvas ?? (browserTextMeasureCanvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");

  if (!context) {
    return 0;
  }

  context.font = `${fontWeight} ${fontSize}px ${getBrowserFontFamily()}`;
  return context.measureText(text).width;
}

export function CatalogCardPreview({
  title,
  sku,
  packSize,
  unit,
  normalPrice,
  promoPrice,
  discountAmount,
  discountPercent,
  imageUrl,
  options,
  onResolvedElementRects,
}: CatalogCardPreviewProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const style = useMemo(
    () => ({
      ...DEFAULT_STYLE_OPTIONS,
      ...options,
    }),
    [options],
  );
  const promoActive =
    style.flyerType === "promo" &&
    promoPrice !== null &&
    promoPrice !== undefined &&
    normalPrice !== null &&
    normalPrice !== undefined &&
    promoPrice < normalPrice;
  const showDiscountBadge = promoActive && style.showDiscountAmount && discountAmount != null;
  const showPromoLine = promoActive && style.showPromoPrice;
  const showNormalPrice = promoActive && style.showNormalPrice;
  const meta = [style.showSku ? sku : null, style.showPackSize ? packSize : null, unit]
    .filter(Boolean)
    .join(" • ");
  const normalPriceLabel = formatCurrency(normalPrice, { showDecimals: style.showPriceDecimals });
  const promoPriceLabel = formatCurrency(promoPrice, { showDecimals: style.showPriceDecimals });
  const showSinglePrice = !showPromoLine && style.showNormalPrice;
  const singlePriceLabel = formatCurrency(normalPrice ?? promoPrice, { showDecimals: style.showPriceDecimals });

  useEffect(() => {
    const element = cardRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const styles = window.getComputedStyle(element);
      const nextWidth = Number.parseFloat(styles.width);
      const nextHeight = Number.parseFloat(styles.height);

      if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
        return;
      }

      setCardSize((previous) => {
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

  const cardLayout = useMemo(() => {
    if (cardSize.width <= 0 || cardSize.height <= 0) {
      return null;
    }

    return resolveCatalogCardLayout({
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      options: style,
      showDiscountBadge,
      showMeta: Boolean(meta),
      showPromoLine,
      showNormalPrice,
      showSinglePrice,
    });
  }, [cardSize.height, cardSize.width, meta, showDiscountBadge, showNormalPrice, showPromoLine, showSinglePrice, style]);
  const normalPriceTextWidth = useMemo(() => {
    if (!cardLayout?.normalPriceRowRect || !showPromoLine || !showNormalPrice) {
      return 0;
    }

    return measureBrowserTextWidth(normalPriceLabel, cardLayout.normalPriceFontSize);
  }, [cardLayout, normalPriceLabel, showNormalPrice, showPromoLine]);
  const elementRects = useMemo(() => {
    if (!cardLayout) {
      return null;
    }

    return resolveCatalogCardElementRects({
      baseRects: {
        imageRect: cardLayout.imageRect,
        badgeRect: cardLayout.badgeRect,
        titleRect: cardLayout.titleRect,
        metaRect: cardLayout.metaRect,
        promoPriceRect: cardLayout.promoPriceRect,
        normalPriceRect: cardLayout.normalPriceRowRect,
        singlePriceRect: cardLayout.singlePriceRect,
        normalPriceFontSize: cardLayout.normalPriceFontSize,
      },
      masterCardLayout: style.masterCardLayout,
      normalPriceTextWidth,
      showDiscountPercent: Boolean(style.showDiscountPercent && discountPercent),
    });
  }, [cardLayout, discountPercent, normalPriceTextWidth, style.masterCardLayout, style.showDiscountPercent]);
  const imageRect = elementRects?.imageRect ?? null;
  const badgeRect = elementRects?.badgeRect ?? null;
  const titleRectWidth = elementRects?.titleRect?.width ?? 0;
  const titleRectHeight = elementRects?.titleRect?.height ?? 0;
  const titleFontSize = cardLayout?.titleFontSize ?? 0;
  const titleTextLayout = useMemo(() => {
    if (titleRectWidth <= 0 || titleRectHeight <= 0 || titleFontSize <= 0) {
      return null;
    }

    return wrapThaiTextWithAutoScaling({
      text: title,
      initialFontSize: titleFontSize,
      maxWidth: titleRectWidth,
      maxHeight: titleRectHeight,
      lineHeight: CATALOG_CARD_TITLE_LINE_HEIGHT,
      measureText: (textValue, fontSize) => measureBrowserTextWidth(textValue, fontSize, 600),
    });
  }, [title, titleFontSize, titleRectHeight, titleRectWidth]);
  const imageRenderRect = useMemo(() => {
    if (!cardLayout || !imageRect) {
      return null;
    }

    return getCatalogMediaRenderRect(imageRect, style.cardImageScale, 0, 0);
  }, [cardLayout, imageRect, style.cardImageScale]);

  useEffect(() => {
    onResolvedElementRects?.(elementRects);
  }, [elementRects, onResolvedElementRects]);

  return (
    <div
      ref={cardRef}
      className="flex h-full flex-col overflow-hidden"
      style={{
        borderRadius: `${style.cardRadius}px`,
        backgroundColor: style.cardBackgroundColor,
        position: "relative",
        boxShadow: `inset 0 0 0 1px ${style.cardBorderColor}`,
      }}
    >
      {cardLayout ? (
        <>
          {imageRect ? (
            <div
              className="absolute overflow-hidden"
              style={{
                ...rectStyle(imageRect),
                borderRadius: `${Math.max(style.cardRadius - 6, 8)}px`,
                backgroundColor: style.imageBackgroundColor,
              }}
            >
              {imageUrl && !imgFailed && imageRenderRect ? (
                <div
                  className="absolute"
                  style={{
                    left: `${imageRenderRect.x - imageRect.x}px`,
                    top: `${imageRenderRect.y - imageRect.y}px`,
                    width: `${imageRenderRect.width}px`,
                    height: `${imageRenderRect.height}px`,
                  }}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={imageUrl}
                      alt={title}
                      fill
                      className={style.cardImageFit === "cover" ? "object-cover" : "object-contain"}
                      sizes="200px"
                      unoptimized
                      onError={() => setImgFailed(true)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-[10px] font-medium" style={{ color: style.metaColor }}>No image</span>
                </div>
              )}
            </div>
          ) : null}

          {showDiscountBadge && badgeRect ? (
            <div
              className="absolute flex items-center justify-center overflow-hidden rounded-full text-center font-bold"
              style={{
                ...rectStyle(badgeRect),
                backgroundColor: style.discountBadgeBackgroundColor,
                color: style.discountBadgeTextColor,
                fontSize: `${Math.max(style.skuFontSize, 10)}px`,
                lineHeight: 1,
              }}
            >
              ถูกลง {formatCurrency(discountAmount, { showDecimals: style.showPriceDecimals })}
            </div>
          ) : null}

          {elementRects?.titleRect ? (
            <h3
              className="absolute overflow-hidden font-semibold"
              style={{
                ...rectStyle(elementRects.titleRect),
                color: style.titleColor,
                fontSize: `${titleTextLayout?.fontSize ?? cardLayout.titleFontSize}px`,
                lineHeight: titleTextLayout ? `${titleTextLayout.lineHeightPx}px` : CATALOG_CARD_TITLE_LINE_HEIGHT,
                whiteSpace: "pre-line",
                overflowWrap: "anywhere",
              }}
            >
              {titleTextLayout ? titleTextLayout.lines.join("\n") : title}
            </h3>
          ) : null}

          {elementRects?.metaRect ? (
            <p
              className="absolute overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                ...rectStyle(elementRects.metaRect),
                color: style.metaColor,
                fontSize: `${cardLayout.metaFontSize}px`,
                lineHeight: CATALOG_CARD_META_LINE_HEIGHT,
              }}
            >
              {meta || "\u00A0"}
            </p>
          ) : null}

          {showPromoLine && elementRects?.promoPriceRect ? (
            <div
              className="absolute overflow-hidden font-bold"
              style={{
                ...rectStyle(elementRects.promoPriceRect),
                color: style.promoPriceColor,
                fontSize: `${cardLayout.promoPriceFontSize}px`,
                lineHeight: CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
              }}
            >
              {promoPriceLabel}
            </div>
          ) : null}

          {showPromoLine && showNormalPrice && elementRects?.normalPriceRect ? (
            <div
              className="absolute overflow-hidden whitespace-nowrap"
              style={{
                ...rectStyle(elementRects.normalPriceRect),
                color: style.normalPriceColor,
                fontSize: `${cardLayout.normalPriceFontSize}px`,
                lineHeight: CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
              }}
            >
              <span>{normalPriceLabel}</span>
            </div>
          ) : null}

          {showPromoLine && showNormalPrice && elementRects?.strikeLineRect ? (
            <span
              aria-hidden="true"
              className="absolute"
              style={{
                left: `${elementRects.strikeLineRect.x}px`,
                top: `${elementRects.strikeLineRect.y}px`,
                width: `${elementRects.strikeLineRect.width}px`,
                borderTop: `1px solid ${style.normalPriceColor}`,
              }}
            />
          ) : null}

          {showPromoLine && showNormalPrice && elementRects?.discountPercentRect && style.showDiscountPercent && discountPercent ? (
            <div
              className="absolute overflow-hidden whitespace-nowrap"
              style={{
                ...rectStyle(elementRects.discountPercentRect),
                color: style.normalPriceColor,
                fontSize: `${Math.max(cardLayout.normalPriceFontSize - 2, 9)}px`,
                lineHeight: CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
              }}
            >
              {discountPercent.toFixed(0)}% off
            </div>
          ) : null}

          {showSinglePrice && !showPromoLine && elementRects?.singlePriceRect ? (
            <div
              className="absolute overflow-hidden font-bold"
              style={{
                ...rectStyle(elementRects.singlePriceRect),
                color: style.flyerType === "normal" ? style.normalPriceColor : style.promoPriceColor,
                fontSize: `${cardLayout.singlePriceFontSize}px`,
                lineHeight: 1,
                textAlign: style.flyerType === "normal" ? "center" : "left",
              }}
            >
              {singlePriceLabel}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
