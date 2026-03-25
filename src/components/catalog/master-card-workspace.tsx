"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { saveStyleOptionsAction } from "@/app/(app)/actions";
import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";
import { CatalogPageCanvas, type CatalogPageCanvasResolvedCardPreviewSize } from "@/components/catalog/catalog-page-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBanner } from "@/components/ui/status-banner";
import { SurfaceCard, SurfaceCardBody, SurfaceCardHeader } from "@/components/ui/surface-card";
import {
  createDefaultCatalogMasterCardElementLayout,
  createDefaultCatalogMasterCardLayout,
  CATALOG_CARD_ELEMENT_KEYS,
  type CatalogCardElementKey,
  type CatalogMasterCardElementLayout,
  type CatalogMasterCardLayout,
  type CatalogResolvedCardElementRects,
} from "@/lib/catalog/master-card-layout";
import {
  CATALOG_A4_PAGE_HEIGHT,
  CATALOG_A4_PAGE_WIDTH,
  getCatalogItemsPerPage,
  resolveCatalogPageLayout,
} from "@/lib/catalog/layout";
import type { FlyerType } from "@/lib/database.types";
import { buildCatalogStyleFormData, serializeStyleFormData } from "@/lib/catalog/style-form-data";
import type { CatalogLayoutVariant, EditorCatalogStyleOptions } from "@/lib/catalog/style-options";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Grip,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";

interface MasterCardItem {
  id: string;
  productName: string;
  displayName: string | null;
  sku: string | null;
  packSize: string | null;
  unit: string | null;
  normalPrice: number | null;
  promoPrice: number | null;
  discountAmount: number | null;
  discountPercent: number | null;
  previewUrl: string | null;
  isVisible: boolean;
  displayOrder: number;
}

const ELEMENT_LABELS: Record<CatalogCardElementKey, { label: string; rectKey: keyof CatalogResolvedCardElementRects }> = {
  image: { label: "Image", rectKey: "imageRect" },
  discountBadge: { label: "Discount badge", rectKey: "badgeRect" },
  title: { label: "Title", rectKey: "titleRect" },
  meta: { label: "Meta", rectKey: "metaRect" },
  promoPrice: { label: "Promo price", rectKey: "promoPriceRect" },
  normalPrice: { label: "Normal price", rectKey: "normalPriceRect" },
  discountPercent: { label: "Discount %", rectKey: "discountPercentRect" },
  singlePrice: { label: "Single price", rectKey: "singlePriceRect" },
  strikeLine: { label: "Strike line", rectKey: "strikeLineRect" },
};

const MASTER_CARD_GRID_SIZE = 8;
const MASTER_CARD_TARGET_PREVIEW_WIDTH = 300;
const MASTER_CARD_MAX_PREVIEW_WIDTH = 360;
const MASTER_CARD_MAX_EDITOR_CANVAS_ZOOM = 4;
const MASTER_CARD_FOCUSED_COMPARE_WIDTH = 280;
const MASTER_CARD_FOCUSED_COMPARE_MAX_WIDTH = 320;
const GRID_SIZE_OPTIONS = [8, 12, 16] as const;
const NUDGE_STEP_OPTIONS = [2, 4, 8] as const;
type MasterCardDisplayFieldKey =
  | "showPromoPrice"
  | "showNormalPrice"
  | "showDiscountAmount"
  | "showDiscountPercent"
  | "showSku"
  | "showPackSize"
  | "showPriceDecimals";
type MasterCardFontSizeFieldKey = "titleFontSize" | "skuFontSize" | "promoPriceFontSize" | "normalPriceFontSize";

const MASTER_CARD_DISPLAY_FIELDS: Array<{
  key: MasterCardDisplayFieldKey;
  label: string;
  description: string;
  previewLabel: string;
}> = [
  {
    key: "showPromoPrice",
    label: "Promo price",
    description: "Controls the promo-price line and reveals the promo price box for editing.",
    previewLabel: "Promo",
  },
  {
    key: "showNormalPrice",
    label: "Regular price",
    description: "Shows the crossed regular price in promo cards and the single-price line in normal cards.",
    previewLabel: "Both",
  },
  {
    key: "showDiscountAmount",
    label: "Discount badge",
    description: "Turns the shared savings badge on or off when the selected product has a discount amount.",
    previewLabel: "Promo",
  },
  {
    key: "showDiscountPercent",
    label: "Percent off",
    description: "Shows the percent-off text when promo and regular price data are both active.",
    previewLabel: "Promo",
  },
  {
    key: "showSku",
    label: "SKU",
    description: "Adds the SKU into the shared meta line for every product card in this job.",
    previewLabel: "Both",
  },
  {
    key: "showPackSize",
    label: "Pack size",
    description: "Shows pack size in the meta line when the selected product has that value.",
    previewLabel: "Both",
  },
  {
    key: "showPriceDecimals",
    label: "Price decimals",
    description: "Keeps decimals visible in promo, normal, and single-price labels.",
    previewLabel: "Both",
  },
];

const MASTER_CARD_FONT_SIZE_FIELDS: Array<{
  key: MasterCardFontSizeFieldKey;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    key: "titleFontSize",
    label: "Title",
    description: "Main product name text.",
    min: 10,
    max: 24,
    step: 1,
  },
  {
    key: "skuFontSize",
    label: "Meta / SKU",
    description: "SKU, pack size, and unit line.",
    min: 8,
    max: 18,
    step: 1,
  },
  {
    key: "promoPriceFontSize",
    label: "Promo price",
    description: "Large promo price in promo cards.",
    min: 16,
    max: 40,
    step: 1,
  },
  {
    key: "normalPriceFontSize",
    label: "Regular price",
    description: "Crossed or supporting regular price text.",
    min: 8,
    max: 22,
    step: 1,
  },
];

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function asFiniteNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampAdjustment(value: number) {
  return Math.min(160, Math.max(-160, value));
}

function snapAdjustmentToGrid(value: number, step: number) {
  return Math.round(value / step) * step;
}

function getVariantFromFlyerType(flyerType: FlyerType): CatalogLayoutVariant {
  return flyerType === "normal" ? "clean" : "promo";
}

