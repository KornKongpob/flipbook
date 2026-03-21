import { NextResponse } from "next/server";
import {
  resolveCatalogBackgroundPreviewUrl,
  uploadCatalogBackgroundAsset,
} from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("background");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Background image is required." }, { status: 400 });
  }

  if (!(file.type || "").startsWith("image/")) {
    return NextResponse.json({ error: "Background must be an image file." }, { status: 400 });
  }

  try {
    const uploaded = await uploadCatalogBackgroundAsset({
      jobId,
      userId: user.id,
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "image/png",
    });

    const previewUrl = await resolveCatalogBackgroundPreviewUrl({
      pageBackgroundImageBucket: uploaded.storageBucket,
      pageBackgroundImagePath: uploaded.storagePath,
    });

    return NextResponse.json({
      storageBucket: uploaded.storageBucket,
      storagePath: uploaded.storagePath,
      previewUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Background upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
