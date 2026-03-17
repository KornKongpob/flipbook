import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseWorkbookBuffer } from "@/lib/catalog/excel";
import { runMatchingForJob } from "@/lib/catalog/matching/service";
import {
  buildGeneratedPdfTarget,
  buildManualAssetTarget,
  buildRawUploadTarget,
} from "@/lib/catalog/storage";
import { FILE_BUCKETS } from "@/lib/catalog/constants";
import { normalizeSku } from "@/lib/utils";

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

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function asRow<T>(value: unknown) {
  return (value ?? null) as T;
}

function asRows<T>(value: unknown) {
  return ((value ?? []) as T[]) ?? [];
}

function asJson(value: unknown) {
  return value as Json;
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

  const itemIdsResponse = await admin
    .from("catalog_items")
    .select("id")
    .eq("job_id", job.id);
  const itemIds = asRows<{ id: string }>(itemIdsResponse.data).map((item) => item.id);

  const [templateResponse, itemsResponse, candidatesResponse, filesResponse, flipbookResponse, eventsResponse] =
    await Promise.all([
      job.template_id
        ? admin.from("catalog_templates").select("*").eq("id", job.template_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      admin
        .from("catalog_items")
        .select("*")
        .eq("job_id", job.id)
        .order("display_order", { ascending: true }),
      admin
        .from("product_match_candidates")
        .select("*")
        .in("item_id", itemIds.length ? itemIds : [EMPTY_UUID]),
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

  if (itemsResponse.error) {
    throw itemsResponse.error;
  }

  if (candidatesResponse.error) {
    throw candidatesResponse.error;
  }

  if (filesResponse.error) {
    throw filesResponse.error;
  }

  if (flipbookResponse.error) {
    throw flipbookResponse.error;
  }

  if (eventsResponse.error) {
    throw eventsResponse.error;
  }

  const template = asRow<CatalogTemplateRow | null>(templateResponse.data);
  const items = asRows<CatalogItemRow>(itemsResponse.data);
  const candidates = asRows<ProductCandidateRow>(candidatesResponse.data);
  const files = asRows<GeneratedFileRow>(filesResponse.data);
  const flipbook = asRow<FlipbookRow | null>(flipbookResponse.data);
  const events = asRows<EventRow>(eventsResponse.data);

  const assetIds = [
    ...items.map((item) => item.selected_asset_id).filter(Boolean),
    ...candidates.map((candidate) => candidate.asset_id),
  ] as string[];

  const assetResponse = assetIds.length
    ? await admin.from("product_assets").select("*").in("id", [...new Set(assetIds)])
    : { data: [], error: null };

  if (assetResponse.error) {
    throw assetResponse.error;
  }

  const assets = asRows<ProductAssetRow>(assetResponse.data);
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
  styleOptions: Record<string, unknown>,
) {
  const admin = getAdminClientOrThrow();
  await ensureJobAccess(admin, jobId, userId);

  await admin
    .from("catalog_jobs")
    .update({
      style_options_json: asJson(styleOptions),
    })
    .eq("id", jobId);

  await appendJobEvent(jobId, "style", "Updated catalog style options.", styleOptions);
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

  const reviewResponse = await admin
    .from("catalog_items")
    .select("id, match_status")
    .eq("job_id", job.id);
  const reviewRows = asRows<Pick<CatalogItemRow, "id" | "match_status">>(reviewResponse.data);
  const reviewRequiredCount = reviewRows.filter(
    (entry) => entry.match_status === "needs_review",
  ).length;

  await admin
    .from("catalog_jobs")
    .update({
      review_required_count: reviewRequiredCount,
      status: reviewRequiredCount > 0 ? "needs_review" : "ready_to_generate",
    })
    .eq("id", job.id);

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

  await appendJobEvent(jobId, "pdf", "Generated the catalog PDF.", { pageCount });
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

export async function resolveProductAssetBuffer(asset: ProductAssetRow | null) {
  if (!asset) {
    return null;
  }

  if (asset.storage_bucket && asset.storage_path) {
    const admin = getAdminClientOrThrow();
    const downloadResponse = await admin.storage
      .from(asset.storage_bucket)
      .download(asset.storage_path);

    if (!downloadResponse.error && downloadResponse.data) {
      return Buffer.from(await downloadResponse.data.arrayBuffer());
    }
  }

  if (asset.image_url) {
    const response = await fetch(asset.image_url).catch(() => null);

    if (response?.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  return null;
}

export async function resolveProductAssetPreviewUrl(asset: ProductAssetRow | null) {
  if (!asset) {
    return null;
  }

  if (asset.image_url) {
    return asset.image_url;
  }

  if (asset.storage_bucket && asset.storage_path) {
    const admin = getAdminClientOrThrow();
    const signedUrlResponse = await admin.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, 3600);

    if (!signedUrlResponse.error) {
      return signedUrlResponse.data?.signedUrl ?? null;
    }
  }

  return null;
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
  const target = buildManualAssetTarget(args.userId, job.id, item.id, args.fileName);
  const uploadResponse = await admin.storage
    .from(target.bucket)
    .upload(target.path, args.fileBuffer, {
      contentType: args.contentType,
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
