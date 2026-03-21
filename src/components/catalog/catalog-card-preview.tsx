"use client";

import Image from "next/image";
import { useState } from "react";
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
  const style = {
    ...DEFAULT_STYLE_OPTIONS,
    ...options,
  };
  const promoActive =
    promoPrice !== null &&
    promoPrice !== undefined &&
    normalPrice !== null &&
    normalPrice !== undefined &&
    promoPrice < normalPrice;
  const showDiscountBadge = promoActive && style.showDiscountAmount && discountAmount != null;
  const meta = [style.showSku ? sku : null, style.showPackSize ? packSize : null, unit]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className="flex h-full flex-col overflow-hidden border"
      style={{
        borderRadius: `${style.cardRadius}px`,
        borderColor: style.cardBorderColor,
        backgroundColor: style.cardBackgroundColor,
        padding: `${style.cardPadding}px`,
      }}
    >
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden"
        style={{
          height: `${style.imageAreaHeight}px`,
          borderRadius: `${Math.max(style.cardRadius - 6, 8)}px`,
          backgroundColor: style.imageBackgroundColor,
        }}
      >
        {imageUrl && !imgFailed ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain p-2"
            sizes="200px"
            unoptimized
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-[10px] font-medium" style={{ color: style.metaColor }}>No image</span>
        )}
      </div>

      {showDiscountBadge ? (
        <div
          className="mt-2 shrink-0 truncate rounded-full px-2 py-0.5 text-center font-semibold"
          style={{
            backgroundColor: style.discountBadgeBackgroundColor,
            color: style.discountBadgeTextColor,
            fontSize: `${Math.max(style.skuFontSize, 10)}px`,
          }}
        >
          ถูกลง {formatCurrency(discountAmount)}
        </div>
      ) : null}

      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-between">
        <div>
          <h3
            className="line-clamp-2 font-semibold"
            style={{
              color: style.titleColor,
              fontSize: `${style.titleFontSize}px`,
              lineHeight: 1.15,
            }}
          >
            {title}
          </h3>
          <p
            className="mt-1 truncate"
            style={{
              color: style.metaColor,
              fontSize: `${style.skuFontSize}px`,
              lineHeight: 1.15,
            }}
          >
            {meta || "\u00A0"}
          </p>
        </div>

        <div className="mt-auto shrink-0">
          {promoActive && style.showPromoPrice ? (
            <div
              className="truncate font-bold tracking-tight"
              style={{
                color: style.promoPriceColor,
                fontSize: `${style.promoPriceFontSize}px`,
                lineHeight: 1,
              }}
            >
              {formatCurrency(promoPrice)}
            </div>
          ) : (
            <div
              className="truncate font-bold tracking-tight"
              style={{
                color: style.variant === "clean" ? style.titleColor : style.promoPriceColor,
                fontSize: `${Math.max(style.promoPriceFontSize - 4, style.normalPriceFontSize + 6)}px`,
                lineHeight: 1,
              }}
            >
              {formatCurrency(normalPrice ?? promoPrice)}
            </div>
          )}

          {promoActive && style.showNormalPrice ? (
            <div
              className="flex items-center gap-2"
              style={{
                color: style.normalPriceColor,
                fontSize: `${style.normalPriceFontSize}px`,
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              <span className="line-through">{formatCurrency(normalPrice)}</span>
              {style.showDiscountPercent && discountPercent ? (
                <span>{discountPercent.toFixed(0)}% off</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
