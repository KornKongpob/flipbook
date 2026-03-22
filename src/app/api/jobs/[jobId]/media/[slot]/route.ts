import { NextResponse } from "next/server";
import {
  resolveCatalogMediaPreviewUrl,
  uploadCatalogJobMediaAsset,
} from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function resolveUploadSlot(slot: string) {
  if (slot === "header") {
    return "header-media" as const;
  }

  if (slot === "footer") {
    return "footer-media" as const;
  }

  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string; slot: string }> },
) {
  const { jobId, slot } = await context.params;
  const uploadSlot = resolveUploadSlot(slot);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!uploadSlot) {
    return NextResponse.json({ error: "Unsupported media slot." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("media");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Media image is required." }, { status: 400 });
  }

  if (!(file.type || "").startsWith("image/")) {
    return NextResponse.json({ error: "Media must be an image file." }, { status: 400 });
  }

  try {
    const uploaded = await uploadCatalogJobMediaAsset({
      jobId,
      userId: user.id,
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "image/png",
      slot: uploadSlot,
    });

    const previewUrl = await resolveCatalogMediaPreviewUrl(
      uploaded.storageBucket,
      uploaded.storagePath,
    );

    return NextResponse.json({
      storageBucket: uploaded.storageBucket,
      storagePath: uploaded.storagePath,
      previewUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
