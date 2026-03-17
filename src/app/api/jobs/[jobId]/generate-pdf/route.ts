import { NextResponse } from "next/server";
import { renderCatalogPdf } from "@/lib/catalog/pdf/renderer";
import { createHeyzineFlipbook } from "@/lib/catalog/flipbooks/heyzine";
import {
  createGeneratedFileRecord,
  getCatalogJobBundle,
  getSignedFileUrl,
  markJobStatus,
  resolveProductAssetBuffer,
  updateCatalogJobAfterPdf,
  upsertFlipbookRecord,
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
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await markJobStatus(jobId, user.id, "generating_pdf");
    const bundle = await getCatalogJobBundle(jobId, user.id);

    if (bundle.job.review_required_count > 0) {
      throw new Error("Resolve all review-required items before generating the PDF.");
    }

    const renderItems = await Promise.all(
      bundle.items
        .filter((item) => item.is_visible)
        .map(async (item) => ({
          id: item.id,
          sku: item.sku,
          productName: item.product_name,
          displayName: item.display_name_override || item.product_name,
          packSize: item.pack_size,
          unit: item.unit,
          normalPrice: item.normal_price,
          promoPrice: item.promo_price,
          discountAmount: item.discount_amount,
          discountPercent: item.discount_percent,
          imageBuffer: await resolveProductAssetBuffer(item.selectedAsset),
        })),
    );

    const theme = (bundle.template?.theme_json as Record<string, string>) ?? {};
    const styleOptions = (bundle.job.style_options_json as Record<string, string>) ?? {};
    const { buffer, pageCount } = await renderCatalogPdf({
      jobName: bundle.job.job_name,
      variant: String(styleOptions.variant ?? bundle.template?.variant ?? "promo"),
      theme,
      items: renderItems,
    });

    const pdfFile = await createGeneratedFileRecord({
      jobId,
      userId: user.id,
      fileBuffer: buffer,
      fileType: "generated_pdf",
    });

    await updateCatalogJobAfterPdf(jobId, user.id, pageCount);

    if (bundle.job.flipbook_mode === "client_id") {
      const pdfUrl = await getSignedFileUrl(pdfFile.id, user.id, 3600);
      const flipbook = await createHeyzineFlipbook(pdfUrl);

      if (flipbook) {
        await upsertFlipbookRecord({
          jobId,
          userId: user.id,
          pdfFileId: pdfFile.id,
          provider: "heyzine",
          mode: "client_id",
          flipbookUrl: flipbook.url,
          thumbnailUrl: flipbook.thumbnail ?? null,
          providerState: flipbook.state ?? "created",
          providerResponseJson: flipbook as unknown as Record<string, unknown>,
        });

        await markJobStatus(jobId, user.id, "completed");
      }
    }

    return NextResponse.redirect(new URL(`/catalogs/${jobId}/result`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed.";
    await markJobStatus(jobId, user.id, "failed", message);

    return NextResponse.redirect(
      new URL(`/catalogs/${jobId}/generate?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
