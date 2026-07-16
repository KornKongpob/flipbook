import * as XLSX from "xlsx";
import { deriveCatalogPricing } from "@/lib/catalog/pricing";
import {
  normalizeSlabPriceTiers,
  type CatalogPricingMode,
  type SlabPriceTier,
} from "@/lib/catalog/slab-pricing";
import { normalizeName, normalizeSku } from "@/lib/utils";

type ColumnKey =
  | "sku"
  | "productName"
  | "normalPrice"
  | "promoPrice"
  | "packSize"
  | "unit"
  | "slabPrice"
  | "slabMinQuantity"
  | "slabMaxQuantity"
  | "slabLabel";

export const PROMOTION_IMPORT_TEMPLATE_COLUMNS = [
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
  {
    key: "packSize" as const,
    header: "Pack size",
    required: false,
    description: "Optional package size shown with the product metadata.",
  },
  {
    key: "unit" as const,
    header: "Unit",
    required: false,
    description: "Optional selling unit shown with the product metadata.",
  },
] as const;

export const SLAB_IMPORT_TEMPLATE_COLUMNS = [
  { header: "Item number", width: 22 },
  { header: "Item name", width: 34 },
  { header: "Normal price", width: 16 },
  { header: "Slab 1 min qty", width: 18 },
  { header: "Slab 1 price", width: 16 },
  { header: "Slab 2 min qty", width: 18 },
  { header: "Slab 2 price", width: 16 },
  { header: "Slab 3 min qty", width: 18 },
  { header: "Slab 3 price", width: 16 },
  { header: "Pack size", width: 18 },
  { header: "Unit", width: 14 },
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
  productName: ["item name", "product name", "name", "description", "product", "ชื่อสินค้า", "รายการ"],
  normalPrice: ["normal price", "regular price", "price", "unit price", "original price", "ราคาปกติ", "ราคา"],
  promoPrice: ["promo price", "promotion price", "promotional price", "sale price", "ราคาโปรโมชั่น", "ราคาโปร"],
  packSize: ["pack size", "size", "packing", "pack", "ขนาดบรรจุ"],
  unit: ["unit", "uom", "หน่วย"],
  slabPrice: ["slab price", "slab_price", "tier price", "bulk price", "wholesale price", "ราคา slab", "ราคาสแลบ", "ราคาขั้นบันได"],
  slabMinQuantity: ["slab min qty", "slab minimum qty", "minimum quantity", "min qty", "minimum qty", "จำนวนขั้นต่ำ"],
  slabMaxQuantity: ["slab max qty", "slab maximum qty", "maximum quantity", "max qty", "maximum qty", "จำนวนสูงสุด"],
  slabLabel: ["slab label", "quantity label", "tier label", "ป้ายจำนวน"],
};

const PROMOTION_REQUIRED_COLUMN_KEYS: ColumnKey[] = ["sku", "normalPrice", "promoPrice"];

export interface SlabColumnMapping {
  index: number;
  priceHeader: string;
  minQuantityHeader?: string;
  maxQuantityHeader?: string;
  labelHeader?: string;
}

export interface ColumnMappingResult {
  mapping: Partial<Record<ColumnKey, string>>;
  slabMappings: SlabColumnMapping[];
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
  slabPrices: SlabPriceTier[];
}

export interface ParsedWorkbookResult {
  sheetName: string;
  headers: string[];
  mapping: Partial<Record<ColumnKey, string>>;
  slabMappings: SlabColumnMapping[];
  pricingMode: CatalogPricingMode;
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

function detectNumberedSlabColumns(headers: string[]) {
  const numbered = new Map<number, Partial<SlabColumnMapping>>();

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    const match = normalized.match(/(?:slab|tier)\s*(\d+)/);

    if (!match) {
      return;
    }

    const index = Number(match[1]);
    if (!Number.isInteger(index) || index < 1 || index > 20) {
      return;
    }

    const entry = numbered.get(index) ?? { index };
    if (/\b(?:min|minimum)\b/.test(normalized) && /\b(?:qty|quantity)\b/.test(normalized)) {
      entry.minQuantityHeader = header;
    } else if (/\b(?:max|maximum)\b/.test(normalized) && /\b(?:qty|quantity)\b/.test(normalized)) {
      entry.maxQuantityHeader = header;
    } else if (/\b(?:qty|quantity)\b/.test(normalized)) {
      entry.minQuantityHeader = header;
    } else if (/\blabel\b/.test(normalized)) {
      entry.labelHeader = header;
    } else if (/\bprice\b/.test(normalized) || normalized === `slab ${index}` || normalized === `tier ${index}`) {
      entry.priceHeader = header;
    }

    numbered.set(index, entry);
  });

  return [...numbered.values()]
    .filter((entry): entry is SlabColumnMapping => Boolean(entry.priceHeader))
    .sort((left, right) => left.index - right.index);
}

