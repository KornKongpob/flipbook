import { NextResponse } from "next/server";
import { attachManualAssetToItem } from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const file = formData.get("asset");
  const jobId = String(formData.get("jobId") ?? "");
  const saveManualMapping = formData.get("saveManualMapping") === "on";

  if (!(file instanceof File)) {
    return NextResponse.redirect(
      new URL(`/catalogs/${jobId}/review?error=${encodeURIComponent("Asset file is required.")}`, request.url),
    );
  }

  try {
    await attachManualAssetToItem({
      userId: user.id,
      itemId,
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "image/jpeg",
      saveManualMapping,
    });

    return NextResponse.redirect(new URL(`/catalogs/${jobId}/review`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";

    return NextResponse.redirect(
      new URL(`/catalogs/${jobId}/review?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