function layoutsEqual(left: CatalogMasterCardLayout, right: CatalogMasterCardLayout) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function MasterCardWorkspace({
  initialItems,
  jobId,
  initialStyle,
}: {
  initialItems: MasterCardItem[];
  jobId: string;
  initialStyle: EditorCatalogStyleOptions;
}) {
  const router = useRouter();
  const [style, setStyle] = useState<EditorCatalogStyleOptions>(initialStyle);
  const [draftLayout, setDraftLayout] = useState<CatalogMasterCardLayout>(initialStyle.masterCardLayout);
  const [selectedElement, setSelectedElement] = useState<CatalogCardElementKey>("image");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [resolvedRects, setResolvedRects] = useState<CatalogResolvedCardElementRects | null>(null);
  const [styleSaving, setStyleSaving] = useState(false);
  const [styleSaveError, setStyleSaveError] = useState<string | null>(null);
  const [styleStatusLabel, setStyleStatusLabel] = useState("All changes saved.");
  const [pageDesignPending, setPageDesignPending] = useState(false);
  const persistedStyleSignatureRef = useRef<string | null>(
    serializeStyleFormData(buildCatalogStyleFormData(jobId, initialStyle)),
  );
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [previewFlyerType, setPreviewFlyerType] = useState<FlyerType>(initialStyle.flyerType);
  const [resolvedPagePreviewCardSize, setResolvedPagePreviewCardSize] = useState<CatalogPageCanvasResolvedCardPreviewSize | null>(null);
  const gridSize = MASTER_CARD_GRID_SIZE;
  const nudgeStep = MASTER_CARD_GRID_SIZE;
  const setGridSize = useCallback((nextValue: number) => {
    void nextValue;
  }, []);
  const setNudgeStep = useCallback((nextValue: number) => {
    void nextValue;
  }, []);

  const visibleItems = useMemo(
    () => [...initialItems].sort((left, right) => left.displayOrder - right.displayOrder).filter((item) => item.isVisible),
    [initialItems],
  );
  const previewItems = visibleItems.length ? visibleItems : [...initialItems].sort((left, right) => left.displayOrder - right.displayOrder);
  const selectedItem = useMemo(() => {
    if (!previewItems.length) {
      return null;
    }

    return previewItems.find((item) => item.id === selectedItemId) ?? previewItems[0];
  }, [previewItems, selectedItemId]);
  const previewStyle = useMemo(
    () => ({
      ...style,
      flyerType: previewFlyerType,
      variant: getVariantFromFlyerType(previewFlyerType),
      masterCardLayout: draftLayout,
    }),
    [draftLayout, previewFlyerType, style],
  );
  const liveCurrentJobPreviewStyle = useMemo(
    () => ({
      ...style,
      masterCardLayout: draftLayout,
    }),
    [draftLayout, style],
  );
  const hasUnappliedChanges = useMemo(
    () => !layoutsEqual(draftLayout, style.masterCardLayout),
    [draftLayout, style.masterCardLayout],
  );
  const currentStyleSignature = serializeStyleFormData(buildCatalogStyleFormData(jobId, style));
  const hasUnsavedStyleChanges = currentStyleSignature !== persistedStyleSignatureRef.current;
  const previewItemsPerPage = useMemo(
    () => getCatalogItemsPerPage(style.layoutPreset),
    [style.layoutPreset],
  );
  const previewPageIndex = useMemo(() => {
    if (!selectedItem) {
      return 0;
    }

    const selectedIndex = previewItems.findIndex((item) => item.id === selectedItem.id);

    if (selectedIndex < 0) {
      return 0;
    }

    return Math.floor(selectedIndex / previewItemsPerPage);
  }, [previewItems, previewItemsPerPage, selectedItem]);
  const pagePreviewItems = useMemo(
    () => previewItems
      .slice(previewPageIndex * previewItemsPerPage, (previewPageIndex + 1) * previewItemsPerPage)
      .map((item) => ({
      id: item.id,
      title: item.displayName ?? item.productName,
      sku: item.sku,
      packSize: item.packSize,
      unit: item.unit,
      normalPrice: item.normalPrice,
      promoPrice: item.promoPrice,
      discountAmount: item.discountAmount,
      discountPercent: item.discountPercent,
      imageUrl: item.previewUrl,
    })),
    [previewItems, previewItemsPerPage, previewPageIndex],
  );
  const fallbackPageLayout = useMemo(
    () => resolveCatalogPageLayout(CATALOG_A4_PAGE_WIDTH, CATALOG_A4_PAGE_HEIGHT, {
      layoutPreset: style.layoutPreset,
      pagePadding: style.pagePadding,
      pageGap: style.pageGap,
      headerSpace: style.headerSpace,
      footerSpace: style.footerSpace,
    }),
    [style.footerSpace, style.headerSpace, style.layoutPreset, style.pageGap, style.pagePadding],
  );
  const editorCardBaseSize = useMemo(() => {
    if (
      resolvedPagePreviewCardSize &&
      resolvedPagePreviewCardSize.cardWidth > 0 &&
      resolvedPagePreviewCardSize.cardHeight > 0
    ) {
      return {
        width: resolvedPagePreviewCardSize.cardWidth,
        height: resolvedPagePreviewCardSize.cardHeight,
      };
    }

    return {
      width: fallbackPageLayout.cardWidth,
      height: fallbackPageLayout.cardHeight,
    };
  }, [fallbackPageLayout.cardHeight, fallbackPageLayout.cardWidth, resolvedPagePreviewCardSize]);
  const editorCanvasZoom = useMemo(() => {
    if (editorCardBaseSize.width <= 0) {
      return 1;
    }

    const targetWidth = clampNumber(
      editorCardBaseSize.width,
      MASTER_CARD_TARGET_PREVIEW_WIDTH,
      MASTER_CARD_MAX_PREVIEW_WIDTH,
    );

    const nextZoom = targetWidth / editorCardBaseSize.width;

    return clampNumber(nextZoom, 1, MASTER_CARD_MAX_EDITOR_CANVAS_ZOOM);
  }, [editorCardBaseSize.width]);
  const editorCardViewportSize = useMemo(
    () => ({
      width: editorCardBaseSize.width * editorCanvasZoom,
      height: editorCardBaseSize.height * editorCanvasZoom,
    }),
    [editorCanvasZoom, editorCardBaseSize.height, editorCardBaseSize.width],
  );
  const focusedCompareZoom = useMemo(() => {
    if (editorCardBaseSize.width <= 0) {
      return 1;
    }

    const targetWidth = clampNumber(
      editorCardBaseSize.width,
      MASTER_CARD_FOCUSED_COMPARE_WIDTH,
      MASTER_CARD_FOCUSED_COMPARE_MAX_WIDTH,
    );

    return clampNumber(targetWidth / editorCardBaseSize.width, 1, 2.4);
  }, [editorCardBaseSize.width]);
  const focusedCompareViewportSize = useMemo(
    () => ({
      width: editorCardBaseSize.width * focusedCompareZoom,
      height: editorCardBaseSize.height * focusedCompareZoom,
    }),
    [editorCardBaseSize.height, editorCardBaseSize.width, focusedCompareZoom],
  );
  const previewPageCount = Math.max(Math.ceil(previewItems.length / previewItemsPerPage), 1);
  const selectedItemPageSlotIndex = useMemo(() => {
    if (!selectedItem) {
      return 0;
    }

    const selectedIndex = pagePreviewItems.findIndex((item) => item.id === selectedItem.id);

    return selectedIndex >= 0 ? selectedIndex : 0;
  }, [pagePreviewItems, selectedItem]);
  const focusedCompareSlotRects = useMemo(
    () =>
      Array.from({ length: previewItemsPerPage }, (_, index) => {
        const column = index % fallbackPageLayout.columns;
        const row = Math.floor(index / fallbackPageLayout.columns);

        return {
          index,
          x: fallbackPageLayout.frameX + column * (fallbackPageLayout.cardWidth + fallbackPageLayout.gap),
          y: fallbackPageLayout.frameY + row * (fallbackPageLayout.cardHeight + fallbackPageLayout.gap),
          width: fallbackPageLayout.cardWidth,
          height: fallbackPageLayout.cardHeight,
        };
      }),
    [fallbackPageLayout.cardHeight, fallbackPageLayout.cardWidth, fallbackPageLayout.columns, fallbackPageLayout.frameX, fallbackPageLayout.frameY, fallbackPageLayout.gap, previewItemsPerPage],
  );
  const focusedCompareSelectedSlot = focusedCompareSlotRects[selectedItemPageSlotIndex] ?? null;
  const focusedCompareScale = useMemo(() => {
    if (editorCardBaseSize.width <= 0) {
      return 1;
    }

    return focusedCompareViewportSize.width / editorCardBaseSize.width;
  }, [editorCardBaseSize.width, focusedCompareViewportSize.width]);
  const focusedCompareViewportHeight = useMemo(
    () => clampNumber(focusedCompareViewportSize.height + 110, 340, 500),
    [focusedCompareViewportSize.height],
  );
  const focusedCompareViewportWidth = clampNumber(
    focusedCompareViewportSize.width + 52,
    MASTER_CARD_FOCUSED_COMPARE_WIDTH + 24,
    MASTER_CARD_FOCUSED_COMPARE_MAX_WIDTH + 40,
  );
  const focusedComparePageSize = useMemo(
    () => ({
      width: fallbackPageLayout.pageWidth * focusedCompareScale,
      height: fallbackPageLayout.pageHeight * focusedCompareScale,
    }),
    [fallbackPageLayout.pageHeight, fallbackPageLayout.pageWidth, focusedCompareScale],
  );
  const focusedCompareOffset = useMemo(() => {
    if (!focusedCompareSelectedSlot) {
      return { x: 0, y: 0 };
    }

    const slotCenterX = (focusedCompareSelectedSlot.x + focusedCompareSelectedSlot.width / 2) * focusedCompareScale;
    const slotCenterY = (focusedCompareSelectedSlot.y + focusedCompareSelectedSlot.height / 2) * focusedCompareScale;
    const maxTranslateX = 0;
    const minTranslateX = Math.min(focusedCompareViewportWidth - focusedComparePageSize.width, 0);
    const maxTranslateY = 0;
    const minTranslateY = Math.min(focusedCompareViewportHeight - focusedComparePageSize.height, 0);

    return {
      x: clampNumber(focusedCompareViewportWidth / 2 - slotCenterX, minTranslateX, maxTranslateX),
      y: clampNumber(focusedCompareViewportHeight / 2 - slotCenterY, minTranslateY, maxTranslateY),
    };
  }, [
    focusedComparePageSize.height,
    focusedComparePageSize.width,
    focusedCompareScale,
    focusedCompareSelectedSlot,
    focusedCompareViewportHeight,
    focusedCompareViewportWidth,
  ]);

  useEffect(() => {
    if (!selectedItemId && previewItems.length) {
      setSelectedItemId(previewItems[0].id);
      return;
    }

    if (selectedItemId && !previewItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(previewItems[0]?.id ?? null);
    }
  }, [previewItems, selectedItemId]);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  const persistStyle = useCallback(
    async (nextStyle: EditorCatalogStyleOptions, reason: "manual" | "page-design" = "manual") => {
      const formData = buildCatalogStyleFormData(jobId, nextStyle);
      const signature = serializeStyleFormData(formData);

      if (signature === persistedStyleSignatureRef.current) {
        setStyleSaveError(null);
        setStyleStatusLabel("All changes saved.");
        return true;
      }

      setStyleSaving(true);
      setStyleSaveError(null);
      setStyleStatusLabel(reason === "page-design" ? "Saving before page design…" : "Saving master card…");

      try {
        await saveStyleOptionsAction(formData);
        persistedStyleSignatureRef.current = signature;
        setStyleStatusLabel("All changes saved.");
        return true;
      } catch (error) {
        setStyleSaveError(error instanceof Error ? error.message : "Could not save master card changes.");
        setStyleStatusLabel(reason === "page-design" ? "Could not save before page design." : "Could not save master card.");
        return false;
      } finally {
        setStyleSaving(false);
      }
    },
    [jobId],
  );

  const applyDraftLayout = useCallback(() => {
    setStyle((previous) => ({
      ...previous,
      masterCardLayout: draftLayout,
    }));
    setStyleSaveError(null);
    setStyleStatusLabel("Master card applied. Save to keep changes.");
  }, [draftLayout]);

  const handleSave = useCallback(async () => {
    const nextStyle = hasUnappliedChanges
      ? {
          ...style,
          masterCardLayout: draftLayout,
        }
      : style;

    if (hasUnappliedChanges) {
      setStyle(nextStyle);
    }

    return persistStyle(nextStyle, "manual");
  }, [draftLayout, hasUnappliedChanges, persistStyle, style]);

  const handleOpenPageDesign = useCallback(async () => {
    const nextStyle = hasUnappliedChanges
      ? {
          ...style,
          masterCardLayout: draftLayout,
        }
      : style;

    if (hasUnappliedChanges) {
      setStyle(nextStyle);
    }

    setPageDesignPending(true);

    try {
      const didSaveSucceed = await persistStyle(nextStyle, "page-design");

      if (didSaveSucceed) {
        router.push(`/catalogs/${jobId}/page-design`);
      }
    } finally {
      setPageDesignPending(false);
    }
  }, [draftLayout, hasUnappliedChanges, jobId, persistStyle, router, style]);

  const updateStyleBooleanField = useCallback((key: MasterCardDisplayFieldKey, nextValue: boolean) => {
    setStyle((previous) => {
      if (previous[key] === nextValue) {
        return previous;
      }

      return {
        ...previous,
        [key]: nextValue,
      };
    });
    setStyleSaveError(null);
    setStyleStatusLabel("Master card settings updated. Save to keep changes.");
  }, []);

  const updateStyleNumberField = useCallback((key: MasterCardFontSizeFieldKey, nextValue: number) => {
    const field = MASTER_CARD_FONT_SIZE_FIELDS.find((entry) => entry.key === key);

    if (!field || !Number.isFinite(nextValue)) {
      return;
    }

    const snappedValue = Math.round(nextValue / field.step) * field.step;
    const clampedValue = clampNumber(snappedValue, field.min, field.max);

    setStyle((previous) => {
      if (previous[key] === clampedValue) {
        return previous;
      }

      return {
        ...previous,
        [key]: clampedValue,
      };
    });
    setStyleSaveError(null);
    setStyleStatusLabel("Master card settings updated. Save to keep changes.");
  }, []);

  const updateDraftLayoutEntry = useCallback(
    (
      key: CatalogCardElementKey,
      updates: Partial<CatalogMasterCardElementLayout>,
    ) => {
      setDraftLayout((previous) => ({
        ...previous,
        [key]: {
          ...previous[key],
          ...updates,
        },
      }));
    },
    [],
  );

  const updateDraftPosition = useCallback(
    (
      key: CatalogCardElementKey,
      nextX: number,
      nextY: number,
      options: { snap?: boolean } = {},
    ) => {
      const shouldSnap = options.snap ?? false;
      const resolvedX = shouldSnap ? snapAdjustmentToGrid(nextX, MASTER_CARD_GRID_SIZE) : nextX;
      const resolvedY = shouldSnap ? snapAdjustmentToGrid(nextY, MASTER_CARD_GRID_SIZE) : nextY;

      updateDraftLayoutEntry(key, {
        x: clampAdjustment(resolvedX),
        y: clampAdjustment(resolvedY),
      });
    },
    [updateDraftLayoutEntry],
  );

  const updateDraftSize = useCallback(
    (
      key: CatalogCardElementKey,
      nextWidth: number,
      nextHeight: number,
      options: { snap?: boolean } = {},
    ) => {
      const shouldSnap = options.snap ?? false;
      const resolvedWidth = shouldSnap ? snapAdjustmentToGrid(nextWidth, MASTER_CARD_GRID_SIZE) : nextWidth;
      const resolvedHeight = shouldSnap ? snapAdjustmentToGrid(nextHeight, MASTER_CARD_GRID_SIZE) : nextHeight;

      updateDraftLayoutEntry(key, {
        width: clampAdjustment(resolvedWidth),
        height: clampAdjustment(resolvedHeight),
      });
    },
    [updateDraftLayoutEntry],
  );

  const updateDraftVisibility = useCallback(
    (key: CatalogCardElementKey, nextVisible: boolean) => {
      updateDraftLayoutEntry(key, { visible: nextVisible });
    },
    [updateDraftLayoutEntry],
  );
  const nudgeSelectedElement = useCallback(
    (deltaXMultiplier: number, deltaYMultiplier: number) => {
      const elementLayout = draftLayout[selectedElement];

      updateDraftPosition(
        selectedElement,
        elementLayout.x + deltaXMultiplier * nudgeStep,
        elementLayout.y + deltaYMultiplier * nudgeStep,
      );
    },
    [draftLayout, nudgeStep, selectedElement, updateDraftPosition],
  );
  const resizeSelectedElement = useCallback(
    (deltaWidthMultiplier: number, deltaHeightMultiplier: number) => {
      const elementLayout = draftLayout[selectedElement];

      updateDraftSize(
        selectedElement,
        elementLayout.width + deltaWidthMultiplier * nudgeStep,
        elementLayout.height + deltaHeightMultiplier * nudgeStep,
      );
    },
    [draftLayout, nudgeStep, selectedElement, updateDraftSize],
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, key: CatalogCardElementKey) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElement(key);

    dragCleanupRef.current?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLayout = draftLayout[key];

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / editorCanvasZoom;
      const deltaY = (moveEvent.clientY - startY) / editorCanvasZoom;
      updateDraftPosition(key, startLayout.x + deltaX, startLayout.y + deltaY, { snap: snapToGrid });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      dragCleanupRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [draftLayout, editorCanvasZoom, snapToGrid, updateDraftPosition]);

  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, key: CatalogCardElementKey) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElement(key);

    dragCleanupRef.current?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLayout = draftLayout[key];

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / editorCanvasZoom;
      const deltaY = (moveEvent.clientY - startY) / editorCanvasZoom;
      updateDraftSize(key, startLayout.width + deltaX, startLayout.height + deltaY, { snap: snapToGrid });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      dragCleanupRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [draftLayout, editorCanvasZoom, snapToGrid, updateDraftSize]);

  const selectedLayout = draftLayout[selectedElement];
  const selectedRect = selectedElement ? resolvedRects?.[ELEMENT_LABELS[selectedElement].rectKey] ?? null : null;
  const visibleElementCount = useMemo(
    () => CATALOG_CARD_ELEMENT_KEYS.filter((key) => draftLayout[key].visible).length,
    [draftLayout],
  );
  const renderedElementCount = useMemo(
    () => CATALOG_CARD_ELEMENT_KEYS.filter((key) => Boolean(resolvedRects?.[ELEMENT_LABELS[key].rectKey])).length,
    [resolvedRects],
  );
  const enabledDisplayFieldCount = useMemo(
    () => MASTER_CARD_DISPLAY_FIELDS.filter((field) => Boolean(style[field.key])).length,
    [style],
  );
  const selectedElementRenderHint = useMemo(() => {
    if (selectedRect) {
      return null;
    }

    if (!selectedLayout.visible) {
      return "This element is hidden in the shared layout. Turn it back on to render it on the sample card.";
    }

    switch (selectedElement) {
      case "promoPrice":
        if (previewFlyerType === "normal") {
          return "Promo price only renders in Promo preview.";
        }

        if (!style.showPromoPrice) {
          return "Turn on Promo price in Card display settings to edit this element.";
        }

        return "This sample product does not currently qualify for a promo price line.";
      case "discountBadge":
        if (previewFlyerType === "normal") {
          return "Discount badge only renders in Promo preview.";
        }

        if (!style.showDiscountAmount) {
          return "Turn on Discount badge in Card display settings to edit this element.";
        }

        return "This sample product does not currently have a discount amount to show.";
      case "normalPrice":
      case "strikeLine":
        if (previewFlyerType === "normal") {
          return "This row only renders in Promo preview when both Promo price and Regular price are enabled.";
        }

        if (!style.showPromoPrice || !style.showNormalPrice) {
          return "Enable both Promo price and Regular price in Card display settings to edit this row.";
        }

        return "This sample product does not currently qualify for the crossed regular price row.";
      case "discountPercent":
        if (previewFlyerType === "normal") {
          return "Percent off only renders in Promo preview.";
        }

        if (!style.showDiscountPercent) {
          return "Turn on Percent off in Card display settings to edit this element.";
        }

        if (!style.showPromoPrice || !style.showNormalPrice) {
          return "Enable both Promo price and Regular price to render percent off.";
        }

        return "This sample product does not currently have a percent-off value to show.";
      case "singlePrice":
        if (!style.showNormalPrice) {
          return "Enable Regular price in Card display settings to render the single-price box.";
        }

        if (previewFlyerType === "promo" && style.showPromoPrice) {
          return "Single price appears when Promo price is off or when previewing the normal card.";
        }

        return `This element is not rendered in the current ${previewFlyerType} preview.`;
      case "meta":
        if (!style.showSku && !style.showPackSize && !selectedItem?.unit) {
          return "Turn on SKU or Pack size, or use a sample with a unit, to render the meta line.";
        }

        return `This element is not rendered in the current ${previewFlyerType} preview.`;
      default:
        return `This element is not rendered in the current ${previewFlyerType} preview.`;
    }
  }, [
    previewFlyerType,
    selectedElement,
    selectedItem?.unit,
    selectedLayout.visible,
    selectedRect,
    style.showDiscountAmount,
    style.showDiscountPercent,
    style.showNormalPrice,
    style.showPackSize,
    style.showPromoPrice,
    style.showSku,
  ]);

  if (!selectedItem) {
    return (
      <StatusBanner
        tone="warning"
        title="No products available for master card editing"
        description="Add or reveal at least one product before editing the shared card layout."
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[390px_minmax(0,1fr)]">
      <SurfaceCard className="overflow-hidden xl:sticky xl:top-24 xl:flex xl:min-h-[calc(100vh-8rem)] xl:max-h-[calc(100vh-8rem)] xl:flex-col">
        <SurfaceCardHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Step 3</p>
                <h2 className="mt-1 text-sm font-semibold text-foreground">Master Card Layout</h2>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styleSaveError ? "border-rose-200 bg-rose-50 text-rose-700" : styleSaving || hasUnsavedStyleChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {styleSaveError ? "Save failed" : styleSaving ? "Saving…" : hasUnsavedStyleChanges ? "Unsaved" : "Saved"}
              </span>
            </div>
            <p className="text-xs leading-5 text-muted-strong">
              Define the shared product-card structure once: move layout boxes, toggle shared elements, and manage card display plus text sizing before saving the job.
            </p>
          </div>
        </SurfaceCardHeader>
        <SurfaceCardBody className="space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:thin-scrollbar">
          {styleSaveError ? (
            <StatusBanner tone="danger" title="Could not save master card" description={styleSaveError} />
          ) : hasUnappliedChanges ? (
            <StatusBanner tone="warning" title="Draft changes not applied" description="Apply the current draft layout before saving or moving to page design. Display toggles and text sizing update live, but shared layout box changes still need Apply." />
          ) : (
            <StatusBanner tone="success" title="Master card is applied" description={styleStatusLabel} />
          )}

          <div className="rounded-2xl border border-brand/20 bg-brand-soft/10 px-4 py-3 text-[11px] leading-5 text-muted-strong">
            <p className="font-semibold text-foreground">Display settings and text size update the preview immediately.</p>
            <p className="mt-1">Position, size, and shared element visibility still belong to the layout draft, so they need Apply before Save.</p>
          </div>

          <div className="rounded-2xl border border-line bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Layout preview mode</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-strong">Switch between promo and normal previews to inspect which shared elements exist in each card mode. This does not save style changes.</p>
              </div>
              <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                {previewFlyerType === "promo" ? "Promo preview" : "Normal preview"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPreviewFlyerType("promo")}
                className={`rounded-2xl border px-3 py-3 text-left transition ${previewFlyerType === "promo" ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
              >
                <p className="text-sm font-semibold">Promo</p>
                <p className="mt-1 text-[11px] leading-5">Preview promo-price, discount badge, strike-through, and savings elements.</p>
              </button>
              <button
                type="button"
                onClick={() => setPreviewFlyerType("normal")}
                className={`rounded-2xl border px-3 py-3 text-left transition ${previewFlyerType === "normal" ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
              >
                <p className="text-sm font-semibold">Normal</p>
                <p className="mt-1 text-[11px] leading-5">Preview the simplified card with image, title, meta, and a single regular price.</p>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-strong">
              <span className="rounded-full border border-line bg-white px-2.5 py-1">{visibleElementCount} visible in shared layout</span>
              <span className="rounded-full border border-line bg-white px-2.5 py-1">{renderedElementCount} rendered in this preview</span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Card display settings</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-strong">These are job-level content toggles. They reuse the existing style settings and only need Save, not Apply.</p>
              </div>
              <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                {enabledDisplayFieldCount}/{MASTER_CARD_DISPLAY_FIELDS.length} enabled
              </span>
            </div>
            <div className="grid gap-2">
              {MASTER_CARD_DISPLAY_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line/80 bg-white px-3 py-3 text-xs text-muted-strong shadow-sm transition hover:border-brand/20 has-[:checked]:border-brand/30 has-[:checked]:bg-brand-soft/10 has-[:checked]:text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={style[field.key]}
                    onChange={(event) => updateStyleBooleanField(field.key, event.target.checked)}
                    className="mt-0.5 accent-brand"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{field.label}</p>
                      <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-medium text-muted-strong">{field.previewLabel}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5">{field.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Text sizing</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-strong">These values reuse the shared card typography settings, so the live preview and PDF stay aligned.</p>
              </div>
              <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                Live preview
              </span>
            </div>
            <div className="grid gap-3">
              {MASTER_CARD_FONT_SIZE_FIELDS.map((field) => (
                <div key={field.key} className="rounded-2xl border border-line/80 bg-slate-50/70 p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{field.label}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-strong">{field.description}</p>
                    </div>
                    <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-medium text-muted-strong">
                      {style[field.key]}px
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="size-9 shrink-0 px-0"
                      onClick={() => updateStyleNumberField(field.key, style[field.key] - field.step)}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={String(style[field.key])}
                      onChange={(event) => updateStyleNumberField(field.key, asFiniteNumber(event.target.value, style[field.key]))}
                      className="h-9 text-center text-sm"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="size-9 shrink-0 px-0"
                      onClick={() => updateStyleNumberField(field.key, style[field.key] + field.step)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-muted">Range {field.min}-{field.max}px</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Shared layout elements</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-strong">These controls belong to the shared layout draft. Select any element to move its box, resize it, or hide it from the reusable layout.</p>
              </div>
              <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                Apply required
              </span>
            </div>
            <div className="grid gap-2">
              {CATALOG_CARD_ELEMENT_KEYS.map((key) => {
                const isSelected = selectedElement === key;
                const isVisible = draftLayout[key].visible;
                const rect = resolvedRects?.[ELEMENT_LABELS[key].rectKey] ?? null;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedElement(key)}
                    className={`rounded-2xl border px-3 py-3 text-left shadow-sm transition ${isSelected ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{ELEMENT_LABELS[key].label}</p>
                      <div className="flex flex-wrap justify-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${isVisible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                          {isVisible ? "Layout on" : "Layout off"}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${rect ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                          {rect ? "On canvas" : "Off canvas"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] leading-5">
                      {!isVisible
                        ? "Hidden from the shared layout until you turn it back on."
                        : rect
                          ? `X ${draftLayout[key].x}px · Y ${draftLayout[key].y}px · W ${draftLayout[key].width}px · H ${draftLayout[key].height}px`
                          : `Not active on the current ${previewFlyerType} canvas`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Sample products</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-strong">Choose a visible product card to use as the live master-card sample while editing.</p>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto thin-scrollbar pr-1">
              {previewItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${selectedItem.id === item.id ? "border-brand/30 bg-brand-soft/15" : "border-line bg-white hover:border-brand/20"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.displayName ?? item.productName}</p>
                      <p className="mt-1 truncate text-[11px] text-muted">{item.sku ?? "No SKU"}</p>
                    </div>
                    {selectedItem.id === item.id ? <Check className="size-4 text-brand" /> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-strong">
                    <span>Normal: {formatCurrency(item.normalPrice, { showDecimals: style.showPriceDecimals })}</span>
                    <span>Promo: {formatCurrency(item.promoPrice, { showDecimals: style.showPriceDecimals })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" className="h-10 gap-2" onClick={applyDraftLayout} disabled={!hasUnappliedChanges}>
              <Sparkles className="size-4" />
              Apply layout draft
            </Button>
            <Button type="button" variant="secondary" className="h-10 gap-2" onClick={() => updateDraftLayoutEntry(selectedElement, createDefaultCatalogMasterCardElementLayout())}>
              <RefreshCw className="size-4" />
              Reset selected box
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-2"
              onClick={() => setDraftLayout(style.masterCardLayout)}
              disabled={!hasUnappliedChanges}
            >
              <RefreshCw className="size-4" />
              Discard draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-2"
              onClick={() => setDraftLayout(createDefaultCatalogMasterCardLayout())}
            >
              <RefreshCw className="size-4" />
              Reset shared layout
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" className="h-10 gap-2" onClick={() => { void handleSave(); }} disabled={styleSaving || pageDesignPending}>
              {styleSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save master card
            </Button>
            <Button type="button" variant="secondary" className="h-10 gap-2" onClick={() => { void handleOpenPageDesign(); }} disabled={styleSaving || pageDesignPending}>
              {pageDesignPending ? <Loader2 className="size-4 animate-spin" /> : <Grip className="size-4" />}
              Open Page Design
            </Button>
          </div>
        </SurfaceCardBody>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <SurfaceCard>
          <SurfaceCardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Master card canvas</p>
                <h2 className="mt-1 text-sm font-semibold text-foreground">Drag and resize the active card elements</h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                  {ELEMENT_LABELS[selectedElement].label}
                </span>
                <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                  {previewFlyerType === "promo" ? "Promo preview" : "Normal preview"}
                </span>
                <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                  Zoom {editorCanvasZoom.toFixed(2)}x
                </span>
                <button
                  type="button"
                  onClick={() => setShowGrid((previous) => !previous)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${showGrid ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
                >
                  {showGrid ? "Grid on" : "Grid off"}
                </button>
                <button
                  type="button"
                  onClick={() => setSnapToGrid((previous) => !previous)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${snapToGrid ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
                >
                  {snapToGrid ? `Snap ${MASTER_CARD_GRID_SIZE}px` : "Free drag"}
                </button>
              </div>
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody className="space-y-5">
            <div className="rounded-[28px] border border-line bg-gradient-to-br from-slate-50 via-white to-brand-soft/10 p-5">
              <div className="mx-auto flex max-w-[430px] justify-center">
                <div
                  className="relative shrink-0"
                  style={{
                    width: `${editorCardViewportSize.width}px`,
                    height: `${editorCardViewportSize.height}px`,
                  }}
                >
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      width: `${editorCardBaseSize.width}px`,
                      height: `${editorCardBaseSize.height}px`,
                      transform: `scale(${editorCanvasZoom})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <CatalogCardPreview
                      title={selectedItem.displayName ?? selectedItem.productName}
                      sku={selectedItem.sku}
                      packSize={selectedItem.packSize}
                      unit={selectedItem.unit}
                      normalPrice={selectedItem.normalPrice}
                      promoPrice={selectedItem.promoPrice}
                      discountAmount={selectedItem.discountAmount}
                      discountPercent={selectedItem.discountPercent}
                      imageUrl={selectedItem.previewUrl}
                      options={previewStyle}
                      onResolvedElementRects={setResolvedRects}
                    />

                    {showGrid ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[26px]"
                        style={{
                          backgroundImage:
                            "linear-gradient(to right, rgba(37, 99, 235, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.12) 1px, transparent 1px)",
                          backgroundSize: `${MASTER_CARD_GRID_SIZE}px ${MASTER_CARD_GRID_SIZE}px`,
                        }}
                      />
                    ) : null}

                    {resolvedRects ? CATALOG_CARD_ELEMENT_KEYS.map((key) => {
                      const rect = resolvedRects[ELEMENT_LABELS[key].rectKey];

                      if (!rect) {
                        return null;
                      }

                      const isSelected = selectedElement === key;

                      return (
                        <div
                          key={key}
                          className="group absolute"
                          style={{
                            left: `${rect.x}px`,
                            top: `${rect.y}px`,
                            width: `${rect.width}px`,
                            height: `${Math.max(rect.height, 12)}px`,
                            zIndex: isSelected ? 20 : 10,
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`Move ${ELEMENT_LABELS[key].label}`}
                            onClick={() => setSelectedElement(key)}
                            onPointerDown={(event) => handlePointerDown(event, key)}
                            className={`absolute inset-0 cursor-grab rounded-[18px] border-2 border-dashed text-left transition active:cursor-grabbing ${isSelected ? "border-brand bg-brand/12 shadow-[0_0_0_3px_rgba(79,70,229,0.12)]" : "border-sky-300/80 bg-sky-100/20 hover:border-brand/40 hover:bg-brand-soft/10"}`}
                          >
                            <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-semibold tracking-[0.08em] shadow-sm transition ${isSelected ? "bg-brand text-white opacity-100" : "border border-line bg-white/95 text-foreground opacity-0 group-hover:opacity-100"}`}>
                              {ELEMENT_LABELS[key].label}
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Resize ${ELEMENT_LABELS[key].label}`}
                            onClick={() => setSelectedElement(key)}
                            onPointerDown={(event) => handleResizePointerDown(event, key)}
                            className={`absolute bottom-2 right-2 flex size-5 items-center justify-center rounded-full border shadow-sm transition ${isSelected ? "border-brand bg-brand text-white opacity-100" : "border-line bg-white text-foreground opacity-0 group-hover:opacity-100 hover:border-brand/30 hover:bg-brand-soft/10"}`}
                          >
                            <ArrowDownRight className="size-3.5" />
                          </button>
                        </div>
                      );
                    }) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                  {ELEMENT_LABELS[selectedElement].label}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${selectedLayout.visible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                  {selectedLayout.visible ? "Layout on" : "Layout off"}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${selectedRect ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                  {selectedRect ? "On canvas" : "Preview hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => updateDraftVisibility(selectedElement, !selectedLayout.visible)}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:border-brand/20 hover:bg-brand-soft/10"
                >
                  {selectedLayout.visible ? "Hide in shared layout" : "Show in shared layout"}
                </button>
              </div>
              {selectedRect ? (
                <p className="mt-3 text-[11px] leading-5 text-muted-strong">
                  Resolved box {Math.round(selectedRect.width)} x {Math.round(selectedRect.height)} px at {Math.round(selectedRect.x)}, {Math.round(selectedRect.y)}.
                  Shared adjustments: X {selectedLayout.x}, Y {selectedLayout.y}, W {selectedLayout.width}, H {selectedLayout.height}.
                </p>
              ) : (
                <p className="mt-3 text-[11px] leading-5 text-muted">{selectedElementRenderHint}</p>
              )}
            </div>

            <div className="hidden">
              <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Selected element</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{ELEMENT_LABELS[selectedElement].label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-strong">
                      Move the element on the canvas, drag the corner handle to resize its box, or use the controls below for precise shared-layout edits.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${selectedLayout.visible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                      {selectedLayout.visible ? "Layout on" : "Layout off"}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${selectedRect ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                      {selectedRect ? "On canvas" : "Preview hidden"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-line bg-slate-50 px-3 py-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedLayout.visible}
                      onChange={(event) => updateDraftVisibility(selectedElement, event.target.checked)}
                      className="accent-brand"
                    />
                    <div>
                      <p className="font-medium">Show element in shared layout</p>
                      <p className="mt-0.5 text-[11px] text-muted-strong">Turn this off when every product card should hide this element by default.</p>
                    </div>
                  </label>
                  {selectedRect ? (
                    <div className="rounded-2xl border border-line bg-slate-50 px-3 py-3 text-[11px] text-muted-strong">
                      Resolved box: {Math.round(selectedRect.width)} × {Math.round(selectedRect.height)} px at {Math.round(selectedRect.x)}, {Math.round(selectedRect.y)} · Adjustments {selectedLayout.x}, {selectedLayout.y}, {selectedLayout.width}, {selectedLayout.height}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line px-3 py-3 text-[11px] leading-5 text-muted">
                      {selectedElementRenderHint}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Canvas tools</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-strong">Keep the grid visible while editing and decide whether drag actions should snap to that spacing.</p>
                  </div>
                  <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                    Zoom {editorCanvasZoom.toFixed(2)}×
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-line bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(event) => setShowGrid(event.target.checked)}
                      className="accent-brand"
                    />
                    Show grid
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full border border-line bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(event) => setSnapToGrid(event.target.checked)}
                      className="accent-brand"
                    />
                    Snap drag
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted">Grid size</p>
                  <div className="grid grid-cols-3 gap-2">
                    {GRID_SIZE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGridSize(option)}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${gridSize === option ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
                      >
                        {option}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Position & size adjustments</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-strong">
                      Use nudges for quick edits, then enter exact X/Y and width/height adjustments when you need a repeatable card template.
                    </p>
                  </div>
                  <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                    {nudgeStep}px nudge
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted">Nudge step</p>
                  <div className="grid grid-cols-3 gap-2">
                    {NUDGE_STEP_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setNudgeStep(option)}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${nudgeStep === option ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
                      >
                        {option}px
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-[11px] font-medium text-muted">Move element</p>
                    <div className="mx-auto grid max-w-[176px] grid-cols-3 gap-2">
                      <div />
                      <Button type="button" variant="secondary" className="h-10 px-0" onClick={() => nudgeSelectedElement(0, -1)}>
                        <ArrowUp className="size-4" />
                      </Button>
                      <div />
                      <Button type="button" variant="secondary" className="h-10 px-0" onClick={() => nudgeSelectedElement(-1, 0)}>
                        <ArrowLeft className="size-4" />
                      </Button>
                      <div className="flex h-10 items-center justify-center rounded-xl border border-line bg-slate-50 text-[11px] font-medium text-muted-strong">
                        ±{nudgeStep}px
                      </div>
                      <Button type="button" variant="secondary" className="h-10 px-0" onClick={() => nudgeSelectedElement(1, 0)}>
                        <ArrowRight className="size-4" />
                      </Button>
                      <div />
                      <Button type="button" variant="secondary" className="h-10 px-0" onClick={() => nudgeSelectedElement(0, 1)}>
                        <ArrowDown className="size-4" />
                      </Button>
                      <div />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-medium text-muted">Resize element box</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" className="h-10 text-[11px] font-medium" onClick={() => resizeSelectedElement(-1, 0)}>
                        Width -
                      </Button>
                      <Button type="button" variant="secondary" className="h-10 text-[11px] font-medium" onClick={() => resizeSelectedElement(1, 0)}>
                        Width +
                      </Button>
                      <Button type="button" variant="secondary" className="h-10 text-[11px] font-medium" onClick={() => resizeSelectedElement(0, -1)}>
                        Height -
                      </Button>
                      <Button type="button" variant="secondary" className="h-10 text-[11px] font-medium" onClick={() => resizeSelectedElement(0, 1)}>
                        Height +
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-[11px] text-muted">
                    <span>X adjustment</span>
                    <Input
                      type="number"
                      min={-160}
                      max={160}
                      step={nudgeStep}
                      value={String(selectedLayout.x)}
                      onChange={(event) => updateDraftPosition(selectedElement, Number(event.target.value), selectedLayout.y)}
                      className="h-10 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] text-muted">
                    <span>Y adjustment</span>
                    <Input
                      type="number"
                      min={-160}
                      max={160}
                      step={nudgeStep}
                      value={String(selectedLayout.y)}
                      onChange={(event) => updateDraftPosition(selectedElement, selectedLayout.x, Number(event.target.value))}
                      className="h-10 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] text-muted">
                    <span>Width adjustment</span>
                    <Input
                      type="number"
                      min={-160}
                      max={160}
                      step={nudgeStep}
                      value={String(selectedLayout.width)}
                      onChange={(event) => updateDraftSize(selectedElement, Number(event.target.value), selectedLayout.height)}
                      className="h-10 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-[11px] text-muted">
                    <span>Height adjustment</span>
                    <Input
                      type="number"
                      min={-160}
                      max={160}
                      step={nudgeStep}
                      value={String(selectedLayout.height)}
                      onChange={(event) => updateDraftSize(selectedElement, selectedLayout.width, Number(event.target.value))}
                      className="h-10 text-sm"
                    />
                  </label>
                </div>
              </div>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>

        <div className="space-y-5 xl:sticky xl:top-24">
          <SurfaceCard className="overflow-hidden">
            <SurfaceCardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Focused compare</p>
                  <h2 className="mt-1 text-sm font-semibold text-foreground">Selected card in page context</h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${hasUnappliedChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {hasUnappliedChanges ? "Live draft" : "Applied"}
                  </span>
                  <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                    Page {previewPageIndex + 1} of {previewPageCount} · Slot {selectedItemPageSlotIndex + 1}
                  </span>
                </div>
              </div>
            </SurfaceCardHeader>
            <SurfaceCardBody className="space-y-4">
              <div className="rounded-2xl border border-brand/20 bg-brand-soft/10 px-4 py-3 text-[11px] leading-5 text-muted-strong">
                <p className="font-semibold text-foreground">Canvas edits update this compare preview immediately.</p>
                <p className="mt-1">The selected item stays large enough to compare against your canvas while still showing its page slot context.</p>
              </div>

              <div className="mx-auto w-full" style={{ maxWidth: `${focusedCompareViewportWidth}px` }}>
                <div
                  className="relative overflow-hidden rounded-[30px] border border-line bg-slate-100/80 shadow-inner"
                  style={{ height: `${focusedCompareViewportHeight}px` }}
                >
                  <div
                    className="absolute left-0 top-0 overflow-hidden rounded-[34px] border border-line/70 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.14)]"
                    style={{
                      width: `${focusedComparePageSize.width}px`,
                      height: `${focusedComparePageSize.height}px`,
                      transform: `translate(${focusedCompareOffset.x}px, ${focusedCompareOffset.y}px)`,
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: style.pageBackgroundColor,
                      }}
                    />
                    <div
                      className="absolute border-b border-dashed border-line/80 bg-white/70"
                      style={{
                        left: `${fallbackPageLayout.headerX}px`,
                        top: `${fallbackPageLayout.headerY}px`,
                        width: `${fallbackPageLayout.headerWidth}px`,
                        height: `${fallbackPageLayout.headerHeight}px`,
                      }}
                    />
                    <div
                      className="absolute border-t border-dashed border-line/80 bg-white/70"
                      style={{
                        left: `${fallbackPageLayout.footerX}px`,
                        top: `${fallbackPageLayout.footerY}px`,
                        width: `${fallbackPageLayout.footerWidth}px`,
                        height: `${fallbackPageLayout.footerHeight}px`,
                      }}
                    />

                    {focusedCompareSlotRects.map((slot) => {
                      const slotItem = pagePreviewItems[slot.index] ?? null;
                      const isSelectedSlot = slot.index === selectedItemPageSlotIndex;

                      return (
                        <div
                          key={slot.index}
                          className={`absolute overflow-hidden rounded-[22px] ${isSelectedSlot ? "ring-2 ring-brand/35 ring-offset-2 ring-offset-white/80" : ""}`}
                          style={{
                            left: `${slot.x}px`,
                            top: `${slot.y}px`,
                            width: `${slot.width}px`,
                            height: `${slot.height}px`,
                          }}
                        >
                          {isSelectedSlot ? (
                            <CatalogCardPreview
                              title={selectedItem.displayName ?? selectedItem.productName}
                              sku={selectedItem.sku}
                              packSize={selectedItem.packSize}
                              unit={selectedItem.unit}
                              normalPrice={selectedItem.normalPrice}
                              promoPrice={selectedItem.promoPrice}
                              discountAmount={selectedItem.discountAmount}
                              discountPercent={selectedItem.discountPercent}
                              imageUrl={selectedItem.previewUrl}
                              options={liveCurrentJobPreviewStyle}
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col justify-between rounded-[22px] border border-dashed border-line/80 bg-white/78 p-3 text-[10px] text-muted-strong">
                              <span className="rounded-full border border-line bg-white px-2 py-0.5 font-medium">
                                Slot {slot.index + 1}
                              </span>
                              <p className="line-clamp-3 text-[11px] font-medium text-foreground/80">
                                {slotItem?.title ?? "Empty slot"}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-muted-strong">
                <span className="rounded-full border border-line bg-white px-2.5 py-1">
                  Current job {style.flyerType === "promo" ? "Promo" : "Normal"}
                </span>
                <span className="rounded-full border border-line bg-white px-2.5 py-1">
                  Selected SKU {selectedItem.sku ?? "N/A"}
                </span>
                <span className="rounded-full border border-line bg-white px-2.5 py-1">
                  Compare zoom {focusedCompareScale.toFixed(2)}x
                </span>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <SurfaceCardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">A4 overview</p>
                  <h2 className="mt-1 text-sm font-semibold text-foreground">Full-page context</h2>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styleSaving || hasUnsavedStyleChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-line bg-white text-muted-strong"}`}>
                  {styleSaving ? "Saving..." : hasUnsavedStyleChanges ? "Save pending" : "Saved"}
                </span>
              </div>
            </SurfaceCardHeader>
            <SurfaceCardBody className="space-y-4">
              <div className="rounded-2xl border border-line bg-slate-50/80 px-4 py-3 text-[11px] leading-5 text-muted-strong">
                Keep an eye on overall page balance here while using the larger compare panel above for card-level adjustments.
              </div>
              <div className="mx-auto w-full max-w-[320px]">
                <CatalogPageCanvas
                  items={pagePreviewItems}
                  options={liveCurrentJobPreviewStyle}
                  pageBackgroundPreviewUrl={style.pageBackgroundPreviewUrl}
                  headerMediaPreviewUrl={style.headerMediaPreviewUrl}
                  footerMediaPreviewUrl={style.footerMediaPreviewUrl}
                  onResolvedCardPreviewSize={setResolvedPagePreviewCardSize}
                />
              </div>
            </SurfaceCardBody>
          </SurfaceCard>
        </div>

        <SurfaceCard className="hidden">
          <SurfaceCardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Live current job preview</p>
                <h2 className="mt-1 text-sm font-semibold text-foreground">Current job preview</h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${hasUnappliedChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {hasUnappliedChanges ? "Live draft" : "Applied"}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styleSaving || hasUnsavedStyleChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-line bg-white text-muted-strong"}`}>
                  {styleSaving ? "Saving…" : hasUnsavedStyleChanges ? "Save pending" : "Saved"}
                </span>
              </div>
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody className="space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:thin-scrollbar">
            <div className="rounded-2xl border border-brand/20 bg-brand-soft/10 px-4 py-3 text-[11px] leading-5 text-muted-strong">
              <p className="font-semibold text-foreground">Canvas edits update this preview immediately.</p>
              <p className="mt-1">This rail shows the current job with your live draft layout so you do not have to scroll below the canvas to validate changes.</p>
            </div>
            <div className="mx-auto max-w-[620px]">
              <CatalogPageCanvas
                items={pagePreviewItems}
                options={liveCurrentJobPreviewStyle}
                pageBackgroundPreviewUrl={style.pageBackgroundPreviewUrl}
                headerMediaPreviewUrl={style.headerMediaPreviewUrl}
                footerMediaPreviewUrl={style.footerMediaPreviewUrl}
                onResolvedCardPreviewSize={setResolvedPagePreviewCardSize}
              />
            </div>
          </SurfaceCardBody>
        </SurfaceCard>
      </div>
    </div>
  );
}
