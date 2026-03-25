import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseWorkbookBuffer } from "@/lib/catalog/excel";
import { runMatchingForJob } from "@/lib/catalog/matching/service";
import {
  buildCatalogBackgroundTarget,
  buildCatalogJobMediaTarget,
  buildGeneratedPdfTarget,
  buildManualAssetTarget,
  buildRawUploadTarget,
  type CatalogJobMediaSlot,
} from "@/lib/catalog/storage";
import { FILE_BUCKETS } from "@/lib/catalog/constants";
import {
  normalizePdfRenderableImageBuffer,
  validatePdfRenderableImageBuffer,
} from "@/lib/catalog/image-validation";
import {
  ensureProductAssetStorageBacked,
  type ProductAssetImageReasonCode,
} from "@/lib/catalog/product-assets";
import { deriveCatalogPricing } from "@/lib/catalog/pricing";
import { mergeCatalogStyleOptions, type CatalogStyleOptions } from "@/lib/catalog/style-options";
import { normalizeSku } from "@/lib/utils";
import type { CatalogJobStatus } from "@/lib/database.types";

type AdminClient = SupabaseClient<Database>;
type CatalogJobRow = Database["public"]["Tables"]["catalog_jobs"]["Row"];
type CatalogItemRow = Database["public"]["Tables"]["catalog_items"]["Row"];
type CatalogTemplateRow = Database["public"]["Tables"]["catalog_templates"]["Row"];
type ProductAssetRow = Database["public"]["Tables"]["product_assets"]["Row"];
type ProductCandidateRow = Database["public"]["Tables"]["product_match_candidates"]["Row"];
type GeneratedFileRow = Database["public"]["Tables"]["generated_files"]["Row"];
type FlipbookRow = Database["public"]["Tables"]["flipbooks"]["Row"];
type EventRow = Database["public"]["Tables"]["catalog_job_events"]["Row"];
type ManualMappingRow = Database["public"]["Tables"]["manual_mappings"]["Row"];

export interface CatalogItemView extends CatalogItemRow {
  selectedAsset: ProductAssetRow | null;
  candidates: Array<{
    row: ProductCandidateRow;
    asset: ProductAssetRow | null;
  }>;
}

export interface CatalogJobBundle {
  job: CatalogJobRow;
  template: CatalogTemplateRow | null;
  items: CatalogItemView[];
  files: GeneratedFileRow[];
  flipbook: FlipbookRow | null;
  events: EventRow[];
}

export interface CatalogItemCanonicalFields {
  displayName: string | null;
  normalPrice: number | null;
  promoPrice: number | null;
  discountAmount: number | null;
  discountPercent: number | null;
  packSize: string | null;
  unit: string | null;
}

export interface ResolvedProductAssetBufferResult {
  asset: ProductAssetRow | null;
  buffer: Buffer | null;
  reasonCode: ProductAssetImageReasonCode | null;
  warning: string | null;
  recoveredFromRemote: boolean;
}

function asRow<T>(value: unknown) {
  return (value ?? null) as T;
}

function asRows<T>(value: unknown) {
  return ((value ?? []) as T[]) ?? [];
}

function asJson(value: unknown) {
  return value as Json;
}

function toCatalogItemCanonicalFields(item: Pick<
  CatalogItemRow,
  | "display_name_override"
  | "normal_price"
  | "promo_price"
  | "discount_amount"
  | "discount_percent"
  | "pack_size"
  | "unit"
>) {
  const pricing = deriveCatalogPricing({
    normalPrice: item.normal_price,
    promoPrice: item.promo_price,
  });

  return {
    displayName: item.display_name_override,
    normalPrice: pricing.normalPrice,
    promoPrice: pricing.promoPrice,
    discountAmount: pricing.discountAmount,
    discountPercent: pricing.discountPercent,
    packSize: item.pack_size,
    unit: item.unit,
  } satisfies CatalogItemCanonicalFields;
}

function getCatalogJobStatusAfterInteractiveChange(
  currentStatus: CatalogJobStatus,
  reviewRequiredCount: number,
): CatalogJobStatus {
  if (["uploaded", "parsing", "matching"].includes(currentStatus)) {
    return currentStatus;
  }

  if (reviewRequiredCount > 0) {
    return "needs_review";
  }

  if (["generating_pdf", "pdf_ready", "converting_flipbook", "completed"].includes(currentStatus)) {
    return currentStatus;
  }

  return "ready_to_generate";
}

async function syncCatalogJobReviewState(
  admin: AdminClient,
  job: Pick<CatalogJobRow, "id" | "status">,
) {
  const itemsResponse = await admin
    .from("catalog_items")
    .select("id, match_status")
    .eq("job_id", job.id);
  const items = asRows<Pick<CatalogItemRow, "id" | "match_status">>(itemsResponse.data);
  const reviewRequiredCount = items.filter((entry) => entry.match_status === "needs_review").length;

  await admin
    .from("catalog_jobs")
    .update({
      review_required_count: reviewRequiredCount,
      status: getCatalogJobStatusAfterInteractiveChange(job.status, reviewRequiredCount),
    })
    .eq("id", job.id);

  return {
    remainingItemsCount: items.length,
    reviewRequiredCount,
  };
}

