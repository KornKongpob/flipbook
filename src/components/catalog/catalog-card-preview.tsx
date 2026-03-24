"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATALOG_CARD_META_LINE_HEIGHT,
  CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
  CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
  CATALOG_CARD_TITLE_LINE_HEIGHT,
  resolveCatalogCardLayout,
} from "@/lib/catalog/card-layout";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import { getCatalogMediaRenderRect } from "@/lib/catalog/layout";
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
}

function rectStyle(rect: { x: number; y: number; width: number; height: number }) {
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
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
  const normalPriceLabel = formatCurrency(normalPrice);
  const promoPriceLabel = formatCurrency(promoPrice);
  const showSinglePrice = !showPromoLine && style.showNormalPrice;
  const singlePriceLabel = formatCurrency(normalPrice ?? promoPrice);

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
  const imageRenderRect = useMemo(() => {
    if (!cardLayout) {
      return null;
    }

    return getCatalogMediaRenderRect(cardLayout.imageRect, style.cardImageScale, 0, 0);
  }, [cardLayout, style.cardImageScale]);

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
          <div
            className="absolute overflow-hidden"
            style={{
              ...rectStyle(cardLayout.imageRect),
              borderRadius: `${Math.max(style.cardRadius - 6, 8)}px`,
              backgroundColor: style.imageBackgroundColor,
            }}
          >
            {imageUrl && !imgFailed && imageRenderRect ? (
              <div
                className="absolute"
                style={{
                  left: `${imageRenderRect.x - cardLayout.imageRect.x}px`,
                  top: `${imageRenderRect.y - cardLayout.imageRect.y}px`,
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

          {showDiscountBadge && cardLayout.badgeRect ? (
            <div
              className="absolute flex items-center justify-center overflow-hidden rounded-full text-center font-bold"
              style={{
                ...rectStyle(cardLayout.badgeRect),
                backgroundColor: style.discountBadgeBackgroundColor,
                color: style.discountBadgeTextColor,
                fontSize: `${Math.max(style.skuFontSize, 10)}px`,
                lineHeight: 1,
              }}
            >
              ถูกลง {formatCurrency(discountAmount)}
            </div>
          ) : null}

          {cardLayout.titleRect ? (
            <h3
              className="absolute overflow-hidden font-semibold"
              style={{
                ...rectStyle(cardLayout.titleRect),
                color: style.titleColor,
                fontSize: `${cardLayout.titleFontSize}px`,
                lineHeight: CATALOG_CARD_TITLE_LINE_HEIGHT,
                display: "-webkit-box",
                overflowWrap: "anywhere",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {title}
            </h3>
          ) : null}

          {cardLayout.metaRect ? (
            <p
              className="absolute overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                ...rectStyle(cardLayout.metaRect),
                color: style.metaColor,
                fontSize: `${cardLayout.metaFontSize}px`,
                lineHeight: CATALOG_CARD_META_LINE_HEIGHT,
              }}
            >
              {meta || "\u00A0"}
            </p>
          ) : null}

          {showPromoLine && cardLayout.promoPriceRect ? (
            <div
              className="absolute overflow-hidden font-bold"
              style={{
                ...rectStyle(cardLayout.promoPriceRect),
                color: style.promoPriceColor,
                fontSize: `${cardLayout.promoPriceFontSize}px`,
                lineHeight: CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
              }}
            >
              {promoPriceLabel}
            </div>
          ) : null}

          {showPromoLine && showNormalPrice && cardLayout.normalPriceRowRect ? (
            <div
              className="absolute overflow-hidden whitespace-nowrap"
              style={{
                ...rectStyle(cardLayout.normalPriceRowRect),
                color: style.normalPriceColor,
                fontSize: `${cardLayout.normalPriceFontSize}px`,
                lineHeight: CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
              }}
            >
              <span className="inline-flex items-start gap-2">
                <span className="relative inline-block">
                  <span>{normalPriceLabel}</span>
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0"
                    style={{
                      top: `${Math.max(style.normalPriceFontSize * 0.55, 6)}px`,
                      borderTop: `1px solid ${style.normalPriceColor}`,
                    }}
                  />
                </span>
              {style.showDiscountPercent && discountPercent ? (
                <span style={{ fontSize: `${Math.max(style.normalPriceFontSize - 2, 9)}px` }}>
                  {discountPercent.toFixed(0)}% off
                </span>
              ) : null}
              </span>
            </div>
          ) : null}

          {showSinglePrice && !showPromoLine && cardLayout.singlePriceRect ? (
            <div
              className="absolute overflow-hidden font-bold"
              style={{
                ...rectStyle(cardLayout.singlePriceRect),
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
