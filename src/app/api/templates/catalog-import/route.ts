import { NextResponse } from "next/server";
import { buildCatalogImportTemplateBuffer } from "@/lib/catalog/excel";

export const runtime = "nodejs";

export async function GET() {
  const workbookBuffer = buildCatalogImportTemplateBuffer();

  return new NextResponse(workbookBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="catalog-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
