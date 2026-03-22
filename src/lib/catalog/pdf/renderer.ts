import PDFDocument from "pdfkit";
import {
  CATALOG_CARD_META_LINE_HEIGHT,
  CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
  CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
  CATALOG_CARD_TITLE_LINE_HEIGHT,
  getCatalogLineGap,
  resolveCatalogCardLayout,
} from "@/lib/catalog/card-layout";
import { chunk, formatCurrency } from "@/lib/utils";
import { PDF_FONT_PATHS } from "@/lib/catalog/pdf/fonts";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import {
  getCatalogBackgroundRect,
  getCatalogFooterRect,
  getCatalogHeaderRect,
  getCatalogItemsPerPage,
  offsetRectByPercent,
  resolveCatalogPageLayout,
  scaleRectFromCenter,
  type CatalogRect,
} from "@/lib/catalog/layout";
import type { CatalogStyleOptions } from "@/lib/catalog/style-options";

export interface RenderableCatalogItem {
  id: string;
  sku: string | null;
  productName: string;
  displayName: string;
  packSize: string | null;
  unit: string | null;
  normalPrice: number | null;
  promoPrice: number | null;
  discountAmount: number | null;
  discountPercent: number | null;
  imageBuffer: Buffer | null;
}

export interface RenderCatalogPdfInput {
  jobName: string;
  variant: string;
  theme: Record<string, string>;
  items: RenderableCatalogItem[];
  options?: CatalogStyleOptions;
  pageBackgroundBuffer?: Buffer | null;
  headerMediaBuffer?: Buffer | null;
  footerMediaBuffer?: Buffer | null;
}

function drawFallbackImage(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string,
  textColor: string,
  radius: number,
) {
  doc.save();
  doc.roundedRect(x, y, width, height, radius).fill(backgroundColor);
  doc.fillColor(textColor).font("Sarabun-SemiBold").fontSize(12);
  doc.text("No image", x, y + height / 2 - 8, {
    width,
    align: "center",
  });
  doc.restore();
}

