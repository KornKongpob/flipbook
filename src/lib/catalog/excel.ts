import * as XLSX from "xlsx";
import { normalizeName, normalizeSku } from "@/lib/utils";

const COLUMN_ALIASES = {
  sku: [
    "sku",
    "product code",
    "product_code",
    "code",
    "item code",
    "รหัสสินค้า",
  ],
  productName: [
    "product name",
    "name",
    "description",
    "product",
    "ชื่อสินค้า",
  ],
  normalPrice: [
    "normal price",
    "regular price",
    "price",
    "original price",
    "ราคาปกติ",
  ],
  promoPrice: [
    "promo price",
    "promotion price",
    "promotional price",
    "sale price",
    "ราคาพิเศษ",
  ],
  packSize: ["pack size", "size", "packing", "pack", "ขนาดบรรจุ"],
  unit: ["unit", "uom", "หน่วย"],
} as const;

type ColumnKey = keyof typeof COLUMN_ALIASES;

export interface ColumnMappingResult {
  mapping: Partial<Record<ColumnKey, string>>;
  warnings: string[];
}

export interface NormalizedCatalogRow {
  rowNo: number;
  sku: string | null;
  productName: string;
  packSize: string | null;
  unit: string | null;
  normalPrice: number | null;
  promoPrice: number | null;
  discountAmount: number | null;
  discountPercent: number | null;
  normalizedSku: string | null;
  normalizedName: string;
  displayOrder: number;
}

export interface ParsedWorkbookResult {
  sheetName: string;
  headers: string[];
  mapping: Partial<Record<ColumnKey, string>>;
  warnings: string[];
  rows: NormalizedCatalogRow[];
  previewRows: Array<Record<string, string | number | null>>;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/[^0-9.-]/g, ""));

  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : null;
}

function detectColumnMapping(headers: string[]): ColumnMappingResult {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const mapping: Partial<Record<ColumnKey, string>> = {};

  (Object.keys(COLUMN_ALIASES) as ColumnKey[]).forEach((key) => {
    const match = normalizedHeaders.find(({ normalized }) =>
      COLUMN_ALIASES[key].some((alias) => alias === normalized),
    );

    if (match) {
      mapping[key] = match.original;
    }
  });

  const warnings: string[] = [];

  if (!mapping.productName) {
    warnings.push("Product name column was not detected automatically.");
  }

  if (!mapping.sku) {
    warnings.push("SKU/Product code column is missing. Matching will rely on product names.");
  }

  if (!mapping.normalPrice && !mapping.promoPrice) {
    warnings.push("No price columns were detected.");
  }

  return { mapping, warnings };
}

function getCellValue(
  row: Record<string, unknown>,
  mapping: Partial<Record<ColumnKey, string>>,
  key: ColumnKey,
) {
  const header = mapping[key];
  return header ? row[header] : null;
}

export function parseWorkbookBuffer(buffer: Buffer): ParsedWorkbookResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The uploaded workbook does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const table = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  if (table.length < 2) {
    throw new Error("The uploaded workbook does not contain enough rows.");
  }

  const headers = (table[0] ?? []).map((value) => String(value ?? "").trim());
  const { mapping, warnings } = detectColumnMapping(headers);

  const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  const rows = objectRows
    .map((row, index) => {
      const productName = String(getCellValue(row, mapping, "productName") ?? "").trim();
      const sku = String(getCellValue(row, mapping, "sku") ?? "").trim();
      const packSize = String(getCellValue(row, mapping, "packSize") ?? "").trim();
      const unit = String(getCellValue(row, mapping, "unit") ?? "").trim();
      const normalPrice = parsePrice(getCellValue(row, mapping, "normalPrice"));
      const promoPrice = parsePrice(getCellValue(row, mapping, "promoPrice"));

      if (!productName && !sku) {
        return null;
      }

      const hasPromo =
        promoPrice !== null &&
        normalPrice !== null &&
        promoPrice > 0 &&
        promoPrice < normalPrice;
      const discountAmount = hasPromo ? Number((normalPrice - promoPrice).toFixed(2)) : null;
      const discountPercent = hasPromo
        ? Number((((normalPrice - promoPrice) / normalPrice) * 100).toFixed(2))
        : null;

      return {
        rowNo: index + 2,
        sku: sku || null,
        productName: productName || sku,
        packSize: packSize || null,
        unit: unit || null,
        normalPrice,
        promoPrice,
        discountAmount,
        discountPercent,
        normalizedSku: sku ? normalizeSku(sku) : null,
        normalizedName: normalizeName(productName || sku),
        displayOrder: index,
      } satisfies NormalizedCatalogRow;
    })
    .filter((row): row is NormalizedCatalogRow => Boolean(row));

  if (!rows.length) {
    throw new Error("No importable product rows were found in the workbook.");
  }

  const previewRows = rows.slice(0, 5).map((row) => ({
    sku: row.sku,
    product_name: row.productName,
    normal_price: row.normalPrice,
    promo_price: row.promoPrice,
    pack_size: row.packSize,
    unit: row.unit,
  }));

  return {
    sheetName: firstSheetName,
    headers,
    mapping,
    warnings,
    rows,
    previewRows,
  };
}