async function compactCatalogItemDisplayOrder(
  admin: AdminClient,
  jobId: string,
) {
  const itemsResponse = await admin
    .from("catalog_items")
    .select("id, display_order, row_no")
    .eq("job_id", jobId)
    .order("display_order", { ascending: true })
    .order("row_no", { ascending: true });
  const items = asRows<Pick<CatalogItemRow, "id" | "display_order" | "row_no">>(itemsResponse.data);

  await Promise.all(
    items.map((item, index) =>
      item.display_order === index
        ? Promise.resolve()
        : admin
            .from("catalog_items")
            .update({ display_order: index })
            .eq("id", item.id),
    ),
  );

  return items.length;
}

function getAdminClientOrThrow() {
  const admin = createAdminSupabaseClient();

  if (!admin) {
    throw new Error("Supabase service role credentials are required for this action.");
  }

  return admin;
}

async function isAdminUser(admin: AdminClient, userId: string) {
  const response = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  const data = asRow<{ role?: string } | null>(response.data);

  return data?.role === "admin";
}

async function ensureJobAccess(admin: AdminClient, jobId: string, userId: string) {
  const response = await admin.from("catalog_jobs").select("*").eq("id", jobId).maybeSingle();
  const job = asRow<CatalogJobRow | null>(response.data);

  if (response.error || !job) {
    throw response.error ?? new Error("Catalog job not found.");
  }

  if (job.created_by !== userId && !(await isAdminUser(admin, userId))) {
    throw new Error("You do not have access to this catalog job.");
  }

  return job;
}

export async function appendJobEvent(
  jobId: string,
  step: string,
  message: string,
  metadataJson: Record<string, unknown> = {},
) {
  const admin = getAdminClientOrThrow();

  await admin.from("catalog_job_events").insert({
    job_id: jobId,
    level: "info",
    step,
    message,
    metadata_json: asJson(metadataJson),
  });
}

export async function getActiveTemplates() {
  const admin = getAdminClientOrThrow();
  const response = await admin
    .from("catalog_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (response.error) {
    throw response.error;
  }

  return asRows<CatalogTemplateRow>(response.data);
}