function drawCard(
  doc: PDFKit.PDFDocument,
  item: RenderableCatalogItem,
  originX: number,
  originY: number,
  width: number,
  height: number,
  variant: string,
  options: CatalogStyleOptions,
) {
  const promoActive =
    item.promoPrice !== null &&
    item.normalPrice !== null &&
    item.promoPrice > 0 &&
    item.promoPrice < item.normalPrice;
  const showDiscountAmount = options.showDiscountAmount;
  const showDiscountPercent = options.showDiscountPercent;
  const showNormalPrice = options.showNormalPrice;
  const showPromoPrice = options.showPromoPrice;
  const showSku = options.showSku;
  const showPackSize = options.showPackSize;
  const showDiscountBadge = promoActive && showDiscountAmount && item.discountAmount != null;
  const showPromoLine = promoActive && showPromoPrice;
  const cardLayout = resolveCatalogCardLayout({
    cardWidth: width,
    cardHeight: height,
    options,
    showDiscountBadge,
    showPromoLine,
    showNormalPrice,
  });
  const imageRect = cardLayout.imageRect;

  doc.save();
  doc
    .roundedRect(originX, originY, width, height, options.cardRadius)
    .fillAndStroke(options.cardBackgroundColor, options.cardBorderColor);

  if (item.imageBuffer) {
    doc.image(item.imageBuffer, originX + imageRect.x, originY + imageRect.y, {
      fit: [imageRect.width, imageRect.height],
      align: "center",
      valign: "center",
    });
  } else {
    drawFallbackImage(
      doc,
      originX + imageRect.x,
      originY + imageRect.y,
      imageRect.width,
      imageRect.height,
      options.imageBackgroundColor,
      options.metaColor,
      Math.max(options.cardRadius - 6, 8),
    );
  }

  if (showDiscountBadge && cardLayout.badgeRect) {
    doc
      .roundedRect(
        originX + cardLayout.badgeRect.x,
        originY + cardLayout.badgeRect.y,
        cardLayout.badgeRect.width,
        cardLayout.badgeRect.height,
        cardLayout.badgeRect.height / 2,
      )
      .fill(options.discountBadgeBackgroundColor);

    doc
      .fillColor(options.discountBadgeTextColor)
      .font("Sarabun-Bold")
      .fontSize(Math.max(options.skuFontSize, 10))
      .text(
        `ถูกลง ${formatCurrency(item.discountAmount)}`,
        originX + cardLayout.badgeRect.x,
        originY + cardLayout.badgeRect.y + Math.max((cardLayout.badgeRect.height - Math.max(options.skuFontSize, 10)) / 2 - 1, 0),
        {
          width: cardLayout.badgeRect.width,
          align: "center",
        },
      );
  }

  const meta = [showSku ? item.sku : null, showPackSize ? item.packSize : null, item.unit]
    .filter(Boolean)
    .join(" • ");

  if (cardLayout.titleRect) {
    doc.fillColor(options.titleColor).font("Sarabun-SemiBold").fontSize(options.titleFontSize);
    doc.text(item.displayName, originX + cardLayout.titleRect.x, originY + cardLayout.titleRect.y, {
      width: cardLayout.titleRect.width,
      height: cardLayout.titleRect.height,
      ellipsis: true,
      lineGap: getCatalogLineGap(options.titleFontSize, CATALOG_CARD_TITLE_LINE_HEIGHT),
    });
  }

  if (cardLayout.metaRect) {
    doc.fillColor(options.metaColor).font("Sarabun-Regular").fontSize(options.skuFontSize);
    doc.text(meta || " ", originX + cardLayout.metaRect.x, originY + cardLayout.metaRect.y, {
      width: cardLayout.metaRect.width,
      height: cardLayout.metaRect.height,
      ellipsis: true,
      lineGap: getCatalogLineGap(options.skuFontSize, CATALOG_CARD_META_LINE_HEIGHT),
    });
  }

  if (showPromoLine && cardLayout.promoPriceRect) {
    doc.fillColor(options.promoPriceColor).font("Sarabun-Bold").fontSize(options.promoPriceFontSize);
    doc.text(
      formatCurrency(item.promoPrice),
      originX + cardLayout.promoPriceRect.x,
      originY + cardLayout.promoPriceRect.y,
      {
        width: cardLayout.promoPriceRect.width,
        height: cardLayout.promoPriceRect.height,
        ellipsis: true,
        lineGap: getCatalogLineGap(options.promoPriceFontSize, CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT),
      },
    );

    if (showNormalPrice && cardLayout.normalPriceRowRect) {
      const normalY = originY + cardLayout.normalPriceRowRect.y;
      const normalX = originX + cardLayout.normalPriceRowRect.x;

      doc.fillColor(options.normalPriceColor).font("Sarabun-Regular").fontSize(options.normalPriceFontSize);
      const normalText = formatCurrency(item.normalPrice);
      doc.text(normalText, normalX, normalY, {
        width: cardLayout.normalPriceRowRect.width,
        height: cardLayout.normalPriceRowRect.height,
        ellipsis: true,
        lineGap: getCatalogLineGap(options.normalPriceFontSize, CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT),
      });

      const measured = doc.widthOfString(normalText);
      const strikeY = normalY + Math.max(options.normalPriceFontSize * 0.55, 6);
      doc
        .moveTo(normalX, strikeY)
        .lineTo(normalX + measured, strikeY)
        .lineWidth(1)
        .strokeColor(options.normalPriceColor)
        .stroke();

      if (showDiscountPercent && item.discountPercent) {
        doc.fillColor(options.normalPriceColor).font("Sarabun-Regular").fontSize(Math.max(options.normalPriceFontSize - 2, 9));
        doc.text(
          `${item.discountPercent.toFixed(0)}% off`,
          normalX + measured + 8,
          normalY,
          {
            width: Math.max(cardLayout.normalPriceRowRect.width - measured - 8, 0),
            height: cardLayout.normalPriceRowRect.height,
            ellipsis: true,
          },
        );
      }
    }
  } else if (cardLayout.singlePriceRect) {
    doc.fillColor(
      variant === "clean" ? options.titleColor : options.promoPriceColor,
    );
    doc.font("Sarabun-Bold").fontSize(cardLayout.singlePriceFontSize);
    doc.text(
      formatCurrency(item.normalPrice ?? item.promoPrice),
      originX + cardLayout.singlePriceRect.x,
      originY + cardLayout.singlePriceRect.y,
      {
        width: cardLayout.singlePriceRect.width,
        height: cardLayout.singlePriceRect.height,
        ellipsis: true,
        lineGap: getCatalogLineGap(cardLayout.singlePriceFontSize, CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT),
      },
    );
  }

  doc.restore();
}

