import type { CatalogStyleOptions, EditorCatalogStyleOptions } from "@/lib/catalog/style-options";

const BOOLEAN_STYLE_KEYS: Array<keyof CatalogStyleOptions> = [
  "showNormalPrice",
  "showPromoPrice",
  "showDiscountAmount",
  "showDiscountPercent",
  "showBarcode",
  "showDates",
  "showSku",
  "showPackSize",
  "showPriceDecimals",
];

const NULLABLE_STRING_STYLE_KEYS: Array<keyof CatalogStyleOptions> = [
  "promoStartDate",
  "promoEndDate",
  "pageBackgroundImageBucket",
  "pageBackgroundImagePath",
  "headerMediaBucket",
  "headerMediaPath",
  "footerMediaBucket",
  "footerMediaPath",
];

const STRING_STYLE_KEYS: Array<keyof CatalogStyleOptions> = [
  "variant",
  "flyerType",
  "layoutPreset",
  "pageBackgroundColor",
  "pageBackgroundFit",
  "pageBackgroundAnchor",
  "headerMediaFit",
  "footerMediaFit",
  "cardImageFit",
  "cardBackgroundColor",
  "cardBorderColor",
  "imageBackgroundColor",
  "titleColor",
  "metaColor",
  "promoPriceColor",
  "normalPriceColor",
  "discountBadgeBackgroundColor",
  "discountBadgeTextColor",
];

const NUMBER_STYLE_KEYS: Array<keyof CatalogStyleOptions> = [
  "baseFontSize",
  "pageBackgroundOpacity",
  "pageBackgroundOffsetX",
  "pageBackgroundOffsetY",
  "pageBackgroundScale",
  "headerMediaOpacity",
  "headerMediaOffsetX",
  "headerMediaOffsetY",
  "headerMediaScale",
  "footerMediaOpacity",
  "footerMediaOffsetX",
  "footerMediaOffsetY",
  "footerMediaScale",
  "pagePadding",
  "pageGap",
  "headerSpace",
  "footerSpace",
  "cardPadding",
  "cardRadius",
  "imageAreaHeight",
  "cardImageScale",
  "titleFontSize",
  "skuFontSize",
  "promoPriceFontSize",
  "normalPriceFontSize",
];

export function serializeStyleFormData(formData: FormData) {
  return JSON.stringify(
    Array.from(formData.entries()).map(([key, value]) => [key, typeof value === "string" ? value : value.name]),
  );
}

export function buildCatalogStyleFormData(jobId: string, style: EditorCatalogStyleOptions) {
  const formData = new FormData();
  formData.set("jobId", jobId);

  BOOLEAN_STYLE_KEYS.forEach((key) => {
    if (style[key]) {
      formData.set(key, "on");
    }
  });

  NULLABLE_STRING_STYLE_KEYS.forEach((key) => {
    formData.set(key, String(style[key] ?? ""));
  });

  STRING_STYLE_KEYS.forEach((key) => {
    formData.set(key, String(style[key]));
  });

  NUMBER_STYLE_KEYS.forEach((key) => {
    formData.set(key, String(style[key]));
  });

  formData.set("masterCardLayout", JSON.stringify(style.masterCardLayout));

  return formData;
}
