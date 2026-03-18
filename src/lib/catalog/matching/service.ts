import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { MATCH_THRESHOLDS } from "@/lib/catalog/constants";
import { MakroSearchProvider } from "@/lib/catalog/matching/makro-provider";
import { scoreMatch } from "@/lib/catalog/matching/scoring";
import { normalizeName, normalizeSku } from "@/lib/utils";

type AdminClient = SupabaseClient<Database>;
type CatalogItemRow = Database["public"]["Tables"]["catalog_items"]["Row"];
type ProductAssetRow = Database["public"]["Tables"]["product_assets"]["Row"];

const provider = new MakroSearchProvider();

function asRow<T>(value: unknown) {
  return (value ?? null) as T;
}

function asRows<T>(value: unknown) {
  return ((value ?? []) as T[]) ?? [];
}

function asJson(value: unknown) {
  return value as Json;
}

async function getManualMappingAsset(admin: AdminClient, normalizedSku: string | null) {
  if (!normalizedSku) {
    return null;
  }

  const mappingResponse = await admin
    .from("manual_mappings")
    .select("preferred_asset_id")
    .eq("normalized_sku", normalizedSku)
    .maybeSingle();
  const mapping = asRow<{ preferred_asset_id: string } | null>(mappingResponse.data);

  if (!mapping) {
    return null;
  }

  const assetResponse = await admin
    .from("product_assets")
    .select("*")
    .eq("id", mapping.preferred_asset_id)
    .maybeSingle();

  return asRow<ProductAssetRow | null>(assetResponse.data);
}

async function getCachedAssets(admin: AdminClient, item: CatalogItemRow) {
  const results: ProductAssetRow[] = [];

  if (item.normalized_sku) {
    const response = await admin
      .from("product_assets")
      .select("*")
      .eq("normalized_sku", item.normalized_sku)
      .limit(6);
    results.push(...asRows<ProductAssetRow>(response.data));
  }

  if (item.normalized_name) {
    const response = await admin
      .from("product_assets")
      .select("*")
      .eq("normalized_name", item.normalized_name)
      .limit(6);
    results.push(...asRows<ProductAssetRow>(response.data));
  }

  const seen = new Set<string>();
  return results.filter((asset) => {
    if (seen.has(asset.id)) {
      return false;
    }

    seen.add(asset.id);
    return true;
  });
}

async function getOrCreateAsset(
  admin: AdminClient,
  candidate: Awaited<ReturnType<MakroSearchProvider["search"]>>[number],
) {
  if (candidate.sourceProductId) {
    const existingResponse = await admin
      .from("product_assets")
      .select("*")
      .eq("source", "makro")
      .eq("source_product_id", candidate.sourceProductId)
      .maybeSingle();
    const existing = asRow<ProductAssetRow | null>(existingResponse.data);

    if (existing) {
      return existing;
    }
  }

  const insertResponse = await admin
    .from("product_assets")
    .insert({
      source: "makro",
      source_product_id: candidate.sourceProductId,
      sku: candidate.sku,
      normalized_sku: candidate.normalizedSku,
      product_name: candidate.productName,
      normalized_name: candidate.normalizedName,
      product_url: candidate.productUrl,
      image_url: candidate.imageUrl,
      fetched_at: new Date().toISOString(),
      metadata_json: asJson(candidate.metadata),
    })
    .select("*")
    .single();
  const inserted = asRow<ProductAssetRow | null>(insertResponse.data);

  if (insertResponse.error || !inserted) {
    throw insertResponse.error ?? new Error("Could not create product asset.");
  }

  return inserted;
}

async function appendEvent(
  admin: AdminClient,
  jobId: string,
  step: string,
  message: string,
  metadataJson: Record<string, unknown> = {},
) {
  await admin.from("catalog_job_events").insert({
    job_id: jobId,
    level: "info",
    step,
    message,
    metadata_json: asJson(metadataJson),
  });
}

async function upsertCandidateRows(
  admin: AdminClient,
  itemId: string,
  candidates: Array<{ asset: ProductAssetRow; confidence: number; reasons: string[] }>,
) {
  await admin.from("product_match_candidates").delete().eq("item_id", itemId);

  if (!candidates.length) {
    return;
  }

  await admin.from("product_match_candidates").insert(
    candidates.map((candidate, index) => ({
      item_id: itemId,
      asset_id: candidate.asset.id,
      rank_no: index + 1,
      confidence: candidate.confidence,
      match_reason: candidate.reasons.join(","),
    })),
  );
}

async function updateItemDecision(
  admin: AdminClient,
  item: CatalogItemRow,
  candidates: Array<{ asset: ProductAssetRow; confidence: number; reasons: string[] }>,
) {
  const topCandidate = candidates[0];

  if (!topCandidate) {
    await admin
      .from("catalog_items")
      .update({
        selected_asset_id: null,
        confidence: 0,
        match_status: "needs_review",
        review_note: "No confident match found.",
      })
      .eq("id", item.id);
    return;
  }

  if (topCandidate.confidence >= MATCH_THRESHOLDS.autoApprove) {
    await admin
      .from("catalog_items")
      .update({
        selected_asset_id: topCandidate.asset.id,
        confidence: topCandidate.confidence,
        match_status: "approved",
        review_note: `Auto-approved via ${topCandidate.reasons.join(", ")}`,
      })
      .eq("id", item.id);
    return;
  }

  await admin
    .from("catalog_items")
    .update({
      selected_asset_id: topCandidate.asset.id,
      confidence: topCandidate.confidence,
      match_status: "needs_review",
      review_note:
        topCandidate.confidence >= MATCH_THRESHOLDS.needsReview
          ? `Review recommended via ${topCandidate.reasons.join(", ")}`
          : "Low confidence match. Manual review required.",
    })
    .eq("id", item.id);
}

