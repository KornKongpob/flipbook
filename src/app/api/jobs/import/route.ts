import { NextResponse } from "next/server";
import { createCatalogJobFromUpload } from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const file = formData.get("workbook");
  const templateId = String(formData.get("templateId") ?? "");
  const jobName = String(formData.get("jobName") ?? "");
  const flipbookMode = String(formData.get("flipbookMode") ?? "manual") as
    | "manual"
    | "client_id"
    | "disabled";
  const reuseManualMappings = formData.get("reuseManualMappings") === "on";

  if (!(file instanceof File)) {
    return NextResponse.redirect(
      new URL(`/catalogs/new?error=${encodeURIComponent("Workbook file is required.")}`, request.url),
    );
  }

  try {
    const jobId = await createCatalogJobFromUpload({
      userId: user.id,
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      templateId,
      jobName,
      flipbookMode,
      reuseManualMappings,
    });

    return NextResponse.redirect(new URL(`/catalogs/${jobId}/mapping`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";

    return NextResponse.redirect(
      new URL(`/catalogs/new?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
