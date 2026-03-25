import { NextResponse } from "next/server";
import { createHeyzineFlipbook } from "@/lib/catalog/flipbooks/heyzine";
import { deriveCatalogPricing } from "@/lib/catalog/pricing";
import { renderCatalogPdf } from "@/lib/catalog/pdf/renderer";
import {
  beginPdfGeneration,
  createGeneratedFileRecord,
  getCatalogJobBundle,
  getSignedFileUrl,
  markJobStatus,
  resolveCatalogBackgroundBuffer,
  resolveCatalogMediaBuffer,
  resolveProductAssetBuffer,
  updateCatalogJobAfterPdf,
  upsertFlipbookRecord,
} from "@/lib/catalog/repository";
import { mergeCatalogStyleOptions } from "@/lib/catalog/style-options";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const SEE_OTHER = 303;

class RecoverablePdfGenerationError extends Error {}

function getReturnPath(jobId: string, returnTo: string) {
  return `/catalogs/${jobId}/${returnTo === "result" ? "result" : "generate"}`;
}

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

  const formData = await request.formData().catch(() => null);
  const returnTo = String(formData?.get("returnTo") ?? "generate");
  const returnPath = getReturnPath(jobId, returnTo);

  try {
    const bundle = await getCatalogJobBundle(jobId, user.id);

    if (["uploaded", "parsing", "matching"].includes(bundle.job.status)) {
      throw new RecoverablePdfGenerationError("Finish matching the catalog items before generating the PDF.");
    }

    if (bundle.job.review_required_count > 0) {
      throw new RecoverablePdfGenerationError("Resolve all review-required items before generating the PDF.");
    }

    const visibleItems = bundle.items.filter((item) => item.is_visible);

    if (!visibleItems.length) {
      throw new RecoverablePdfGenerationError("At least one visible product is required to generate the PDF.");
    }

    const didStartGeneration = await beginPdfGeneration(jobId, user.id);

    if (!didStartGeneration) {
      throw new RecoverablePdfGenerationError("PDF generation is already in progress.");
    }

    const renderItemResults = await Promise.all(
      visibleItems.map(async (item) => {
        const pricing = deriveCatalogPricing({
          normalPrice: item.normal_price,
          promoPrice: item.promo_price,
        });
        const resolvedImage = await resolveProductAssetBuffer(item.selectedAsset);
        const hasImageSource = Boolean(
          item.selectedAsset?.image_url
          || (item.selectedAsset?.storage_bucket && item.selectedAsset?.storage_path),
        );
        const imageWarning = hasImageSource && !resolvedImage.buffer
          ? {
              itemId: item.id,
              sku: item.sku,
              displayName: item.display_name_override || item.product_name,
              reason: resolvedImage.warning ?? "Image could not be downloaded for PDF export.",
              reasonCode: resolvedImage.reasonCode,
            }
          : null;

        return {
          renderItem: {
            id: item.id,
            sku: item.sku,
            productName: item.product_name,
            displayName: item.display_name_override || item.product_name,
            packSize: item.pack_size,
            unit: item.unit,
            normalPrice: pricing.normalPrice,
            promoPrice: pricing.promoPrice,
            discountAmount: pricing.discountAmount,
            discountPercent: pricing.discountPercent,
            imageBuffer: resolvedImage.buffer,
          },
          imageWarning,
        };
      }),
    );
    const renderItems = renderItemResults.map((entry) => entry.renderItem);
    const imageWarnings = renderItemResults
      .map((entry) => entry.imageWarning)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const theme = (bundle.template?.theme_json as Record<string, string>) ?? {};
    const styleOptions = mergeCatalogStyleOptions(
      bundle.job.style_options_json as Record<string, unknown>,
    );
    const [pageBackgroundBuffer, headerMediaBuffer, footerMediaBuffer] = await Promise.all([
      resolveCatalogBackgroundBuffer(
        bundle.job.style_options_json as Record<string, unknown>,
      ),
      resolveCatalogMediaBuffer(styleOptions.headerMediaBucket, styleOptions.headerMediaPath),
      resolveCatalogMediaBuffer(styleOptions.footerMediaBucket, styleOptions.footerMediaPath),
    ]);
    const { buffer, pageCount } = await renderCatalogPdf({
      jobName: bundle.job.job_name,
      variant: String(styleOptions.variant ?? bundle.template?.variant ?? "promo"),
      theme,
      items: renderItems,
      options: styleOptions,
      pageBackgroundBuffer,
      headerMediaBuffer,
      footerMediaBuffer,
    });

    const pdfFile = await createGeneratedFileRecord({
      jobId,
      userId: user.id,
      fileBuffer: buffer,
      fileType: "generated_pdf",
    });

    await updateCatalogJobAfterPdf(jobId, user.id, pageCount, {
      warningCount: imageWarnings.length,
      imageWarnings,
    });

    if (bundle.job.flipbook_mode === "client_id") {
      try {
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
        } else {
          console.warn(`[generate-pdf] Heyzine client_id not configured for job ${jobId}, staying at pdf_ready`);
        }
      } catch (heyzineError) {
        const heyzineMessage = heyzineError instanceof Error ? heyzineError.message : "Flipbook conversion failed.";
        console.error(`[generate-pdf] Heyzine conversion failed for job ${jobId}: ${heyzineMessage}`);
      }
    }

    return NextResponse.redirect(new URL(`/catalogs/${jobId}/result`, request.url), SEE_OTHER);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed.";

    if (error instanceof RecoverablePdfGenerationError) {
      return NextResponse.redirect(
        new URL(`${returnPath}?error=${encodeURIComponent(message)}`, request.url),
        SEE_OTHER,
      );
    }

    await markJobStatus(jobId, user.id, "failed", message);

    return NextResponse.redirect(
      new URL(`${returnPath}?error=${encodeURIComponent(message)}`, request.url),
      SEE_OTHER,
    );
  }
}
