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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#f0dfd4] bg-white p-2">
      {/* Image: use flex-[2] so it takes proportional space, not a fixed height */}
      <div className="relative flex flex-[2] min-h-0 items-center justify-center rounded-lg bg-[#fff5ef]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain p-2"
            sizes="200px"
            unoptimized
          />
        ) : (
          <span className="text-[10px] font-medium text-[#b17c63]">No image</span>
        )}
      </div>

      {promoActive && (options?.showDiscountAmount ?? true) ? (
        <div className="mt-1 shrink-0 truncate rounded-full bg-[#ffe27d] px-2 py-0.5 text-center text-[10px] font-semibold text-[#982c11]">
          ถูกลง {formatCurrency(discountAmount)}
        </div>
      ) : null}

      {/* Text block: flex-[1] with min-h-0 to prevent overflow */}
      <div className="mt-1 flex flex-[1] min-h-0 flex-col justify-between">
        <div>
          <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-[#241b15]">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-[9px] text-[#7b6758]">{meta || "\u00A0"}</p>
        </div>

        <div className="mt-auto shrink-0">
          {promoActive && (options?.showPromoPrice ?? true) ? (
            <div className="truncate text-base font-bold leading-tight tracking-tight text-[#e64324]">
              {formatCurrency(promoPrice)}
            </div>
          ) : (
            <div className="truncate text-base font-bold leading-tight tracking-tight text-[#21354e]">
              {formatCurrency(normalPrice ?? promoPrice)}
            </div>
          )}

          {promoActive && (options?.showNormalPrice ?? true) ? (
            <div className="flex items-center gap-2 text-[9px] text-[#8f7967]">
              <span className="line-through">{formatCurrency(normalPrice)}</span>
              {(options?.showDiscountPercent ?? false) && discountPercent ? (
                <span>{discountPercent.toFixed(0)}% off</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
