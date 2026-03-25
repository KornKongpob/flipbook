import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import {
  normalizePdfRenderableImageBuffer,
  type PdfRenderableImageFormat,
} from "@/lib/catalog/image-validation";
import type { ProviderAssetCandidate } from "@/lib/catalog/matching/makro-provider";
import { buildAssetCacheTarget } from "@/lib/catalog/storage";
import { normalizeSku } from "@/lib/utils";

type AdminClient = SupabaseClient<Database>;
type ProductAssetRow = Database["public"]["Tables"]["product_assets"]["Row"];

export type ProductAssetImageReasonCode =
  | "remote_image_missing"
  | "download_failed"
  | "invalid_image"
  | "cache_upload_failed";

interface ProductAssetIdentifierMetadata {
  publicSku?: string | null;
  makroId?: string | null;
  productCode?: string | null;
  providerSku?: string | null;
}

interface ProductAssetMetadataRecord extends Record<string, unknown> {
  identifiers?: ProductAssetIdentifierMetadata;
}

export interface ProductAssetIdentifiers {
  publicSku: string | null;
  makroId: string | null;
  productCode: string | null;
  providerSku: string | null;
}

export interface ProductAssetStorageRecoveryResult {
  asset: ProductAssetRow;
  buffer: Buffer | null;
  contentType: "image/png" | "image/jpeg" | null;
  format: PdfRenderableImageFormat | null;
  reasonCode: ProductAssetImageReasonCode | null;
  warning: string | null;
  wasCached: boolean;
}

const REMOTE_IMAGE_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  accept: "image/webp,image/avif,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8",
  referer: "https://www.makro.pro/",
  "accept-language": "th-TH,th;q=0.9,en;q=0.8",
} as const;

function asRow<T>(value: unknown) {
  return (value ?? null) as T;
}

function asJson(value: unknown) {
  return value as Json;
}

function toMetadataRecord(value: Json | null): ProductAssetMetadataRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as ProductAssetMetadataRecord) };
}

function dedupeNormalizedValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeSku(value);

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    normalizedValues.push(normalized);
  });

  return normalizedValues;
}

export function getProviderAssetIdentifiers(candidate: Pick<
  ProviderAssetCandidate,
  "sku" | "makroId" | "productCode" | "providerSku"
>): ProductAssetIdentifiers {
  return {
    publicSku: candidate.sku ?? candidate.makroId ?? candidate.productCode ?? candidate.providerSku ?? null,
    makroId: candidate.makroId ?? null,
    productCode: candidate.productCode ?? null,
    providerSku: candidate.providerSku ?? null,
  };
}

export function getProviderAssetSkuVariants(candidate: Pick<
  ProviderAssetCandidate,
  "sku" | "makroId" | "productCode" | "providerSku" | "sourceProductId"
>) {
  const identifiers = getProviderAssetIdentifiers(candidate);

  return dedupeNormalizedValues([
    identifiers.publicSku,
    identifiers.makroId,
    identifiers.productCode,
    identifiers.providerSku,
    candidate.sourceProductId,
  ]);
}

export function getProductAssetIdentifiers(asset: Pick<
  ProductAssetRow,
  "sku" | "metadata_json"
>): ProductAssetIdentifiers {
  const metadata = toMetadataRecord(asset.metadata_json);
  const identifiers = metadata.identifiers ?? {};

  return {
    publicSku: identifiers.publicSku ?? asset.sku ?? null,
    makroId: identifiers.makroId ?? null,
    productCode: identifiers.productCode ?? null,
    providerSku: identifiers.providerSku ?? null,
  };
}

export function getProductAssetSkuVariants(asset: Pick<
  ProductAssetRow,
  "sku" | "normalized_sku" | "source_product_id" | "metadata_json"
>) {
  const identifiers = getProductAssetIdentifiers(asset);

  return dedupeNormalizedValues([
    asset.normalized_sku,
    asset.sku,
    asset.source_product_id,
    identifiers.publicSku,
    identifiers.makroId,
    identifiers.productCode,
    identifiers.providerSku,
  ]);
}

function buildMakroAssetMetadata(
  candidate: ProviderAssetCandidate,
  existingMetadataJson: Json | null,
) {
  const existingMetadata = toMetadataRecord(existingMetadataJson);
  const identifiers = getProviderAssetIdentifiers(candidate);

  return {
    ...existingMetadata,
    ...candidate.metadata,
    identifiers: {
      ...(existingMetadata.identifiers ?? {}),
      publicSku: identifiers.publicSku,
      makroId: identifiers.makroId,
      productCode: identifiers.productCode,
      providerSku: identifiers.providerSku,
    },
  };
}

