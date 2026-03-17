import type {
  CatalogItemStatus,
  CatalogJobStatus,
  FlipbookMode,
} from "@/lib/database.types";

export const FILE_BUCKETS = {
  rawUploads: "raw-uploads",
  assetCache: "asset-cache",
  generatedPdfs: "generated-pdfs",
  manualAssets: "manual-assets",
} as const;

export const PRODUCTS_PER_PAGE = 9;
export const PAGE_GRID = {
  columns: 3,
  rows: 3,
};

export const MATCH_THRESHOLDS = {
  autoApprove: 0.9,
  needsReview: 0.65,
};

export const DEFAULT_STYLE_OPTIONS = {
  variant: "promo",
  showNormalPrice: true,
  showPromoPrice: true,
  showDiscountAmount: true,
  showDiscountPercent: false,
  showSku: true,
  showPackSize: true,
} as const;

export const JOB_STATUS_META: Record<
  CatalogJobStatus,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  uploaded: { label: "Uploaded", tone: "neutral" },
  parsing: { label: "Parsing", tone: "neutral" },
  matching: { label: "Matching", tone: "neutral" },
  needs_review: { label: "Needs review", tone: "warning" },
  ready_to_generate: { label: "Ready", tone: "success" },
  generating_pdf: { label: "Generating PDF", tone: "neutral" },
  pdf_ready: { label: "PDF ready", tone: "success" },
  converting_flipbook: { label: "Converting flipbook", tone: "neutral" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const ITEM_STATUS_META: Record<
  CatalogItemStatus,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  pending: { label: "Pending", tone: "neutral" },
  matched: { label: "Matched", tone: "success" },
  needs_review: { label: "Needs review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  rendered: { label: "Rendered", tone: "success" },
};

export const FLIPBOOK_MODE_OPTIONS: Array<{
  value: FlipbookMode;
  label: string;
  description: string;
}> = [
  {
    value: "manual",
    label: "Manual upload",
    description: "Generate the PDF and upload it to Heyzine manually.",
  },
  {
    value: "client_id",
    label: "Heyzine client_id",
    description: "Call Heyzine conversion endpoints only when a client ID is configured.",
  },
  {
    value: "disabled",
    label: "No flipbook",
    description: "Skip flipbook handling and keep a PDF-only workflow.",
  },
];
