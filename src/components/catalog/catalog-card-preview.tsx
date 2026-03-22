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

  useEffect(() => {
    const element = cardRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const nextWidth = element.clientWidth;
      const nextHeight = element.clientHeight;

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
      showPromoLine,
      showNormalPrice,
    });
  }, [cardSize.height, cardSize.width, showDiscountBadge, showNormalPrice, showPromoLine, style]);

  return (
    <div
      ref={cardRef}
      className="flex h-full flex-col overflow-hidden border"
      style={{
        borderRadius: `${style.cardRadius}px`,
        borderColor: style.cardBorderColor,
        backgroundColor: style.cardBackgroundColor,
        position: "relative",
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
            {imageUrl && !imgFailed ? (
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-contain"
                sizes="200px"
                unoptimized
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-[10px] font-medium" style={{ color: style.metaColor }}>No image</span>
              </div>
            )}
          </div>

          {showDiscountBadge && cardLayout.badgeRect ? (
            <div
              className="absolute flex items-center justify-center overflow-hidden rounded-full px-2 text-center font-semibold"
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
                fontSize: `${style.titleFontSize}px`,
                lineHeight: CATALOG_CARD_TITLE_LINE_HEIGHT,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflowWrap: "anywhere",
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
                fontSize: `${style.skuFontSize}px`,
                lineHeight: CATALOG_CARD_META_LINE_HEIGHT,
              }}
            >
              {meta || "\u00A0"}
            </p>
          ) : null}

          {showPromoLine && cardLayout.promoPriceRect ? (
            <div
              className="absolute overflow-hidden font-bold tracking-tight"
              style={{
                ...rectStyle(cardLayout.promoPriceRect),
                color: style.promoPriceColor,
                fontSize: `${style.promoPriceFontSize}px`,
                lineHeight: CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
              }}
            >
              {formatCurrency(promoPrice)}
            </div>
          ) : null}

          {showPromoLine && showNormalPrice && cardLayout.normalPriceRowRect ? (
            <div
              className="absolute flex items-center gap-2 overflow-hidden whitespace-nowrap"
              style={{
                ...rectStyle(cardLayout.normalPriceRowRect),
                color: style.normalPriceColor,
                fontSize: `${style.normalPriceFontSize}px`,
                lineHeight: CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
              }}
            >
              <span className="line-through">{formatCurrency(normalPrice)}</span>
              {style.showDiscountPercent && discountPercent ? (
                <span>{discountPercent.toFixed(0)}% off</span>
              ) : null}
            </div>
          ) : null}

          {!showPromoLine && cardLayout.singlePriceRect ? (
            <div
              className="absolute overflow-hidden font-bold tracking-tight"
              style={{
                ...rectStyle(cardLayout.singlePriceRect),
                color: style.variant === "clean" ? style.titleColor : style.promoPriceColor,
                fontSize: `${cardLayout.singlePriceFontSize}px`,
                lineHeight: 1,
              }}
            >
              {formatCurrency(normalPrice ?? promoPrice)}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