function detectColumnMapping(
  headers: string[],
  pricingMode: CatalogPricingMode,
): ColumnMappingResult {
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

  const slabMappings = detectNumberedSlabColumns(headers);
  if (mapping.slabPrice && !slabMappings.some((entry) => entry.priceHeader === mapping.slabPrice)) {
    slabMappings.unshift({
      index: 1,
      priceHeader: mapping.slabPrice,
      minQuantityHeader: mapping.slabMinQuantity,
      maxQuantityHeader: mapping.slabMaxQuantity,
      labelHeader: mapping.slabLabel,
    });
  }

  if (pricingMode === "slab" && !slabMappings.length && mapping.normalPrice) {
    const normalizedNormalHeader = normalizeHeader(mapping.normalPrice);
    if (["price", "unit price", "ราคา"].includes(normalizedNormalHeader)) {
      slabMappings.push({
        index: 1,
        priceHeader: mapping.normalPrice,
        minQuantityHeader: mapping.slabMinQuantity,
        maxQuantityHeader: mapping.slabMaxQuantity,
        labelHeader: mapping.slabLabel,
      });
    }
  }

  const warnings: string[] = [];

  if (!mapping.productName) {
    warnings.push(
      "Item name column was not found. Item number will be reused as the display name.",
    );
  }

  if (pricingMode === "slab" && !mapping.normalPrice) {
    warnings.push("Normal price column was not found. Slab prices will be shown without a reference price.");
  }

  return { mapping, slabMappings, warnings };
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
  return PROMOTION_IMPORT_TEMPLATE_COLUMNS.find((column) => column.key === key)?.header ?? key;
}

function validateRequiredColumns(
  mapping: Partial<Record<ColumnKey, string>>,
  slabMappings: SlabColumnMapping[],
  pricingMode: CatalogPricingMode,
) {
  const requiredKeys = pricingMode === "slab" ? ["sku" as const] : PROMOTION_REQUIRED_COLUMN_KEYS;
  const missingColumns = requiredKeys.filter((key) => !mapping[key]);

  if (missingColumns.length) {
    throw new Error(
      `Missing required columns: ${missingColumns.map(getRequiredColumnLabel).join(", ")}.`,
    );
  }


  if (pricingMode === "slab" && !slabMappings.length) {
    throw new Error(
      'Missing required slab price columns. Add "Slab price" or numbered columns such as "Slab 1 min qty" and "Slab 1 price".',
    );
  }
}

function parseQuantity(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isInteger(numeric) && numeric >= 1 ? numeric : null;
}

function hasCellValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function parseSlabPrices(
  row: Record<string, unknown>,
  rowNo: number,
  slabMappings: SlabColumnMapping[],
  validationErrors: string[],
) {
  const tiers: SlabPriceTier[] = [];

  slabMappings.forEach((slab, mappingIndex) => {
    const priceValue = row[slab.priceHeader];
    const minValue = slab.minQuantityHeader ? row[slab.minQuantityHeader] : null;
    const maxValue = slab.maxQuantityHeader ? row[slab.maxQuantityHeader] : null;
    const labelValue = slab.labelHeader ? row[slab.labelHeader] : null;
    const hasAnyValue = [priceValue, minValue, maxValue, labelValue].some(hasCellValue);

    if (!hasAnyValue) {
      return;
    }

    const price = parsePrice(priceValue);
    const minQuantity = parseQuantity(minValue) ?? (mappingIndex === 0 && !hasCellValue(minValue) ? 1 : null);
    const maxQuantity = parseQuantity(maxValue);

    if (price === null || price < 0) {
      validationErrors.push(`Row ${rowNo}: "${slab.priceHeader}" must be a valid price.`);
      return;
    }

    if (minQuantity === null) {
      validationErrors.push(`Row ${rowNo}: slab ${slab.index} needs a valid minimum quantity.`);
      return;
    }

    if (hasCellValue(maxValue) && (maxQuantity === null || maxQuantity < minQuantity)) {
      validationErrors.push(`Row ${rowNo}: slab ${slab.index} has an invalid maximum quantity.`);
      return;
    }

    tiers.push({
      minQuantity,
      maxQuantity,
      price,
      label: hasCellValue(labelValue) ? String(labelValue).trim() : null,
    });
  });

  tiers.sort((left, right) => left.minQuantity - right.minQuantity);
  const inferredTiers = tiers.map((tier, index) => ({
    ...tier,
    maxQuantity: tier.maxQuantity ?? (
      tiers[index + 1] && tiers[index + 1].minQuantity > tier.minQuantity
        ? tiers[index + 1].minQuantity - 1
        : null
    ),
  }));

  try {
    return normalizeSlabPriceTiers(inferredTiers);
  } catch (error) {
    validationErrors.push(`Row ${rowNo}: ${error instanceof Error ? error.message : "Invalid slab prices."}`);
    return [];
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

export function buildCatalogImportTemplateBuffer(pricingMode: CatalogPricingMode = "promotion") {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "Catalog Import Template",
    Subject: "Catalog import workbook",
    Author: "Catalog Studio",
    Company: "Catalog Studio",
  };

  const templateColumns = pricingMode === "slab"
    ? SLAB_IMPORT_TEMPLATE_COLUMNS
    : PROMOTION_IMPORT_TEMPLATE_COLUMNS.map((column, index) => ({
        header: column.header,
        width: [22, 34, 16, 16, 18, 14][index] ?? 16,
      }));
  const dataSheet = XLSX.utils.aoa_to_sheet([
    templateColumns.map((column) => column.header),
  ]);

  dataSheet["!cols"] = templateColumns.map((column) => ({ wch: column.width }));

  XLSX.utils.book_append_sheet(workbook, dataSheet, pricingMode === "slab" ? "Slab Price Import" : "Catalog Import");

  const output = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

export function parseWorkbookBuffer(
  buffer: Buffer,
  options: { pricingMode?: CatalogPricingMode } = {},
): ParsedWorkbookResult {
  const pricingMode = options.pricingMode ?? "promotion";
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
  const { mapping, slabMappings, warnings } = detectColumnMapping(headers, pricingMode);
  validateRequiredColumns(mapping, slabMappings, pricingMode);

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
      const normalPriceHeaderIsSlab = slabMappings.some((entry) => entry.priceHeader === mapping.normalPrice);
      const normalPrice = normalPriceHeaderIsSlab
        ? null
        : parsePrice(getCellValue(row, mapping, "normalPrice"));
      const promoPrice = pricingMode === "promotion"
        ? parsePrice(getCellValue(row, mapping, "promoPrice"))
        : null;
      const slabPrices = pricingMode === "slab"
        ? parseSlabPrices(row, rowNo, slabMappings, validationErrors)
        : [];

      if (!sku) {
        validationErrors.push(`Row ${rowNo}: "${getRequiredColumnLabel("sku")}" is required.`);
      }

      if (pricingMode === "promotion" && normalPrice === null) {
        validationErrors.push(
          `Row ${rowNo}: "${getRequiredColumnLabel("normalPrice")}" must be a valid number.`,
        );
      }

      if (pricingMode === "promotion" && promoPrice === null) {
        validationErrors.push(
          `Row ${rowNo}: "${getRequiredColumnLabel("promoPrice")}" must be a valid number.`,
        );
      }

      if (
        !sku
        || (pricingMode === "promotion" && (normalPrice === null || promoPrice === null))
        || (pricingMode === "slab" && slabPrices.length === 0)
      ) {
        return null;
      }

      const pricing = deriveCatalogPricing({
        normalPrice,
        promoPrice,
      });

      const normalizedRow: NormalizedCatalogRow = {
        rowNo,
        sku: sku || null,
        productName: productName || sku,
        packSize: packSize || null,
        unit: unit || null,
        normalPrice: pricing.normalPrice,
        promoPrice: pricing.promoPrice,
        discountAmount: pricing.discountAmount,
        discountPercent: pricing.discountPercent,
        normalizedSku: sku ? normalizeSku(sku) : null,
        normalizedName: normalizeName(productName || sku),
        displayOrder: index,
        slabPrices,
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
    slab_prices: row.slabPrices.map((tier) => `${tier.minQuantity}+: ${tier.price}`).join(" | ") || null,
  }));

  return {
    sheetName: firstSheetName,
    headers,
    mapping,
    slabMappings,
    pricingMode,
    warnings,
    rows,
    previewRows,
  };
}
