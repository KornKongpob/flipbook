import { NextResponse } from "next/server";
import { createHeyzineFlipbook } from "@/lib/catalog/flipbooks/heyzine";
import {
  getCatalogJobBundle,
  getLatestPdfFile,
  getSignedFileUrl,
  markJobStatus,
  upsertFlipbookRecord,
} from "@/lib/catalog/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const SEE_OTHER = 303;

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
    return NextResponse.redirect(new URL("/login", request.url), SEE_OTHER);
  }

  const bundle = await getCatalogJobBundle(jobId, user.id);
  const latestPdf = getLatestPdfFile(bundle.files);

  if (!latestPdf) {
    return NextResponse.redirect(
      new URL(`/catalogs/${jobId}/result?error=${encodeURIComponent("Generate a PDF first.")}`, request.url),
      SEE_OTHER,
    );
  }

  if (bundle.job.flipbook_mode === "disabled") {
    return NextResponse.redirect(new URL(`/catalogs/${jobId}/result`, request.url), SEE_OTHER);
  }

  if (bundle.job.flipbook_mode !== "client_id") {
    await upsertFlipbookRecord({
      jobId,
      userId: user.id,
      pdfFileId: latestPdf.id,
      provider: "heyzine",
      mode: "manual",
      flipbookUrl: null,
      providerState: "manual_upload_required",
      providerResponseJson: {
        note: "Manual upload fallback selected.",
      },
    });

    return NextResponse.redirect(new URL(`/catalogs/${jobId}/result`, request.url), SEE_OTHER);
  }

  try {
    await markJobStatus(jobId, user.id, "converting_flipbook");
    const pdfUrl = await getSignedFileUrl(latestPdf.id, user.id, 3600);
    const flipbook = await createHeyzineFlipbook(pdfUrl);

    if (!flipbook) {
      throw new Error("Heyzine client ID is not configured.");
    }

    await upsertFlipbookRecord({
      jobId,
      userId: user.id,
      pdfFileId: latestPdf.id,
      provider: "heyzine",
      mode: "client_id",
      flipbookUrl: flipbook.url,
      thumbnailUrl: flipbook.thumbnail ?? null,
      providerState: flipbook.state ?? "created",
      providerResponseJson: flipbook as unknown as Record<string, unknown>,
    });

    await markJobStatus(jobId, user.id, "completed");

    return NextResponse.redirect(new URL(`/catalogs/${jobId}/result`, request.url), SEE_OTHER);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Flipbook processing failed.";
    await markJobStatus(jobId, user.id, "pdf_ready", message);

    return NextResponse.redirect(
      new URL(`/catalogs/${jobId}/result?error=${encodeURIComponent(message)}`, request.url),
      SEE_OTHER,
    );
  }
}