export async function runMatchingForJob(params: {
  admin: AdminClient;
  jobId: string;
  items: CatalogItemRow[];
  reuseManualMappings: boolean;
}) {
  const { admin, jobId, items, reuseManualMappings } = params;

  await appendEvent(admin, jobId, "matching", "Started product matching pipeline.", {
    itemCount: items.length,
  });

  for (const item of items) {
    const normalizedSku = item.normalized_sku ?? normalizeSku(item.sku);
    const normalizedName = item.normalized_name ?? normalizeName(item.product_name);

    if (reuseManualMappings) {
      const manualAsset = await getManualMappingAsset(admin, normalizedSku);

      if (manualAsset) {
        await upsertCandidateRows(admin, item.id, [
          { asset: manualAsset, confidence: 1, reasons: ["manual_mapping"] },
        ]);
        await admin
          .from("catalog_items")
          .update({
            selected_asset_id: manualAsset.id,
            confidence: 1,
            match_status: "approved",
            review_note: "Matched from saved manual mapping.",
          })
          .eq("id", item.id);
        continue;
      }
    }

    try {
      const cachedAssets = await getCachedAssets(admin, {
        ...item,
        normalized_sku: normalizedSku,
        normalized_name: normalizedName,
      });
      const primaryCandidates = item.sku
        ? await provider.search(item.sku)
        : await provider.search(item.product_name);
      const fallbackCandidates =
        primaryCandidates.length < 3 ? await provider.search(item.product_name) : [];

      if (primaryCandidates.length === 0 && fallbackCandidates.length === 0) {
        console.warn(`[matching] No provider results for item ${item.sku ?? item.product_name}`);
      }

      const providerAssets = await Promise.all(
        [...primaryCandidates, ...fallbackCandidates].map((candidate) =>
          getOrCreateAsset(admin, candidate).catch((err) => {
            console.warn(`[matching] getOrCreateAsset failed for candidate ${candidate.sku}: ${err instanceof Error ? err.message : "unknown"}`);
            return null;
          }),
        ),
      );

      const assets = [...cachedAssets, ...providerAssets]
        .filter((asset): asset is ProductAssetRow => asset !== null)
        .filter(
          (asset, index, values) => values.findIndex((entry) => entry.id === asset.id) === index,
        );

      const scored = assets
        .map((asset) => {
          const result = scoreMatch(
            {
              sku: item.sku,
              normalizedSku,
              productName: item.product_name,
              normalizedName,
              packSize: item.pack_size,
            },
            {
              sku: asset.sku,
              normalizedSku: asset.normalized_sku,
              productName: asset.product_name,
              normalizedName: asset.normalized_name,
            },
          );

          return {
            asset,
            confidence: result.confidence,
            reasons: result.reasons,
          };
        })
        .filter((entry) => entry.confidence > 0.2)
        .sort((left, right) => right.confidence - left.confidence)
        .slice(0, 6);

      await upsertCandidateRows(admin, item.id, scored);
      await updateItemDecision(admin, item, scored);
    } catch (itemError) {
      console.error(`[matching] Failed to match item ${item.id} (${item.sku}): ${itemError instanceof Error ? itemError.message : "unknown"}`);
      await appendEvent(admin, jobId, "matching", `Failed to match item ${item.sku ?? item.product_name}: ${itemError instanceof Error ? itemError.message : "unknown"}`, {
        itemId: item.id,
        sku: item.sku,
      });
      await admin
        .from("catalog_items")
        .update({
          selected_asset_id: null,
          confidence: 0,
          match_status: "needs_review",
          review_note: "Matching failed. Manual review required.",
        })
        .eq("id", item.id);
    }
  }

  const refreshedResponse = await admin
    .from("catalog_items")
    .select("match_status, selected_asset_id")
    .eq("job_id", jobId);
  const refreshedItems = asRows<
    Pick<CatalogItemRow, "match_status" | "selected_asset_id">
  >(refreshedResponse.data);

  const matchedRowCount = refreshedItems.filter((item) => Boolean(item.selected_asset_id)).length;
  const reviewRequiredCount = refreshedItems.filter(
    (item) => item.match_status === "needs_review",
  ).length;

  await admin
    .from("catalog_jobs")
    .update({
      matched_row_count: matchedRowCount,
      review_required_count: reviewRequiredCount,
      status: reviewRequiredCount > 0 ? "needs_review" : "ready_to_generate",
    })
    .eq("id", jobId);

  await appendEvent(
    admin,
    jobId,
    "matching",
    reviewRequiredCount > 0
      ? "Matching completed with review-required items."
      : "Matching completed. Job is ready for PDF generation.",
    { matchedRowCount, reviewRequiredCount },
  );
}