export async function getDashboardSummary(userId: string) {
  const admin = getAdminClientOrThrow();

  const [jobsResponse, templatesResponse] = await Promise.all([
    admin
      .from("catalog_jobs")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("catalog_templates")
      .select("*")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (jobsResponse.error) {
    throw jobsResponse.error;
  }

  if (templatesResponse.error) {
    throw templatesResponse.error;
  }

  const jobs = asRows<CatalogJobRow>(jobsResponse.data);
  const templates = asRows<CatalogTemplateRow>(templatesResponse.data);
  const counts = jobs.reduce<Record<string, number>>((accumulator, job) => {
    accumulator[job.status] = (accumulator[job.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return { jobs, templates, counts };
}

export async function getCatalogJobBundle(jobId: string, userId: string): Promise<CatalogJobBundle> {
  const admin = getAdminClientOrThrow();
  const job = await ensureJobAccess(admin, jobId, userId);
  const itemsResponse = await admin
    .from("catalog_items")
    .select("*")
    .eq("job_id", job.id)
    .order("display_order", { ascending: true });

  if (itemsResponse.error) {
    throw itemsResponse.error;
  }

  const items = asRows<CatalogItemRow>(itemsResponse.data);
  const itemIds = items.map((item) => item.id);

  const [templateResponse, candidatesResponse, filesResponse, flipbookResponse, eventsResponse] =
    await Promise.all([
      job.template_id
        ? admin.from("catalog_templates").select("*").eq("id", job.template_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      itemIds.length
        ? admin
            .from("product_match_candidates")
            .select("*")
            .in("item_id", itemIds)
        : Promise.resolve({ data: [], error: null }),
      admin
        .from("generated_files")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false }),
      admin.from("flipbooks").select("*").eq("job_id", job.id).maybeSingle(),
      admin
        .from("catalog_job_events")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  const template = templateResponse.error
    ? null
    : asRow<CatalogTemplateRow | null>(templateResponse.data);
  const candidates = candidatesResponse.error
    ? []
    : asRows<ProductCandidateRow>(candidatesResponse.data);
  const files = filesResponse.error ? [] : asRows<GeneratedFileRow>(filesResponse.data);
  const flipbook = flipbookResponse.error
    ? null
    : asRow<FlipbookRow | null>(flipbookResponse.data);
  const events = eventsResponse.error ? [] : asRows<EventRow>(eventsResponse.data);

  const assetIds = [
    ...items.map((item) => item.selected_asset_id).filter(Boolean),
    ...candidates.map((candidate) => candidate.asset_id),
  ] as string[];

  const assetResponse = assetIds.length
    ? await admin.from("product_assets").select("*").in("id", [...new Set(assetIds)])
    : { data: [], error: null };
  const assets = assetResponse.error ? [] : asRows<ProductAssetRow>(assetResponse.data);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const candidatesByItem = new Map<string, Array<{ row: ProductCandidateRow; asset: ProductAssetRow | null }>>();

  candidates.forEach((candidate) => {
    const entry = candidatesByItem.get(candidate.item_id) ?? [];
    entry.push({
      row: candidate,
      asset: assetsById.get(candidate.asset_id) ?? null,
    });
    candidatesByItem.set(candidate.item_id, entry);
  });

  const itemViews = items.map<CatalogItemView>((item) => ({
    ...item,
    selectedAsset: item.selected_asset_id ? assetsById.get(item.selected_asset_id) ?? null : null,
    candidates: (candidatesByItem.get(item.id) ?? []).sort(
      (left, right) => left.row.rank_no - right.row.rank_no,
    ),
  }));

  return {
    job,
    template,
    items: itemViews,
    files,
    flipbook,
    events,
  };
}

export async function createCatalogJobFromUpload(args: {
  userId: string;
  fileName: string;
  fileBuffer: Buffer;
  templateId: string;
  jobName: string;
  flipbookMode: Database["public"]["Enums"]["flipbook_mode"];
  reuseManualMappings: boolean;
}) {
  const admin = getAdminClientOrThrow();
  const parsed = parseWorkbookBuffer(args.fileBuffer);

  const jobResponse = await admin
    .from("catalog_jobs")
    .insert({
      created_by: args.userId,
      template_id: args.templateId,
      job_name: args.jobName,
      status: "parsing",
      parsed_row_count: parsed.rows.length,
      matched_row_count: 0,
      review_required_count: 0,
      page_count: 0,
      flipbook_mode: args.flipbookMode,
      column_mapping_json: asJson({
        sheetName: parsed.sheetName,
        headers: parsed.headers,
        mapping: parsed.mapping,
        warnings: parsed.warnings,
        previewRows: parsed.previewRows,
      }),
    })
    .select("*")
    .single();

  const job = asRow<CatalogJobRow | null>(jobResponse.data);

  if (jobResponse.error || !job) {
    throw jobResponse.error ?? new Error("Could not create catalog job.");
  }

  const uploadTarget = buildRawUploadTarget(args.userId, job.id, args.fileName);
  const uploadResponse = await admin.storage
    .from(uploadTarget.bucket)
    .upload(uploadTarget.path, args.fileBuffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: false,
    });

  if (uploadResponse.error) {
    throw uploadResponse.error;
  }

  await appendJobEvent(job.id, "upload", "Uploaded source workbook to storage.", {
    fileName: args.fileName,
    sheetName: parsed.sheetName,
    rowCount: parsed.rows.length,
  });

  await admin
    .from("catalog_jobs")
    .update({
      source_file_bucket: uploadTarget.bucket,
      source_file_path: uploadTarget.path,
      source_file_name: args.fileName,
      status: "matching",
    })
    .eq("id", job.id);

  const itemsResponse = await admin
    .from("catalog_items")
    .insert(
      parsed.rows.map((row) => ({
        job_id: job.id,
        row_no: row.rowNo,
        sku: row.sku,
        product_name: row.productName,
        pack_size: row.packSize,
        unit: row.unit,
        normal_price: row.normalPrice,
        promo_price: row.promoPrice,
        discount_amount: row.discountAmount,
        discount_percent: row.discountPercent,
        normalized_sku: row.normalizedSku,
        normalized_name: row.normalizedName,
        display_order: row.displayOrder,
        match_status: "pending" as const,
      })),
    )
    .select("*");

  const insertedItems = asRows<CatalogItemRow>(itemsResponse.data);

  if (itemsResponse.error || !insertedItems.length) {
    throw itemsResponse.error ?? new Error("Could not insert catalog items.");
  }

  await appendJobEvent(job.id, "parse", "Parsed workbook rows and created catalog items.", {
    parsedRowCount: insertedItems.length,
  });

  await runMatchingForJob({
    admin,
    jobId: job.id,
    items: insertedItems,
    reuseManualMappings: args.reuseManualMappings,
  });

  return job.id;
}

export async function updateJobStyleOptions(
  jobId: string,
  userId: string,
  styleOptions: CatalogStyleOptions | Record<string, unknown>,
) {
  const admin = getAdminClientOrThrow();
  await ensureJobAccess(admin, jobId, userId);

  await admin
    .from("catalog_jobs")
    .update({
      style_options_json: asJson(styleOptions),
    })
    .eq("id", jobId);

  await appendJobEvent(jobId, "style", "Updated catalog style options.", styleOptions as Record<string, unknown>);
}

export async function approveCatalogItem(args: {
  userId: string;
  itemId: string;
  assetId: string;
  saveManualMapping: boolean;
}) {
  const admin = getAdminClientOrThrow();
  const itemResponse = await admin
    .from("catalog_items")
    .select("*")
    .eq("id", args.itemId)
    .maybeSingle();
  const item = asRow<CatalogItemRow | null>(itemResponse.data);

  if (itemResponse.error || !item) {
    throw itemResponse.error ?? new Error("Catalog item not found.");
  }

  const job = await ensureJobAccess(admin, item.job_id, args.userId);
  const assetResponse = await admin
    .from("product_assets")
    .select("*")
    .eq("id", args.assetId)
    .maybeSingle();
  const asset = asRow<ProductAssetRow | null>(assetResponse.data);

  if (!asset) {
    throw new Error("Product asset not found.");
  }

  if (asset.image_url && (!asset.storage_bucket || !asset.storage_path)) {
    await ensureProductAssetStorageBacked(admin, asset).catch(() => null);
  }

  await admin
    .from("catalog_items")
    .update({
      selected_asset_id: args.assetId,
      match_status: "approved",
      review_note: "Approved manually.",
    })
    .eq("id", item.id);

  if (args.saveManualMapping && item.normalized_sku) {
    await admin.from("manual_mappings").upsert(
      {
        sku: item.sku ?? item.normalized_sku,
        normalized_sku: item.normalized_sku,
        preferred_asset_id: args.assetId,
        locked_image: true,
        locked_name: true,
        created_by: args.userId,
      },
      { onConflict: "normalized_sku" },
    );
  }

  await syncCatalogJobReviewState(admin, job);

  await appendJobEvent(job.id, "review", "Manually approved a product match.", {
    itemId: item.id,
    assetId: args.assetId,
    saveManualMapping: args.saveManualMapping,
  });
}

export async function updateCatalogItemDisplayName(
  userId: string,
  itemId: string,
  displayName: string | null,
) {
  const admin = getAdminClientOrThrow();
  const itemResponse = await admin
    .from("catalog_items")
    .select("id, job_id")
    .eq("id", itemId)
    .maybeSingle();
  const item = asRow<Pick<CatalogItemRow, "id" | "job_id"> | null>(itemResponse.data);

  if (!item) {
    throw new Error("Catalog item not found.");
  }

  await ensureJobAccess(admin, item.job_id, userId);

  await admin
    .from("catalog_items")
    .update({ display_name_override: displayName?.trim() || null })
    .eq("id", itemId);
}

export async function toggleCatalogItemVisibility(
  userId: string,
  itemId: string,
  nextVisible: boolean,
) {
  const admin = getAdminClientOrThrow();
  const itemResponse = await admin
    .from("catalog_items")
    .select("id, job_id")
    .eq("id", itemId)
    .maybeSingle();
  const item = asRow<Pick<CatalogItemRow, "id" | "job_id"> | null>(itemResponse.data);

  if (!item) {
    throw new Error("Catalog item not found.");
  }

  await ensureJobAccess(admin, item.job_id, userId);
  await admin.from("catalog_items").update({ is_visible: nextVisible }).eq("id", itemId);
}

export async function moveCatalogItem(
  userId: string,
  itemId: string,
  direction: "up" | "down",
) {
  const admin = getAdminClientOrThrow();
  const itemResponse = await admin
    .from("catalog_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  const item = asRow<CatalogItemRow | null>(itemResponse.data);

  if (!item) {
    throw new Error("Catalog item not found.");
  }

  await ensureJobAccess(admin, item.job_id, userId);

  const itemsResponse = await admin
    .from("catalog_items")
    .select("id, display_order")
    .eq("job_id", item.job_id)
    .order("display_order");
  const items = asRows<Array<Pick<CatalogItemRow, "id" | "display_order">>[number]>(
    itemsResponse.data,
  );
  const index = items.findIndex((entry) => entry.id === itemId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return;
  }

  const current = items[index];
  const target = items[nextIndex];

  await admin
    .from("catalog_items")
    .update({ display_order: target.display_order })
    .eq("id", current.id);
  await admin
    .from("catalog_items")
    .update({ display_order: current.display_order })
    .eq("id", target.id);
}

export async function reorderCatalogItems(
  userId: string,
  jobId: string,
  orderedItemIds: string[],
) {
  const admin = getAdminClientOrThrow();

  if (!orderedItemIds.length) {
    return;
  }

  await ensureJobAccess(admin, jobId, userId);

  const itemsResponse = await admin
    .from("catalog_items")
    .select("id")
    .eq("job_id", jobId)
    .order("display_order", { ascending: true });
  const items = asRows<Pick<CatalogItemRow, "id">>(itemsResponse.data);
  const existingIds = new Set(items.map((item) => item.id));
  const submittedIds = new Set(orderedItemIds);

  if (
    items.length !== orderedItemIds.length ||
    submittedIds.size !== orderedItemIds.length ||
    orderedItemIds.some((itemId) => !existingIds.has(itemId))
  ) {
    throw new Error("Invalid item order payload.");
  }

  await Promise.all(
    orderedItemIds.map((itemId, index) =>
      admin
        .from("catalog_items")
        .update({ display_order: index })
        .eq("id", itemId),
    ),
  );

  await appendJobEvent(jobId, "editor", "Reordered catalog items from the interactive editor.", {
    itemCount: orderedItemIds.length,
  });
}

export async function removeCatalogItems(args: {
  userId: string;
  jobId: string;
  itemIds: string[];
}) {
  const admin = getAdminClientOrThrow();
  const submittedIds = [...new Set(args.itemIds.filter(Boolean))];

  if (!submittedIds.length) {
    return {
      removedCount: 0,
      removedItemIds: [] as string[],
      remainingItemsCount: 0,
      reviewRequiredCount: 0,
    };
  }

  const job = await ensureJobAccess(admin, args.jobId, args.userId);
  const itemsResponse = await admin
    .from("catalog_items")
    .select("id, job_id, sku, product_name")
    .eq("job_id", args.jobId)
    .in("id", submittedIds);
  const items = asRows<Pick<CatalogItemRow, "id" | "job_id" | "sku" | "product_name">>(itemsResponse.data);

  if (items.length !== submittedIds.length) {
    throw new Error("Some catalog items could not be found for removal.");
  }

  const deletedCandidatesResponse = await admin
    .from("product_match_candidates")
    .delete()
    .in("item_id", submittedIds);

  if (deletedCandidatesResponse.error) {
    throw deletedCandidatesResponse.error;
  }

  const deletedItemsResponse = await admin
    .from("catalog_items")
    .delete()
    .in("id", submittedIds);

  if (deletedItemsResponse.error) {
    throw deletedItemsResponse.error;
  }

  await compactCatalogItemDisplayOrder(admin, args.jobId);
  const reviewState = await syncCatalogJobReviewState(admin, job);

  await appendJobEvent(
    args.jobId,
    "review",
    submittedIds.length === 1
      ? "Removed an item from the catalog."
      : `Removed ${submittedIds.length} items from the catalog.`,
    {
      removedCount: submittedIds.length,
      removedItems: items.map((item) => ({
        itemId: item.id,
        sku: item.sku,
        productName: item.product_name,
      })),
    },
  );

  return {
    removedCount: submittedIds.length,
    removedItemIds: submittedIds,
    remainingItemsCount: reviewState.remainingItemsCount,
    reviewRequiredCount: reviewState.reviewRequiredCount,
  };
}

export async function duplicateCatalogJob(jobId: string, userId: string) {
  const admin = getAdminClientOrThrow();
  const bundle = await getCatalogJobBundle(jobId, userId);

  const duplicateResponse = await admin
    .from("catalog_jobs")
    .insert({
      created_by: userId,
      template_id: bundle.job.template_id,
      job_name: `${bundle.job.job_name} (copy)`,
      source_file_bucket: bundle.job.source_file_bucket,
      source_file_path: bundle.job.source_file_path,
      source_file_name: bundle.job.source_file_name,
      status: bundle.job.review_required_count > 0 ? "needs_review" : "ready_to_generate",
      parsed_row_count: bundle.job.parsed_row_count,
      matched_row_count: bundle.job.matched_row_count,
      review_required_count: bundle.job.review_required_count,
      page_count: 0,
      flipbook_mode: bundle.job.flipbook_mode,
      column_mapping_json: bundle.job.column_mapping_json,
      style_options_json: bundle.job.style_options_json,
      error_message: null,
    })
    .select("*")
    .single();
  const duplicatedJob = asRow<CatalogJobRow | null>(duplicateResponse.data);

  if (duplicateResponse.error || !duplicatedJob) {
    throw duplicateResponse.error ?? new Error("Could not duplicate catalog job.");
  }

  await admin.from("catalog_items").insert(
    bundle.items.map((item, index) => ({
      job_id: duplicatedJob.id,
      row_no: item.row_no,
      sku: item.sku,
      product_name: item.product_name,
      pack_size: item.pack_size,
      unit: item.unit,
      normal_price: item.normal_price,
      promo_price: item.promo_price,
      discount_amount: item.discount_amount,
      discount_percent: item.discount_percent,
      normalized_sku: item.normalized_sku,
      normalized_name: item.normalized_name,
      display_name_override: item.display_name_override,
      display_order: index,
      render_variant: item.render_variant,
      is_visible: item.is_visible,
      match_status: item.match_status,
      selected_asset_id: item.selected_asset_id,
      confidence: item.confidence,
      review_note: item.review_note,
      metadata_json: item.metadata_json,
    })),
  );

  await appendJobEvent(duplicatedJob.id, "job", "Duplicated catalog job from an existing run.");
  return duplicatedJob.id;
}

export async function createGeneratedFileRecord(args: {
  jobId: string;
  userId: string;
  fileBuffer: Buffer;
  fileType: Database["public"]["Enums"]["generated_file_type"];
}) {
  const admin = getAdminClientOrThrow();
  const job = await ensureJobAccess(admin, args.jobId, args.userId);
  const existingFilesResponse = await admin
    .from("generated_files")
    .select("id")
    .eq("job_id", job.id)
    .eq("file_type", args.fileType);
  const version = asRows<{ id: string }>(existingFilesResponse.data).length + 1;
  const target = buildGeneratedPdfTarget(args.userId, job.id, version);

  const uploadResponse = await admin.storage.from(target.bucket).upload(target.path, args.fileBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadResponse.error) {
    throw uploadResponse.error;
  }

  const fileResponse = await admin
    .from("generated_files")
    .insert({
      job_id: job.id,
      file_type: args.fileType,
      storage_bucket: target.bucket,
      storage_path: target.path,
      file_size_bytes: args.fileBuffer.byteLength,
      checksum: createHash("sha256").update(args.fileBuffer).digest("hex"),
    })
    .select("*")
    .single();
  const file = asRow<GeneratedFileRow | null>(fileResponse.data);

  if (fileResponse.error || !file) {
    throw fileResponse.error ?? new Error("Could not store generated file record.");
  }

  return file;
}

export async function updateCatalogJobAfterPdf(
  jobId: string,
  userId: string,
  pageCount: number,
  metadataJson: Record<string, unknown> = {},
) {
  const admin = getAdminClientOrThrow();
  await ensureJobAccess(admin, jobId, userId);

  await admin
    .from("catalog_jobs")
    .update({
      page_count: pageCount,
      status: "pdf_ready",
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  await appendJobEvent(jobId, "pdf", "Generated the catalog PDF.", {
    pageCount,
    ...metadataJson,
  });
}

export async function upsertFlipbookRecord(args: {
  jobId: string;
  userId: string;
  pdfFileId: string;
  provider: string;
  mode: Database["public"]["Enums"]["flipbook_mode"];
  flipbookUrl: string | null;
  thumbnailUrl?: string | null;
  providerState?: string | null;
  providerResponseJson?: Record<string, unknown>;
}) {
  const admin = getAdminClientOrThrow();
  await ensureJobAccess(admin, args.jobId, args.userId);

  const response = await admin.from("flipbooks").upsert(
    {
      job_id: args.jobId,
      provider: args.provider,
      mode: args.mode,
      pdf_file_id: args.pdfFileId,
      flipbook_url: args.flipbookUrl,
      thumbnail_url: args.thumbnailUrl ?? null,
      provider_state: args.providerState ?? null,
      provider_response_json: asJson(args.providerResponseJson ?? {}),
    },
    { onConflict: "job_id,provider" },
  );

  if (response.error) {
    throw response.error;
  }
}

export async function getSignedFileUrl(fileId: string, userId: string, expiresIn = 3600) {
  const admin = getAdminClientOrThrow();
  const fileResponse = await admin
    .from("generated_files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();
  const file = asRow<GeneratedFileRow | null>(fileResponse.data);

  if (!file) {
    throw new Error("Generated file not found.");
  }

  await ensureJobAccess(admin, file.job_id, userId);

  const signedUrlResponse = await admin.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, expiresIn);

  if (signedUrlResponse.error || !signedUrlResponse.data?.signedUrl) {
    throw signedUrlResponse.error ?? new Error("Could not create signed file URL.");
  }

  return signedUrlResponse.data.signedUrl;
}

export async function getLibraryData(userId: string) {
  const admin = getAdminClientOrThrow();

  const [mappingsResponse, assetsResponse] = await Promise.all([
    admin
      .from("manual_mappings")
      .select("*")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false })
      .limit(40),
    admin
      .from("product_assets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  return {
    mappings: asRows<ManualMappingRow>(mappingsResponse.data),
    assets: asRows<ProductAssetRow>(assetsResponse.data),
  };
}

async function downloadStorageBuffer(bucket: string, path: string) {
  const admin = getAdminClientOrThrow();
  const downloadResponse = await admin.storage.from(bucket).download(path);

  if (downloadResponse.error || !downloadResponse.data) {
    return null;
  }

  return Buffer.from(await downloadResponse.data.arrayBuffer());
}

async function createSignedStorageUrl(bucket: string, path: string, expiresIn = 3600) {
  const admin = getAdminClientOrThrow();
  const signedUrlResponse = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (signedUrlResponse.error || !signedUrlResponse.data?.signedUrl) {
    return null;
  }

  return signedUrlResponse.data.signedUrl;
}

export async function resolveProductAssetBuffer(
  asset: ProductAssetRow | null,
): Promise<ResolvedProductAssetBufferResult> {
  if (!asset) {
    return {
      asset: null,
      buffer: null,
      reasonCode: "remote_image_missing",
      warning: "No image source is available for this product.",
      recoveredFromRemote: false,
    };
  }

  if (asset.storage_bucket && asset.storage_path) {
    const storedBuffer = await downloadStorageBuffer(asset.storage_bucket, asset.storage_path);

    if (storedBuffer) {
      const normalizedStoredBuffer = await normalizePdfRenderableImageBuffer(storedBuffer);

      if (normalizedStoredBuffer.buffer) {
        return {
          asset,
          buffer: normalizedStoredBuffer.buffer,
          reasonCode: null,
          warning: null,
          recoveredFromRemote: false,
        };
      }

      if (!asset.image_url) {
        return {
          asset,
          buffer: null,
          reasonCode: "invalid_image",
          warning:
            normalizedStoredBuffer.warning
            ?? "Stored image could not be prepared for PDF export.",
          recoveredFromRemote: false,
        };
      }
    } else if (!asset.image_url) {
      return {
        asset,
        buffer: null,
        reasonCode: "download_failed",
        warning: "Stored image could not be downloaded for PDF export.",
        recoveredFromRemote: false,
      };
    }
  }

  if (!asset.image_url) {
    return {
      asset,
      buffer: null,
      reasonCode: "remote_image_missing",
      warning: "No image source is available for this product.",
      recoveredFromRemote: false,
    };
  }

  const admin = getAdminClientOrThrow();
  const recovered = await ensureProductAssetStorageBacked(admin, asset);

  return {
    asset: recovered.asset,
    buffer: recovered.buffer,
    reasonCode: recovered.reasonCode,
    warning: recovered.warning,
    recoveredFromRemote: recovered.wasCached,
  };
}

export async function resolveProductAssetPreviewUrl(asset: ProductAssetRow | null) {
  if (!asset) {
    return null;
  }

  if (asset.storage_bucket && asset.storage_path) {
    const signedUrl = await createSignedStorageUrl(asset.storage_bucket, asset.storage_path, 3600);

    if (signedUrl) {
      return signedUrl;
    }
  }

  if (asset.image_url) {
    return `/api/images/proxy?url=${encodeURIComponent(asset.image_url)}`;
  }

  return null;
}

export async function resolveCatalogBackgroundBuffer(
  styleOptions: Record<string, unknown> | null | undefined,
) {
  const style = mergeCatalogStyleOptions(styleOptions);

  return resolveCatalogMediaBuffer(style.pageBackgroundImageBucket, style.pageBackgroundImagePath);
}

export async function resolveCatalogBackgroundPreviewUrl(
  styleOptions: Record<string, unknown> | null | undefined,
) {
  const style = mergeCatalogStyleOptions(styleOptions);

  return resolveCatalogMediaPreviewUrl(style.pageBackgroundImageBucket, style.pageBackgroundImagePath);
}

export async function resolveCatalogMediaBuffer(
  storageBucket: string | null | undefined,
  storagePath: string | null | undefined,
) {
  if (!storageBucket || !storagePath) {
    return null;
  }

  return downloadStorageBuffer(storageBucket, storagePath);
}

export async function resolveCatalogMediaPreviewUrl(
  storageBucket: string | null | undefined,
  storagePath: string | null | undefined,
) {
  if (!storageBucket || !storagePath) {
    return null;
  }

  return createSignedStorageUrl(storageBucket, storagePath, 3600);
}

export async function uploadCatalogBackgroundAsset(args: {
  jobId: string;
  userId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
}) {
  return uploadCatalogJobMediaAsset({
    ...args,
    slot: "page-background",
  });
}

export async function uploadCatalogJobMediaAsset(args: {
  jobId: string;
  userId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  slot: CatalogJobMediaSlot;
}) {
  const admin = getAdminClientOrThrow();
  const job = await ensureJobAccess(admin, args.jobId, args.userId);
  const target = args.slot === "page-background"
    ? buildCatalogBackgroundTarget(args.userId, job.id, args.fileName)
    : buildCatalogJobMediaTarget(args.userId, job.id, args.slot, args.fileName);
  const uploadResponse = await admin.storage.from(target.bucket).upload(target.path, args.fileBuffer, {
    contentType: args.contentType,
    upsert: false,
  });

  if (uploadResponse.error) {
    throw uploadResponse.error;
  }

  return {
    storageBucket: target.bucket,
    storagePath: target.path,
  };
}

export async function attachManualAssetToItem(args: {
  userId: string;
  itemId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  saveManualMapping: boolean;
}) {
  const admin = getAdminClientOrThrow();
  const itemResponse = await admin
    .from("catalog_items")
    .select("*")
    .eq("id", args.itemId)
    .maybeSingle();
  const item = asRow<CatalogItemRow | null>(itemResponse.data);

  if (!item) {
    throw new Error("Catalog item not found.");
  }

  const job = await ensureJobAccess(admin, item.job_id, args.userId);
  let contentType: "image/png" | "image/jpeg";

  try {
    ({ contentType } = validatePdfRenderableImageBuffer(args.fileBuffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Uploaded image is invalid.";

    if (message === "Manual uploads must be a valid PNG or JPEG image.") {
      throw new Error(message);
    }

    throw new Error("Uploaded image could not be processed. Please use a valid PNG or JPEG image.");
  }

  const target = buildManualAssetTarget(args.userId, job.id, item.id, args.fileName);
  const uploadResponse = await admin.storage
    .from(target.bucket)
    .upload(target.path, args.fileBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadResponse.error) {
    throw uploadResponse.error;
  }

  const assetResponse = await admin
    .from("product_assets")
    .insert({
      source: "manual_upload",
      source_product_id: null,
      sku: item.sku,
      normalized_sku: item.normalized_sku,
      product_name: item.product_name,
      normalized_name: item.normalized_name,
      storage_bucket: target.bucket,
      storage_path: target.path,
      image_url: null,
      fetched_at: new Date().toISOString(),
        metadata_json: asJson({
          uploadedBy: args.userId,
          originalFileName: args.fileName,
          validatedContentType: contentType,
        }),
      })
    .select("*")
    .single();
  const asset = asRow<ProductAssetRow | null>(assetResponse.data);

  if (assetResponse.error || !asset) {
    throw assetResponse.error ?? new Error("Could not create manual asset record.");
  }

  await approveCatalogItem({
    userId: args.userId,
    itemId: item.id,
    assetId: asset.id,
    saveManualMapping: args.saveManualMapping,
  });

  return asset.id;
}

export async function markJobStatus(
  jobId: string,
  userId: string,
  status: Database["public"]["Enums"]["catalog_job_status"],
  errorMessage?: string,
) {
  const admin = getAdminClientOrThrow();
  await ensureJobAccess(admin, jobId, userId);

  await admin
    .from("catalog_jobs")
    .update({
      status,
      error_message: errorMessage ?? null,
      started_at: status === "generating_pdf" ? new Date().toISOString() : undefined,
    })
    .eq("id", jobId);
}

export async function beginPdfGeneration(jobId: string, userId: string) {
  const admin = getAdminClientOrThrow();
  await ensureJobAccess(admin, jobId, userId);

  const response = await admin
    .from("catalog_jobs")
    .update({
      status: "generating_pdf",
      error_message: null,
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .neq("status", "generating_pdf")
    .select("id")
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return Boolean(response.data?.id);
}

export async function getJobStatus(jobId: string, userId: string) {
  const admin = getAdminClientOrThrow();
  const job = await ensureJobAccess(admin, jobId, userId);

  const [itemsResponse, eventsResponse] = await Promise.all([
    admin.from("catalog_items").select("id, match_status").eq("job_id", jobId),
    admin
      .from("catalog_job_events")
      .select("step, message, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items = asRows<Pick<CatalogItemRow, "id" | "match_status">>(itemsResponse.data);
  const events = asRows<Pick<EventRow, "step" | "message" | "created_at">>(eventsResponse.data);
  const matchedCount = items.filter((i) => i.match_status !== "pending").length;
  const reviewCount = items.filter((i) => i.match_status === "needs_review").length;

  return {
    jobName: job.job_name,
    status: job.status,
    totalCount: items.length,
    matchedCount,
    reviewCount,
    events,
  };
}

export async function bulkApproveCatalogItems(args: {
  userId: string;
  jobId: string;
  minConfidence?: number;
  itemIds?: string[];
}) {
  const admin = getAdminClientOrThrow();
  await ensureJobAccess(admin, args.jobId, args.userId);

  let query = admin
    .from("catalog_items")
    .select("id, selected_asset_id, match_status, confidence, job_id")
    .eq("job_id", args.jobId);

  if (args.itemIds?.length) {
    query = query.in("id", args.itemIds);
  }

  const itemsResponse = await query;
  let candidates = asRows<
    Pick<CatalogItemRow, "id" | "selected_asset_id" | "match_status" | "confidence" | "job_id">
  >(itemsResponse.data).filter(
    (candidate) => candidate.match_status === "needs_review" && Boolean(candidate.selected_asset_id),
  );
  if (args.minConfidence != null) {
    candidates = candidates.filter((candidate) => (candidate.confidence ?? 0) >= args.minConfidence!);
  }

  if (!candidates.length) return { approved: 0 };

  await admin
    .from("catalog_items")
    .update({ match_status: "approved", review_note: "Bulk approved." })
    .in("id", candidates.map((candidate) => candidate.id));

  const job = await ensureJobAccess(admin, args.jobId, args.userId);
  await syncCatalogJobReviewState(admin, job);

  await appendJobEvent(args.jobId, "review", `Bulk approved ${candidates.length} item(s).`, {
    approved: candidates.length,
    minConfidence: args.minConfidence,
  });

  return { approved: candidates.length };
}

export async function updateCatalogItemFields(
  userId: string,
  itemId: string,
  fields: {
    displayName?: string | null;
    normalPrice?: number | null;
    promoPrice?: number | null;
    packSize?: string | null;
    unit?: string | null;
  },
) {
  const admin = getAdminClientOrThrow();
  const itemResponse = await admin
    .from("catalog_items")
    .select(
      "id, job_id, display_name_override, normal_price, promo_price, discount_amount, discount_percent, pack_size, unit",
    )
    .eq("id", itemId)
    .maybeSingle();
  const item = asRow<Pick<
    CatalogItemRow,
    | "id"
    | "job_id"
    | "display_name_override"
    | "normal_price"
    | "promo_price"
    | "discount_amount"
    | "discount_percent"
    | "pack_size"
    | "unit"
  > | null>(itemResponse.data);

  if (!item) throw new Error("Catalog item not found.");

  await ensureJobAccess(admin, item.job_id, userId);

  const update: Record<string, unknown> = {};
  if ("displayName" in fields) update.display_name_override = fields.displayName?.trim() || null;
  if ("packSize" in fields) update.pack_size = fields.packSize?.trim() || null;
  if ("unit" in fields) update.unit = fields.unit?.trim() || null;

  if ("normalPrice" in fields || "promoPrice" in fields) {
    const pricing = deriveCatalogPricing({
      normalPrice: "normalPrice" in fields ? fields.normalPrice : item.normal_price,
      promoPrice: "promoPrice" in fields ? fields.promoPrice : item.promo_price,
    });

    update.normal_price = pricing.normalPrice;
    update.promo_price = pricing.promoPrice;
    update.discount_amount = pricing.discountAmount;
    update.discount_percent = pricing.discountPercent;
  }

  if (!Object.keys(update).length) {
    return toCatalogItemCanonicalFields(item);
  }

  const updateResponse = await admin
    .from("catalog_items")
    .update(update)
    .eq("id", itemId)
    .select(
      "display_name_override, normal_price, promo_price, discount_amount, discount_percent, pack_size, unit",
    )
    .single();
  const updatedItem = asRow<Pick<
    CatalogItemRow,
    | "display_name_override"
    | "normal_price"
    | "promo_price"
    | "discount_amount"
    | "discount_percent"
    | "pack_size"
    | "unit"
  > | null>(updateResponse.data);

  if (updateResponse.error || !updatedItem) {
    throw updateResponse.error ?? new Error("Could not update catalog item.");
  }

  return toCatalogItemCanonicalFields(updatedItem);
}

export function getChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function isPdfFileReady(files: GeneratedFileRow[]) {
  return files.some((file) => file.file_type === "generated_pdf");
}

export function getLatestPdfFile(files: GeneratedFileRow[]) {
  return files.find((file) => file.file_type === "generated_pdf") ?? null;
}

export function buildPdfStoragePath(userId: string, jobId: string) {
  return `${FILE_BUCKETS.generatedPdfs}/${userId}/${jobId}`;
}

export function getCandidateSearchKeywords(item: CatalogItemRow) {
  return [item.sku, item.product_name, item.pack_size].filter(Boolean).join(" ").trim();
}

export function getMappingKeyForItem(item: CatalogItemRow) {
  return item.normalized_sku ?? normalizeSku(item.sku) ?? item.product_name;
}
