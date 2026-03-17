import PDFDocument from "pdfkit";
import { chunk, formatCurrency } from "@/lib/utils";
import { PDF_FONT_PATHS } from "@/lib/catalog/pdf/fonts";
import { PRODUCTS_PER_PAGE } from "@/lib/catalog/constants";

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
  options?: Record<string, unknown>;
}

function drawFallbackImage(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  doc.save();
  doc.roundedRect(x, y, width, height, 18).fill("#fff4ef");
  doc.fillColor("#d4795d").font("Sarabun-SemiBold").fontSize(12);
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
  options: Record<string, unknown>,
) {
  const padding = 14;
  const imageHeight = 108;
  const promoActive =
    item.promoPrice !== null &&
    item.normalPrice !== null &&
    item.promoPrice > 0 &&
    item.promoPrice < item.normalPrice;
  const showDiscountAmount = options.showDiscountAmount !== false;
  const showDiscountPercent = options.showDiscountPercent === true;
  const showNormalPrice = options.showNormalPrice !== false;
  const showPromoPrice = options.showPromoPrice !== false;
  const showSku = options.showSku !== false;
  const showPackSize = options.showPackSize !== false;
  const showPromoLine = promoActive && showPromoPrice;

  doc.save();
  doc.roundedRect(originX, originY, width, height, 18).fillAndStroke("#ffffff", "#eedbcf");

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
    );
  }

  if (promoActive && item.discountAmount && showDiscountAmount) {
    doc
      .roundedRect(
        originX + padding,
        originY + padding + imageHeight + 6,
        width - padding * 2,
        22,
        11,
      )
      .fill(theme.highlight ?? "#ffd55e");
    doc
      .fillColor(theme.accentStrong ?? "#c62813")
      .font("Sarabun-Bold")
      .fontSize(11)
      .text(
        `ถูกลง ${formatCurrency(item.discountAmount)}`,
        originX + padding + 10,
        originY + padding + imageHeight + 11,
        {
          width: width - padding * 2 - 20,
          align: "center",
        },
      );
  }

  const textY = originY + padding + imageHeight + (promoActive ? 38 : 14);
  doc.fillColor(theme.text ?? "#211914").font("Sarabun-SemiBold").fontSize(13);
  doc.text(item.displayName, originX + padding, textY, {
    width: width - padding * 2,
    height: 34,
    ellipsis: true,
    lineGap: 1,
  });

  const meta = [showSku ? item.sku : null, showPackSize ? item.packSize : null, item.unit]
    .filter(Boolean)
    .join(" • ");
  doc.fillColor("#75675a").font("Sarabun-Regular").fontSize(9.5);
  doc.text(meta || " ", originX + padding, textY + 38, {
    width: width - padding * 2,
    height: 16,
    ellipsis: true,
  });

  if (showPromoLine) {
    doc.fillColor(theme.accent ?? "#eb4529").font("Sarabun-Bold").fontSize(24);
    doc.text(formatCurrency(item.promoPrice), originX + padding, originY + height - 54, {
      width: width - padding * 2,
    });

    if (showNormalPrice) {
      doc.fillColor("#98816a").font("Sarabun-Regular").fontSize(10);
      const normalY = originY + height - 26;
      const normalText = formatCurrency(item.normalPrice);
      doc.text(normalText, originX + padding, normalY, {
        width: width - padding * 2,
      });

      const measured = doc.widthOfString(normalText);
      doc
        .moveTo(originX + padding, normalY + 7)
        .lineTo(originX + padding + measured, normalY + 7)
        .lineWidth(1)
        .strokeColor("#98816a")
        .stroke();

      if (showDiscountPercent && item.discountPercent) {
        doc.fillColor("#98816a").font("Sarabun-Regular").fontSize(9);
        doc.text(
          `${item.discountPercent.toFixed(0)}% off`,
          originX + padding + measured + 10,
          normalY,
          {
            width: Math.max(width - padding * 2 - measured - 10, 0),
          },
        );
      }
    }
  } else {
    doc.fillColor(
      variant === "clean" ? theme.accentStrong ?? "#22344d" : theme.accent ?? "#eb4529",
    );
    doc.font("Sarabun-Bold").fontSize(22);
    doc.text(
      formatCurrency(item.normalPrice ?? item.promoPrice),
      originX + padding,
      originY + height - 44,
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
  options = {},
}: RenderCatalogPdfInput) {
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
  const pages = chunk(items, PRODUCTS_PER_PAGE);
  const margin = 18;
  const gap = 12;
  const columns = 3;
  const rows = 3;

  pages.forEach((pageItems) => {
    document.addPage();

    const pageWidth = document.page.width;
    const pageHeight = document.page.height;
    const cardWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
    const cardHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;

    document.rect(0, 0, pageWidth, pageHeight).fill(theme.background ?? "#fff8f2");

    document
      .fillColor(theme.accentStrong ?? "#bb2d12")
      .font("Sarabun-Bold")
      .fontSize(10)
      .text(jobName, margin, 10, {
        width: pageWidth - margin * 2,
        align: "left",
      });

    pageItems.forEach((item, itemIndex) => {
      const column = itemIndex % columns;
      const row = Math.floor(itemIndex / columns);
      const x = margin + column * (cardWidth + gap);
      const y = margin + row * (cardHeight + gap) + 18;

      drawCard(document, item, x, y, cardWidth, cardHeight - 18, variant, theme, options);
    });
  });

  document.end();

  return {
    buffer: await bufferPromise,
    pageCount: pages.length,
  };
}