function drawMediaLayer(
  doc: PDFKit.PDFDocument,
  buffer: Buffer | null,
  rect: CatalogRect,
  fit: "cover" | "contain",
  opacity: number,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  if (!buffer || rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const scaledRect = scaleRectFromCenter(rect, scale);
  const renderRect = offsetRectByPercent(scaledRect, offsetX, offsetY);
  const imageOptions = fit === "contain"
    ? {
        fit: [renderRect.width, renderRect.height] as [number, number],
        align: "center" as const,
        valign: "center" as const,
      }
    : {
        cover: [renderRect.width, renderRect.height] as [number, number],
        align: "center" as const,
        valign: "center" as const,
      };

  doc.save();
  doc.rect(rect.x, rect.y, rect.width, rect.height).clip();
  doc.opacity(opacity);
  doc.image(buffer, renderRect.x, renderRect.y, imageOptions as never);
  doc.restore();
}

function createDocumentBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunkValue) => chunks.push(Buffer.from(chunkValue)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function renderCatalogPdf({
  jobName,
  variant,
  theme: _theme,
  items,
  options,
  pageBackgroundBuffer = null,
  headerMediaBuffer = null,
  footerMediaBuffer = null,
}: RenderCatalogPdfInput) {
  void _theme;
  const style: CatalogStyleOptions = {
    ...DEFAULT_STYLE_OPTIONS,
    ...options,
    variant: options?.variant ?? (variant === "clean" ? "clean" : "promo"),
  };
  const document = new PDFDocument({
    size: "A4",
    margin: 0,
    autoFirstPage: false,
    font: PDF_FONT_PATHS.regular,
    info: {
      Title: jobName,
      Author: "Promo Catalog Studio",
    },
  });

  document.registerFont("Sarabun-Regular", PDF_FONT_PATHS.regular);
  document.registerFont("Sarabun-SemiBold", PDF_FONT_PATHS.semibold);
  document.registerFont("Sarabun-Bold", PDF_FONT_PATHS.bold);
  document.font("Sarabun-Regular");

  const bufferPromise = createDocumentBuffer(document);
  const pages = chunk(items, getCatalogItemsPerPage(style.layoutPreset));

  pages.forEach((pageItems) => {
    document.addPage();

    const pageWidth = document.page.width;
    const pageHeight = document.page.height;
    const pageLayout = resolveCatalogPageLayout(pageWidth, pageHeight, {
      layoutPreset: style.layoutPreset,
      pagePadding: style.pagePadding,
      pageGap: style.pageGap,
      headerSpace: style.headerSpace,
      footerSpace: style.footerSpace,
    });
    const backgroundRect = getCatalogBackgroundRect(pageLayout, style.pageBackgroundAnchor);
    const headerRect = getCatalogHeaderRect(pageLayout);
    const footerRect = getCatalogFooterRect(pageLayout);

    document.rect(0, 0, pageWidth, pageHeight).fill(style.pageBackgroundColor);

    drawMediaLayer(
      document,
      pageBackgroundBuffer,
      backgroundRect,
      style.pageBackgroundFit,
      style.pageBackgroundOpacity,
      style.pageBackgroundScale,
      style.pageBackgroundOffsetX,
      style.pageBackgroundOffsetY,
    );
    drawMediaLayer(
      document,
      headerMediaBuffer,
      headerRect,
      style.headerMediaFit,
      style.headerMediaOpacity,
      style.headerMediaScale,
      style.headerMediaOffsetX,
      style.headerMediaOffsetY,
    );
    drawMediaLayer(
      document,
      footerMediaBuffer,
      footerRect,
      style.footerMediaFit,
      style.footerMediaOpacity,
      style.footerMediaScale,
      style.footerMediaOffsetX,
      style.footerMediaOffsetY,
    );

    pageItems.forEach((item, itemIndex) => {
      const column = itemIndex % pageLayout.columns;
      const row = Math.floor(itemIndex / pageLayout.columns);
      const x = pageLayout.frameX + column * (pageLayout.cardWidth + pageLayout.gap);
      const y = pageLayout.frameY + row * (pageLayout.cardHeight + pageLayout.gap);

      drawCard(
        document,
        item,
        x,
        y,
        pageLayout.cardWidth,
        pageLayout.cardHeight,
        variant,
        style,
      );
    });
  });

  document.end();

  return {
    buffer: await bufferPromise,
    pageCount: pages.length,
  };
}
