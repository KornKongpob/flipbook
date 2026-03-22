import { randomUUID } from "crypto";
import { FILE_BUCKETS } from "@/lib/catalog/constants";

export type CatalogJobMediaSlot = "page-background" | "header-media" | "footer-media";

function getExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

function sanitizeStorageSegment(value: string, fallback: string, maxLength = 80) {
  const slug = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);

  return slug || fallback;
}

function sanitizeStorageExtension(extension: string) {
  return extension
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
}

export function sanitizeUploadName(fileName: string) {
  const extension = getExtension(fileName);
  const sanitizedExtension = sanitizeStorageExtension(extension);
  const baseName = extension ? fileName.slice(0, -(extension.length + 1)) : fileName;
  const slug = sanitizeStorageSegment(baseName, "file");

  return sanitizedExtension ? `${slug}.${sanitizedExtension}` : slug;
}

export function buildRawUploadTarget(userId: string, jobId: string, fileName: string) {
  return {
    bucket: FILE_BUCKETS.rawUploads,
    path: `${userId}/${jobId}/${Date.now()}-${sanitizeUploadName(fileName)}`,
  };
}

export function buildGeneratedPdfTarget(userId: string, jobId: string, version = 1) {
  return {
    bucket: FILE_BUCKETS.generatedPdfs,
    path: `${userId}/${jobId}/catalog-v${version}.pdf`,
  };
}

export function buildManualAssetTarget(
  userId: string,
  jobId: string,
  itemId: string,
  fileName: string,
) {
  return {
    bucket: FILE_BUCKETS.manualAssets,
    path: `${userId}/${jobId}/${itemId}/${randomUUID()}-${sanitizeUploadName(fileName)}`,
  };
}

export function buildCatalogBackgroundTarget(userId: string, jobId: string, fileName: string) {
  return buildCatalogJobMediaTarget(userId, jobId, "page-background", fileName);
}

export function buildCatalogJobMediaTarget(
  userId: string,
  jobId: string,
  slot: CatalogJobMediaSlot,
  fileName: string,
) {
  return {
    bucket: FILE_BUCKETS.manualAssets,
    path: `${userId}/${jobId}/${slot}/${randomUUID()}-${sanitizeUploadName(fileName)}`,
  };
}

export function buildAssetCacheTarget(key: string, fileName = "asset.jpg") {
  return {
    bucket: FILE_BUCKETS.assetCache,
    path: `makro/${sanitizeStorageSegment(key, randomUUID(), 96)}/${sanitizeUploadName(fileName)}`,
  };
}