function getCacheKey(asset: Pick<
  ProductAssetRow,
  "id" | "sku" | "source_product_id" | "product_name" | "metadata_json"
>) {
  const identifiers = getProductAssetIdentifiers(asset);

  return asset.source_product_id
    ?? identifiers.makroId
    ?? identifiers.publicSku
    ?? identifiers.productCode
    ?? identifiers.providerSku
    ?? asset.product_name
    ?? asset.id;
}

export async function ensureProductAssetStorageBacked(
  admin: AdminClient,
  asset: ProductAssetRow,
): Promise<ProductAssetStorageRecoveryResult> {
  if (!asset.image_url) {
    return {
      asset,
      buffer: null,
      contentType: null,
      format: null,
      reasonCode: "remote_image_missing",
      warning: "No remote image URL is available for this product.",
      wasCached: false,
    };
  }

  const response = await fetch(asset.image_url, {
    headers: REMOTE_IMAGE_HEADERS,
  }).catch(() => null);

  if (!response?.ok) {
    return {
      asset,
      buffer: null,
      contentType: null,
      format: null,
      reasonCode: "download_failed",
      warning: response
        ? `Image download failed with HTTP ${response.status}.`
        : "Image download failed before the remote server responded.",
      wasCached: false,
    };
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());

  if (sourceBuffer.length < 512) {
    return {
      asset,
      buffer: null,
      contentType: null,
      format: null,
      reasonCode: "invalid_image",
      warning: "The remote image was empty or incomplete.",
      wasCached: false,
    };
  }

  const normalized = await normalizePdfRenderableImageBuffer(sourceBuffer);

  if (!normalized.buffer || !normalized.contentType || !normalized.format) {
    return {
      asset,
      buffer: null,
      contentType: null,
      format: null,
      reasonCode: "invalid_image",
      warning: normalized.warning ?? "Image could not be prepared for PDF export.",
      wasCached: false,
    };
  }

  const extension = normalized.format === "png" ? "png" : "jpg";
  const target = buildAssetCacheTarget(getCacheKey(asset), `asset.${extension}`);
  const uploadResponse = await admin.storage
    .from(target.bucket)
    .upload(target.path, normalized.buffer, {
      contentType: normalized.contentType,
      upsert: true,
    });

  if (uploadResponse.error) {
    return {
      asset,
      buffer: normalized.buffer,
      contentType: normalized.contentType,
      format: normalized.format,
      reasonCode: "cache_upload_failed",
      warning: uploadResponse.error.message,
      wasCached: false,
    };
  }

  const metadata = toMetadataRecord(asset.metadata_json);
  const updateResponse = await admin
    .from("product_assets")
    .update({
      storage_bucket: target.bucket,
      storage_path: target.path,
      fetched_at: new Date().toISOString(),
      metadata_json: asJson({
        ...metadata,
        cachedImage: {
          updatedAt: new Date().toISOString(),
          contentType: normalized.contentType,
          format: normalized.format,
        },
      }),
    })
    .eq("id", asset.id)
    .select("*")
    .single();

  const updatedAsset = updateResponse.error
    ? asset
    : asRow<ProductAssetRow | null>(updateResponse.data) ?? asset;

  return {
    asset: updatedAsset,
    buffer: normalized.buffer,
    contentType: normalized.contentType,
    format: normalized.format,
    reasonCode: null,
    warning: null,
    wasCached: true,
  };
}

export async function upsertMakroProductAsset(
  admin: AdminClient,
  candidate: ProviderAssetCandidate,
) {
  const payload = {
    source: "makro" as const,
    source_product_id: candidate.sourceProductId,
    sku: candidate.sku,
    normalized_sku: candidate.normalizedSku,
    product_name: candidate.productName,
    normalized_name: candidate.normalizedName,
    product_url: candidate.productUrl,
    image_url: candidate.imageUrl,
    fetched_at: new Date().toISOString(),
  };

  const existingResponse = candidate.sourceProductId
    ? await admin
        .from("product_assets")
        .select("*")
        .eq("source", "makro")
        .eq("source_product_id", candidate.sourceProductId)
        .maybeSingle()
    : { data: null, error: null };
  const existing = asRow<ProductAssetRow | null>(existingResponse.data);
  const metadataJson = asJson(buildMakroAssetMetadata(candidate, existing?.metadata_json ?? null));

  const assetResponse = existing
    ? await admin
        .from("product_assets")
        .update({
          ...payload,
          metadata_json: metadataJson,
        })
        .eq("id", existing.id)
        .select("*")
        .single()
    : await admin
        .from("product_assets")
        .insert({
          ...payload,
          metadata_json: metadataJson,
        })
        .select("*")
        .single();

  const asset = asRow<ProductAssetRow | null>(assetResponse.data);

  if (assetResponse.error || !asset) {
    throw assetResponse.error ?? new Error("Could not upsert product asset.");
  }

  if (asset.image_url && (!asset.storage_bucket || !asset.storage_path)) {
    const recovered = await ensureProductAssetStorageBacked(admin, asset);
    return recovered.asset;
  }

  return asset;
}
