import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  buildCatalogImportTemplateBuffer,
  parseWorkbookBuffer,
} from "@/lib/catalog/excel";
import {
  formatSlabQuantityLabel,
  normalizeSlabPriceTiers,
} from "@/lib/catalog/slab-pricing";

function buildWorkbook(rows: Array<Array<string | number | null>>) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Products");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

test("normalizes slab tiers and rejects overlapping ranges", () => {
  const tiers = normalizeSlabPriceTiers([
    { minQuantity: 6, maxQuantity: null, price: 80, label: "Case" },
    { minQuantity: 1, maxQuantity: 5, price: 95.555, label: "" },
  ]);

  assert.deepEqual(tiers, [
    { minQuantity: 1, maxQuantity: 5, price: 95.56, label: null },
    { minQuantity: 6, maxQuantity: null, price: 80, label: "Case" },
  ]);
  assert.equal(formatSlabQuantityLabel(tiers[0], "pack"), "1-5 pack");
  assert.equal(formatSlabQuantityLabel(tiers[1], "pack"), "Case");

  assert.throws(
    () => normalizeSlabPriceTiers([
      { minQuantity: 1, maxQuantity: 5, price: 100 },
      { minQuantity: 5, maxQuantity: null, price: 90 },
    ]),
    /cannot overlap/,
  );
});

test("imports numbered slab price columns and infers quantity ranges", () => {
  const workbook = buildWorkbook([
    ["Item number", "Item name", "Normal price", "Slab 1 min qty", "Slab 1 price", "Slab 2 min qty", "Slab 2 price", "Unit"],
    ["185075", "Test product", 120, 1, 110, 6, 95, "pack"],
  ]);

  const parsed = parseWorkbookBuffer(workbook, { pricingMode: "slab" });

  assert.equal(parsed.pricingMode, "slab");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].normalPrice, 120);
  assert.equal(parsed.rows[0].promoPrice, null);
  assert.deepEqual(parsed.rows[0].slabPrices, [
    { minQuantity: 1, maxQuantity: 5, price: 110, label: null },
    { minQuantity: 6, maxQuantity: null, price: 95, label: null },
  ]);
});

test("imports a single Slab price column without promotion columns", () => {
  const workbook = buildWorkbook([
    ["Item number", "Item name", "Slab price", "Minimum quantity"],
    ["SKU-1", "Single slab item", 77.5, 3],
  ]);

  const parsed = parseWorkbookBuffer(workbook, { pricingMode: "slab" });

  assert.deepEqual(parsed.rows[0].slabPrices, [
    { minQuantity: 3, maxQuantity: null, price: 77.5, label: null },
  ]);
  assert.equal(parsed.rows[0].normalPrice, null);
});

test("keeps promotion workbook behavior backward compatible", () => {
  const workbook = buildWorkbook([
    ["Item number", "Item name", "Normal price", "Promo price"],
    ["SKU-2", "Promotion item", 100, 80],
  ]);

  const parsed = parseWorkbookBuffer(workbook);

  assert.equal(parsed.pricingMode, "promotion");
  assert.equal(parsed.rows[0].discountAmount, 20);
  assert.equal(parsed.rows[0].discountPercent, 20);
  assert.deepEqual(parsed.rows[0].slabPrices, []);
});

test("builds separate promotion and slab templates", () => {
  const promotionWorkbook = XLSX.read(buildCatalogImportTemplateBuffer("promotion"), { type: "buffer" });
  const slabWorkbook = XLSX.read(buildCatalogImportTemplateBuffer("slab"), { type: "buffer" });
  const promotionHeaders = XLSX.utils.sheet_to_json<string[]>(promotionWorkbook.Sheets[promotionWorkbook.SheetNames[0]], { header: 1 })[0];
  const slabHeaders = XLSX.utils.sheet_to_json<string[]>(slabWorkbook.Sheets[slabWorkbook.SheetNames[0]], { header: 1 })[0];

  assert.ok(promotionHeaders.includes("Promo price"));
  assert.ok(slabHeaders.includes("Slab 1 min qty"));
  assert.ok(slabHeaders.includes("Slab 3 price"));
});
