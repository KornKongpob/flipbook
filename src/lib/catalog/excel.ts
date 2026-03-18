import * as XLSX from "xlsx";
import { normalizeName, normalizeSku } from "@/lib/utils";

type ColumnKey =
  | "sku"
  | "productName"
  | "normalPrice"
  | "promoPrice"
  | "packSize"
  | "unit";

export const CATALOG_IMPORT_TEMPLATE_COLUMNS = [
  {
    key: "sku" as const,
    header: "Item number",
    required: true,
    description:
      "Primary Makro Pro lookup key used to find the matching product page and image.",
  },
  {
    key: "productName" as const,
    header: "Item name",
    required: false,
    description:
      "Optional fallback name used when item number matching is not confident enough.",
  },
  {
    key: "normalPrice" as const,
    header: "Normal price",
    required: true,
    description: "Shown as the regular price on the catalog artwork.",
  },
  {
    key: "promoPrice" as const,
    header: "Promo price",
    required: true,
    description: "Shown as the promotional price on the catalog artwork.",
  },
] as const;

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  sku: [
    "item number",
    "item no",
    "item no.",
    "item code",
    "sku",
    "product code",
    "product_code",
    "code",
  ],
  productName: ["item name", "product name", "name", "description", "product"],
  normalPrice: ["normal price", "regular price", "price", "original price"],
  promoPrice: ["promo price", "promotion price", "promotional price", "sale price"],
  packSize: ["pack size", "size", "packing", "pack"],
  unit: ["unit", "uom"],
};

const REQUIRED_COLUMN_KEYS: ColumnKey[] = ["sku", "normalPrice", "promoPrice"];

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
    warnings.push(
      "Item name column was not found. Item number will be reused as the display name.",
    );
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

function getRequiredColumnLabel(key: ColumnKey) {
  return CATALOG_IMPORT_TEMPLATE_COLUMNS.find((column) => column.key === key)?.header ?? key;
}

function validateRequiredColumns(mapping: Partial<Record<ColumnKey, string>>) {
  const missingColumns = REQUIRED_COLUMN_KEYS.filter((key) => !mapping[key]);

  if (missingColumns.length) {
    throw new Error(
      `Missing required columns: ${missingColumns.map(getRequiredColumnLabel).join(", ")}.`,
    );
  }
}

function hasImportData(
  row: Record<string, unknown>,
  mapping: Partial<Record<ColumnKey, string>>,
) {
  return (Object.keys(mapping) as ColumnKey[]).some((key) => {
    const value = getCellValue(row, mapping, key);

    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim() !== "";
  });
}

function formatRowValidationErrors(errors: string[]) {
  const preview = errors.slice(0, 5);
  const suffix =
    errors.length > preview.length
      ? ` ${errors.length - preview.length} more row issue(s) were found.`
      : "";

  return `${preview.join(" ")}${suffix}`;
}

function isNormalizedCatalogRow(
  row: NormalizedCatalogRow | null,
): row is NormalizedCatalogRow {
  return Boolean(row);
}

export function buildCatalogImportTemplateBuffer() {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "Catalog Import Template",
    Subject: "Catalog import workbook",
    Author: "Promo Catalog Studio",
    Company: "Promo Catalog Studio",
  };

  const dataSheet = XLSX.utils.aoa_to_sheet([
    CATALOG_IMPORT_TEMPLATE_COLUMNS.map((column) => column.header),
  ]);

  dataSheet["!cols"] = [
    { wch: 22 },
    { wch: 34 },
    { wch: 16 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Catalog Import");

  const output = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return Buffer.isBuffer(output) ? output : Buffer.from(output);
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
    throw new Error("The uploaded workbook only contains headers. Add at least one product row.");
  }

  const headers = (table[0] ?? []).map((value) => String(value ?? "").trim());
  const { mapping, warnings } = detectColumnMapping(headers);
  validateRequiredColumns(mapping);

  const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  const validationErrors: string[] = [];
  const rows = objectRows
    .map((row, index) => {
      if (!hasImportData(row, mapping)) {
        return null;
      }

      const rowNo = index + 2;
      const productName = String(getCellValue(row, mapping, "productName") ?? "").trim();
      const sku = String(getCellValue(row, mapping, "sku") ?? "").trim();
      const packSize = String(getCellValue(row, mapping, "packSize") ?? "").trim();
      const unit = String(getCellValue(row, mapping, "unit") ?? "").trim();
      const normalPrice = parsePrice(getCellValue(row, mapping, "normalPrice"));
      const promoPrice = parsePrice(getCellValue(row, mapping, "promoPrice"));

      if (!sku) {
        validationErrors.push(`Row ${rowNo}: "${getRequiredColumnLabel("sku")}" is required.`);
      }

      if (normalPrice === null) {
        validationErrors.push(
          `Row ${rowNo}: "${getRequiredColumnLabel("normalPrice")}" must be a valid number.`,
        );
      }

      if (promoPrice === null) {
        validationErrors.push(
          `Row ${rowNo}: "${getRequiredColumnLabel("promoPrice")}" must be a valid number.`,
        );
      }

      if (!sku || normalPrice === null || promoPrice === null) {
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

      const normalizedRow: NormalizedCatalogRow = {
        rowNo,
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
      };

      return normalizedRow;
    })
    .filter(isNormalizedCatalogRow);

  if (validationErrors.length) {
    throw new Error(formatRowValidationErrors(validationErrors));
  }

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
