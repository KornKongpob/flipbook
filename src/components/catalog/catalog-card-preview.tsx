import Image from "next/image";
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
  const promoActive =
    promoPrice !== null &&
    promoPrice !== undefined &&
    normalPrice !== null &&
    normalPrice !== undefined &&
    promoPrice < normalPrice;
  const meta = [options?.showSku !== false ? sku : null, options?.showPackSize !== false ? packSize : null, unit]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="flex h-full flex-col rounded-[26px] border border-[#f0dfd4] bg-white p-3 shadow-[0_16px_28px_rgba(68,39,21,0.06)]">
      <div className="relative flex h-32 items-center justify-center rounded-[22px] bg-[#fff5ef]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain p-3"
            sizes="240px"
          />
        ) : (
          <span className="text-sm font-medium text-[#b17c63]">No image</span>
        )}
      </div>

      {promoActive && (options?.showDiscountAmount ?? true) ? (
        <div className="mt-3 rounded-full bg-[#ffe27d] px-3 py-1 text-center text-xs font-semibold text-[#982c11]">
          ถูกลง {formatCurrency(discountAmount)}
        </div>
      ) : null}

      <div className="mt-3 flex-1 space-y-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[#241b15]">
          {title}
        </h3>
        <p className="line-clamp-1 text-[11px] text-[#7b6758]">{meta || " "}</p>
      </div>

      <div className="mt-3 space-y-1">
        {promoActive && (options?.showPromoPrice ?? true) ? (
          <div className="text-2xl font-bold tracking-tight text-[#e64324]">
            {formatCurrency(promoPrice)}
          </div>
        ) : (
          <div className="text-2xl font-bold tracking-tight text-[#21354e]">
            {formatCurrency(normalPrice ?? promoPrice)}
          </div>
        )}

        {promoActive && (options?.showNormalPrice ?? true) ? (
          <div className="flex items-center gap-3 text-xs text-[#8f7967]">
            <span className="line-through">{formatCurrency(normalPrice)}</span>
            {(options?.showDiscountPercent ?? false) && discountPercent ? (
              <span>{discountPercent.toFixed(0)}% off</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
