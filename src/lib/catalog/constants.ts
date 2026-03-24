import type {
  CatalogItemStatus,
  CatalogJobStatus,
  FlipbookMode,
} from "@/lib/database.types";
import type { CatalogLayoutPreset } from "@/lib/catalog/layout";
import type { CatalogStyleOptions } from "@/lib/catalog/style-options";

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

export const DEFAULT_LAYOUT_PRESET: CatalogLayoutPreset = "3x3";

export const DEFAULT_STYLE_OPTIONS: CatalogStyleOptions = {
  variant: "promo",
  flyerType: "promo",
  layoutPreset: DEFAULT_LAYOUT_PRESET,
  baseFontSize: 13,
  showNormalPrice: true,
  showPromoPrice: true,
  showDiscountAmount: true,
  showDiscountPercent: false,
  showBarcode: false,
  showDates: true,
  showSku: true,
  showPackSize: true,
  promoStartDate: null,
  promoEndDate: null,
  pageBackgroundColor: "#fff8f2",
  pageBackgroundImageBucket: null,
  pageBackgroundImagePath: null,
  pageBackgroundFit: "cover",
  pageBackgroundOpacity: 0.22,
  pageBackgroundOffsetX: 0,
  pageBackgroundOffsetY: 0,
  pageBackgroundScale: 1,
  pageBackgroundAnchor: "page",
  headerMediaBucket: null,
  headerMediaPath: null,
  headerMediaFit: "cover",
  headerMediaOpacity: 1,
  headerMediaOffsetX: 0,
  headerMediaOffsetY: 0,
  headerMediaScale: 1,
  footerMediaBucket: null,
  footerMediaPath: null,
  footerMediaFit: "cover",
  footerMediaOpacity: 1,
  footerMediaOffsetX: 0,
  footerMediaOffsetY: 0,
  footerMediaScale: 1,
  pagePadding: 18,
  pageGap: 12,
  headerSpace: 120,
  footerSpace: 44,
  cardPadding: 12,
  cardRadius: 18,
  imageAreaHeight: 88,
  cardImageFit: "contain",
  cardImageScale: 1.12,
  titleFontSize: 13,
  skuFontSize: 11,
  promoPriceFontSize: 28,
  normalPriceFontSize: 12,
  cardBackgroundColor: "#ffffff",
  cardBorderColor: "#eedbcf",
  imageBackgroundColor: "#fff5ef",
  titleColor: "#211914",
  metaColor: "#75675a",
  promoPriceColor: "#e60000",
  normalPriceColor: "#98816a",
  discountBadgeBackgroundColor: "#ffc107",
  discountBadgeTextColor: "#a81a05",
};

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
    value: "client_id",
    label: "Auto to Heyzine",
    description: "Automatically upload and create a digital flipbook on Heyzine using your API key.",
  },
  {
    value: "manual",
    label: "Manual Upload",
    description: "Generate the PDF only. You will download and upload it to Heyzine yourself.",
  },
  {
    value: "disabled",
    label: "Skip Flipbook",
    description: "I only want the PDF. Don't show flipbook buttons in the result page.",
  },
];
