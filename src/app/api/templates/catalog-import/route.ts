import { NextResponse } from "next/server";
import { buildCatalogImportTemplateBuffer } from "@/lib/catalog/excel";
import { isCatalogPricingMode } from "@/lib/catalog/slab-pricing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestedMode = new URL(request.url).searchParams.get("pricingMode");
  const pricingMode = isCatalogPricingMode(requestedMode) ? requestedMode : "promotion";
  const workbookBuffer = buildCatalogImportTemplateBuffer(pricingMode);
  const fileName = pricingMode === "slab"
    ? "slab-price-catalog-template.xlsx"
    : "promotion-catalog-template.xlsx";

  return new NextResponse(workbookBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
