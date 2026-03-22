import PDFDocument from "pdfkit";
import { chunk, formatCurrency } from "@/lib/utils";
import { PDF_FONT_PATHS } from "@/lib/catalog/pdf/fonts";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import {
  getCatalogItemsPerPage,
  resolveCatalogPageLayout,
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
  theme: Record<string, string>,
  options: CatalogStyleOptions,
) {
  const padding = options.cardPadding;
  const imageHeight = options.imageAreaHeight;
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
  const showPromoLine = promoActive && showPromoPrice;

  doc.save();
  doc
    .roundedRect(originX, originY, width, height, options.cardRadius)
    .fillAndStroke(options.cardBackgroundColor, options.cardBorderColor);

  if (item.imageBuffer) {
    doc.image(item.imageBuffer, originX + padding, originY + padding, {
      fit: [width - padding * 2, imageHeight],
      align: "center",
      valign: "center",
    });
  } else {
    drawFallbackImage(
      doc,
      originX + padding,
      originY + padding,
      width - padding * 2,
      imageHeight,
      options.imageBackgroundColor,
      options.metaColor,
      Math.max(options.cardRadius - 6, 8),
    );
  }

  let currentY = originY + padding + imageHeight + 8;

  if (promoActive && item.discountAmount && showDiscountAmount) {
    doc
      .roundedRect(
        originX + padding,
        currentY,
        width - padding * 2,
        22,
        11,
      )
      .fill(options.discountBadgeBackgroundColor);

    doc
      .fillColor(options.discountBadgeTextColor)
      .font("Sarabun-Bold")
      .fontSize(Math.max(options.skuFontSize, 10))
      .text(
        `ถูกลง ${formatCurrency(item.discountAmount)}`,
        originX + padding,
        currentY + 4.5,
        {
          width: width - padding * 2,
          align: "center",
        },
      );

    currentY += 32;
  } else {
    currentY += 8;
  }

  doc.fillColor(options.titleColor).font("Sarabun-SemiBold").fontSize(options.titleFontSize);
  doc.text(item.displayName, originX + padding, currentY, {
    width: width - padding * 2,
    height: Math.max(options.titleFontSize * 2.5, 30),
    ellipsis: true,
    lineGap: 0,
  });

  const textHeight = doc.heightOfString(item.displayName, {
    width: width - padding * 2,
    lineGap: 0,
  });

  currentY += Math.min(textHeight, Math.max(options.titleFontSize * 2.5, 30)) + 6;

  const meta = [showSku ? item.sku : null, showPackSize ? item.packSize : null, item.unit]
    .filter(Boolean)
    .join(" • ");

  doc.fillColor(options.metaColor).font("Sarabun-Regular").fontSize(options.skuFontSize);
  doc.text(meta || " ", originX + padding, currentY, {
    width: width - padding * 2,
    height: Math.max(options.skuFontSize + 4, 14),
    ellipsis: true,
  });

  if (showPromoLine) {
    const normalY = originY + height - Math.max(options.normalPriceFontSize + 10, 22);
    const promoY = normalY - Math.max(options.promoPriceFontSize + 8, 28);

    doc.fillColor(options.promoPriceColor).font("Sarabun-Bold").fontSize(options.promoPriceFontSize);
    doc.text(formatCurrency(item.promoPrice), originX + padding, promoY, {
      width: width - padding * 2,
    });

    if (showNormalPrice) {
      doc.fillColor(options.normalPriceColor).font("Sarabun-Regular").fontSize(options.normalPriceFontSize);
      const normalText = formatCurrency(item.normalPrice);
      doc.text(normalText, originX + padding, normalY, {
        width: width - padding * 2,
      });

      const measured = doc.widthOfString(normalText);
      const strikeY = normalY + Math.max(options.normalPriceFontSize * 0.55, 6);
      doc
        .moveTo(originX + padding, strikeY)
        .lineTo(originX + padding + measured, strikeY)
        .lineWidth(1)
        .strokeColor(options.normalPriceColor)
        .stroke();

      if (showDiscountPercent && item.discountPercent) {
        doc.fillColor(options.normalPriceColor).font("Sarabun-Regular").fontSize(Math.max(options.normalPriceFontSize - 2, 9));
        doc.text(
          `${item.discountPercent.toFixed(0)}% off`,
          originX + padding + measured + 8,
          normalY,
          {
            width: Math.max(width - padding * 2 - measured - 8, 0),
          },
        );
      }
    }
  } else {
    doc.fillColor(
      variant === "clean" ? options.titleColor : options.promoPriceColor,
    );
    doc.font("Sarabun-Bold").fontSize(Math.max(options.promoPriceFontSize - 4, options.normalPriceFontSize + 6));
    doc.text(
      formatCurrency(item.normalPrice ?? item.promoPrice),
      originX + padding,
      originY + height - Math.max(options.promoPriceFontSize, 32),
      {
        width: width - padding * 2,
      },
    );
  }

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
  theme,
  items,
  options,
  pageBackgroundBuffer = null,
}: RenderCatalogPdfInput) {
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

    document.rect(0, 0, pageWidth, pageHeight).fill(style.pageBackgroundColor);

    if (pageBackgroundBuffer) {
      document.save();
      document.opacity(style.pageBackgroundOpacity);

      if (style.pageBackgroundFit === "contain") {
        document.image(pageBackgroundBuffer, 0, 0, {
          fit: [pageWidth, pageHeight],
          align: "center",
          valign: "center",
        });
      } else {
        document.image(pageBackgroundBuffer, 0, 0, {
          width: pageWidth,
          height: pageHeight,
        });
      }

      document.restore();
    }

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
        theme,
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
