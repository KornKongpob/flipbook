import PDFDocument from "pdfkit";
import {
  CATALOG_CARD_META_LINE_HEIGHT,
  CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
  CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
  CATALOG_CARD_TITLE_LINE_HEIGHT,
  resolveCatalogCardLayout,
} from "@/lib/catalog/card-layout";
import { chunk, formatCurrency, formatThaiFlyerDateRange } from "@/lib/utils";
import { PDF_FONT_PATHS } from "@/lib/catalog/pdf/fonts";
import { wrapThaiTextWithAutoScaling } from "@/lib/catalog/pdf/text-layout";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import {
  CATALOG_A4_PAGE_SIZE,
  getCatalogBackgroundRect,
  getCatalogFooterRect,
  getCatalogHeaderRect,
  getCatalogItemsPerPage,
  getCatalogMediaRenderRect,
  resolveCatalogPageLayout,
  type CatalogRect,
} from "@/lib/catalog/layout";
import { resolveCatalogCardElementRects } from "@/lib/catalog/master-card-layout";
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

interface PdfTextBlockArgs {
  rect: CatalogRect;
  text: string;
  fontName: string;
  fontSize: number;
  color: string;
  lineHeight: number;
  align?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  ellipsis?: boolean;
}

function getPdfVerticalOffset(
  containerHeight: number,
  textHeight: number,
  verticalAlign: NonNullable<PdfTextBlockArgs["verticalAlign"]>,
) {
  const remainingHeight = Math.max(containerHeight - textHeight, 0);

  if (verticalAlign === "middle") {
    return remainingHeight / 2;
  }

  if (verticalAlign === "bottom") {
    return remainingHeight;
  }

  return 0;
}

function drawPdfTextBlock(
  doc: PDFKit.PDFDocument,
  originX: number,
  originY: number,
  args: PdfTextBlockArgs,
) {
  if (args.rect.width <= 0 || args.rect.height <= 0) {
    return {
      lineGap: 0,
      textHeight: 0,
    };
  }

  doc.save();
  doc.fillColor(args.color).font(args.fontName).fontSize(args.fontSize);

  const targetLineBoxHeight = args.fontSize * args.lineHeight;
  const pdfLineBoxHeight = doc.currentLineHeight(true);
  const lineGap = targetLineBoxHeight - pdfLineBoxHeight;
  const textOptions = {
    width: args.rect.width,
    height: args.rect.height,
    ellipsis: args.ellipsis ?? true,
    lineGap,
    align: args.align,
  };
  const textHeight = Math.min(doc.heightOfString(args.text, textOptions), args.rect.height);
  const yOffset = getPdfVerticalOffset(args.rect.height, textHeight, args.verticalAlign ?? "top");

  doc.text(
    args.text,
    originX + args.rect.x,
    originY + args.rect.y + yOffset,
    textOptions,
  );
  doc.restore();

  return {
    lineGap,
    textHeight,
  };
}

function measurePdfTextWidth(
  doc: PDFKit.PDFDocument,
  fontName: string,
  fontSize: number,
  text: string,
) {
  doc.save();
  doc.font(fontName).fontSize(fontSize);
  const width = doc.widthOfString(text);
  doc.restore();
  return width;
}

function drawPdfThaiTitleBlock(
  doc: PDFKit.PDFDocument,
  originX: number,
  originY: number,
  args: PdfTextBlockArgs,
) {
  if (args.rect.width <= 0 || args.rect.height <= 0) {
    return;
  }

  const layout = wrapThaiTextWithAutoScaling({
    text: args.text,
    initialFontSize: args.fontSize,
    maxWidth: args.rect.width,
    maxHeight: args.rect.height,
    lineHeight: args.lineHeight,
    measureText: (textValue, fontSize) => measurePdfTextWidth(doc, args.fontName, fontSize, textValue),
  });

  doc.save();
  doc.fillColor(args.color).font(args.fontName).fontSize(layout.fontSize);

  // แบบนี้ใช้ width ของฟอนต์จริงใน PDFKit เพื่อ wrap ภาษาไทยก่อน แล้วค่อยชดเชย lineGap ให้ตำแหน่งตรงกับ preview มากที่สุด
  const pdfLineBoxHeight = doc.currentLineHeight(true);
  const lineGap = layout.lineHeightPx - pdfLineBoxHeight;
  const textHeight = layout.totalHeight;
  const yOffset = getPdfVerticalOffset(args.rect.height, textHeight, args.verticalAlign ?? "top");

  doc.text(
    layout.lines.join("\n"),
    originX + args.rect.x,
    originY + args.rect.y + yOffset,
    {
      width: args.rect.width,
      lineGap,
      align: args.align,
      ellipsis: false,
    },
  );
  doc.restore();
}

function drawPromoDateLabel(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pagePadding: number,
  style: CatalogStyleOptions,
) {
  if (!style.showDates) {
    return;
  }

  const dateLabel = formatThaiFlyerDateRange(style.promoStartDate, style.promoEndDate);

  if (!dateLabel) {
    return;
  }

  const fontName = "Sarabun-SemiBold";
  const fontSize = Math.max(style.baseFontSize - 2, 10);
  const textWidth = measurePdfTextWidth(doc, fontName, fontSize, dateLabel);
  const horizontalPadding = 12;
  const verticalPadding = 7;
  const pillWidth = Math.min(textWidth + horizontalPadding * 2, pageWidth * 0.42);
  const pillHeight = fontSize * 1.35 + verticalPadding * 2;
  const x = pageWidth - pagePadding - pillWidth;
  const y = Math.max(pagePadding * 0.55, 10);

  doc.save();
  doc.fillOpacity(0.88);
  doc.roundedRect(x, y, pillWidth, pillHeight, pillHeight / 2).fillAndStroke("#ffffff", "#dbe4f0");
  doc.restore();

  drawPdfTextBlock(doc, 0, 0, {
    rect: {
      x: x + horizontalPadding,
      y,
      width: pillWidth - horizontalPadding * 2,
      height: pillHeight,
    },
    text: dateLabel,
    fontName,
    fontSize,
    color: "#334155",
    lineHeight: 1.05,
    align: "center",
    verticalAlign: "middle",
    ellipsis: false,
  });
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
    options.flyerType === "promo" &&
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
  const showSinglePrice = !showPromoLine && options.showNormalPrice;
  const meta = [showSku ? item.sku : null, showPackSize ? item.packSize : null, item.unit]
    .filter(Boolean)
    .join(" • ");
  const normalPriceLabel = formatCurrency(item.normalPrice, { showDecimals: options.showPriceDecimals });
  const promoPriceLabel = formatCurrency(item.promoPrice, { showDecimals: options.showPriceDecimals });
  const singlePriceLabel = formatCurrency(item.normalPrice ?? item.promoPrice, { showDecimals: options.showPriceDecimals });
  const discountAmountLabel = formatCurrency(item.discountAmount, { showDecimals: options.showPriceDecimals });
  const cardLayout = resolveCatalogCardLayout({
    cardWidth: width,
    cardHeight: height,
    options,
    showDiscountBadge,
    showMeta: Boolean(meta),
    showPromoLine,
    showNormalPrice,
    showSinglePrice,
  });
  const normalPriceFontName = "Sarabun-Regular";
  const normalPriceTextWidth = showPromoLine && showNormalPrice && cardLayout.normalPriceRowRect
    ? measurePdfTextWidth(doc, normalPriceFontName, cardLayout.normalPriceFontSize, normalPriceLabel)
    : 0;
  const elementRects = resolveCatalogCardElementRects({
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
    masterCardLayout: options.masterCardLayout,
    normalPriceTextWidth,
    showDiscountPercent: Boolean(showDiscountPercent && item.discountPercent),
  });
  const imageRect = elementRects.imageRect;
  const imageRenderRect = imageRect
    ? getCatalogMediaRenderRect(imageRect, options.cardImageScale, 0, 0)
    : null;
  const imageRadius = Math.max(options.cardRadius - 6, 8);
  const imageOptions = imageRenderRect
    ? options.cardImageFit === "contain"
      ? {
          fit: [imageRenderRect.width, imageRenderRect.height] as [number, number],
          align: "center" as const,
          valign: "center" as const,
        }
      : {
          cover: [imageRenderRect.width, imageRenderRect.height] as [number, number],
          align: "center" as const,
          valign: "center" as const,
        }
    : null;

  doc.save();
  doc
    .roundedRect(originX, originY, width, height, options.cardRadius)
    .fillAndStroke(options.cardBackgroundColor, options.cardBorderColor);

  if (imageRect) {
    doc
      .roundedRect(
        originX + imageRect.x,
        originY + imageRect.y,
        imageRect.width,
        imageRect.height,
        imageRadius,
      )
      .fill(options.imageBackgroundColor);

    if (item.imageBuffer && imageRenderRect && imageOptions) {
      doc.save();
      doc
        .roundedRect(
          originX + imageRect.x,
          originY + imageRect.y,
          imageRect.width,
          imageRect.height,
          imageRadius,
        )
        .clip();
      doc.image(item.imageBuffer, originX + imageRenderRect.x, originY + imageRenderRect.y, imageOptions as never);
      doc.restore();
    } else {
      drawFallbackImage(
        doc,
        originX + imageRect.x,
        originY + imageRect.y,
        imageRect.width,
        imageRect.height,
        options.imageBackgroundColor,
        options.metaColor,
        imageRadius,
      );
    }
  }

  if (showDiscountBadge && elementRects.badgeRect) {
    doc
      .roundedRect(
        originX + elementRects.badgeRect.x,
        originY + elementRects.badgeRect.y,
        elementRects.badgeRect.width,
        elementRects.badgeRect.height,
        elementRects.badgeRect.height / 2,
      )
      .fill(options.discountBadgeBackgroundColor);

    doc
      .fillColor(options.discountBadgeTextColor)
      .font("Sarabun-Bold")
      .fontSize(Math.max(cardLayout.metaFontSize, 10))
      .text(
        `ถูกลง ${discountAmountLabel}`,
        originX + elementRects.badgeRect.x,
        originY + elementRects.badgeRect.y + Math.max((elementRects.badgeRect.height - Math.max(cardLayout.metaFontSize, 10)) / 2 - 1, 0),
        {
          width: elementRects.badgeRect.width,
          align: "center",
        },
      );
  }

  if (elementRects.titleRect) {
    drawPdfThaiTitleBlock(doc, originX, originY, {
      rect: elementRects.titleRect,
      text: item.displayName,
      fontName: "Sarabun-SemiBold",
      fontSize: cardLayout.titleFontSize,
      color: options.titleColor,
      lineHeight: CATALOG_CARD_TITLE_LINE_HEIGHT,
      ellipsis: false,
    });
  }

  if (elementRects.metaRect) {
    drawPdfTextBlock(doc, originX, originY, {
      rect: elementRects.metaRect,
      text: meta || " ",
      fontName: "Sarabun-Regular",
      fontSize: cardLayout.metaFontSize,
      color: options.metaColor,
      lineHeight: CATALOG_CARD_META_LINE_HEIGHT,
    });
  }

  if (showPromoLine && elementRects.promoPriceRect) {
    drawPdfTextBlock(doc, originX, originY, {
      rect: elementRects.promoPriceRect,
      text: promoPriceLabel,
      fontName: "Sarabun-Bold",
      fontSize: cardLayout.promoPriceFontSize,
      color: options.promoPriceColor,
      lineHeight: CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
    });

    if (showNormalPrice && elementRects.normalPriceRect) {
      const normalPriceFontSize = cardLayout.normalPriceFontSize;

      drawPdfTextBlock(doc, originX, originY, {
        rect: elementRects.normalPriceRect,
        text: normalPriceLabel,
        fontName: normalPriceFontName,
        fontSize: normalPriceFontSize,
        color: options.normalPriceColor,
        lineHeight: CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
      });

      if (elementRects.strikeLineRect) {
        doc
          .moveTo(originX + elementRects.strikeLineRect.x, originY + elementRects.strikeLineRect.y)
          .lineTo(originX + elementRects.strikeLineRect.x + elementRects.strikeLineRect.width, originY + elementRects.strikeLineRect.y)
          .lineWidth(1)
          .strokeColor(options.normalPriceColor)
          .stroke();
      }

      if (showDiscountPercent && item.discountPercent && elementRects.discountPercentRect) {
        drawPdfTextBlock(doc, originX, originY, {
          rect: elementRects.discountPercentRect,
          text: `${item.discountPercent.toFixed(0)}% off`,
          fontName: normalPriceFontName,
          fontSize: Math.max(cardLayout.normalPriceFontSize - 2, 9),
          color: options.normalPriceColor,
          lineHeight: CATALOG_CARD_NORMAL_PRICE_LINE_HEIGHT,
        });
      }
    }
  } else if (showSinglePrice && elementRects.singlePriceRect) {
    drawPdfTextBlock(doc, originX, originY, {
      rect: elementRects.singlePriceRect,
      text: singlePriceLabel,
      fontName: "Sarabun-Bold",
      fontSize: cardLayout.singlePriceFontSize,
      color: options.flyerType === "normal" ? options.normalPriceColor : options.promoPriceColor,
      lineHeight: CATALOG_CARD_PROMO_PRICE_LINE_HEIGHT,
      align: options.flyerType === "normal" ? "center" : "left",
    });
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

  const renderRect = getCatalogMediaRenderRect(rect, scale, offsetX, offsetY);
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
  const resolvedVariant = options?.variant ?? (options?.flyerType === "normal" ? "clean" : variant === "clean" ? "clean" : "promo");
  const style: CatalogStyleOptions = {
    ...DEFAULT_STYLE_OPTIONS,
    ...options,
    flyerType: options?.flyerType ?? (resolvedVariant === "clean" ? "normal" : DEFAULT_STYLE_OPTIONS.flyerType),
    variant: resolvedVariant,
  };
  const document = new PDFDocument({
    size: CATALOG_A4_PAGE_SIZE,
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

    drawPromoDateLabel(document, pageWidth, pageLayout.padding, style);

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
