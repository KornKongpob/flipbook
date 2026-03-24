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
import { CATALOG_A4_PAGE_HEIGHT, CATALOG_A4_PAGE_WIDTH, resolveCatalogPageLayout } from "@/lib/catalog/layout";
import type { FlyerType } from "@/lib/database.types";
import { buildCatalogStyleFormData, serializeStyleFormData } from "@/lib/catalog/style-form-data";
import type { CatalogLayoutVariant, EditorCatalogStyleOptions } from "@/lib/catalog/style-options";
import { formatCurrency } from "@/lib/utils";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Grip, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";

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

const GRID_SIZE_OPTIONS = [4, 8, 16] as const;
const NUDGE_STEP_OPTIONS = [1, 4, 8] as const;
const MASTER_CARD_TARGET_PREVIEW_WIDTH = 340;
const MASTER_CARD_MAX_PREVIEW_WIDTH = 420;

type GridSizeOption = (typeof GRID_SIZE_OPTIONS)[number];
type NudgeStepOption = (typeof NUDGE_STEP_OPTIONS)[number];

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const [gridSize, setGridSize] = useState<GridSizeOption>(8);
  const [nudgeStep, setNudgeStep] = useState<NudgeStepOption>(1);
  const [previewFlyerType, setPreviewFlyerType] = useState<FlyerType>(initialStyle.flyerType);
  const [resolvedPagePreviewCardSize, setResolvedPagePreviewCardSize] = useState<CatalogPageCanvasResolvedCardPreviewSize | null>(null);

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
  const hasUnappliedChanges = useMemo(
    () => !layoutsEqual(draftLayout, style.masterCardLayout),
    [draftLayout, style.masterCardLayout],
  );
  const currentStyleSignature = serializeStyleFormData(buildCatalogStyleFormData(jobId, style));
  const hasUnsavedStyleChanges = currentStyleSignature !== persistedStyleSignatureRef.current;
  const pagePreviewItems = useMemo(
    () => previewItems.slice(0, 9).map((item) => ({
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
    [previewItems],
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
      resolvedPagePreviewCardSize.renderedCardWidth > 0 &&
      resolvedPagePreviewCardSize.renderedCardHeight > 0
    ) {
      return {
        width: resolvedPagePreviewCardSize.renderedCardWidth,
        height: resolvedPagePreviewCardSize.renderedCardHeight,
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

    return targetWidth / editorCardBaseSize.width;
  }, [editorCardBaseSize.width]);
  const editorCardViewportSize = useMemo(
    () => ({
      width: editorCardBaseSize.width * editorCanvasZoom,
      height: editorCardBaseSize.height * editorCanvasZoom,
    }),
    [editorCanvasZoom, editorCardBaseSize.height, editorCardBaseSize.width],
  );

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
      const resolvedX = shouldSnap ? snapAdjustmentToGrid(nextX, gridSize) : nextX;
      const resolvedY = shouldSnap ? snapAdjustmentToGrid(nextY, gridSize) : nextY;

      updateDraftLayoutEntry(key, {
        x: clampAdjustment(resolvedX),
        y: clampAdjustment(resolvedY),
      });
    },
    [gridSize, updateDraftLayoutEntry],
  );

  const updateDraftSize = useCallback(
    (
      key: CatalogCardElementKey,
      nextWidth: number,
      nextHeight: number,
      options: { snap?: boolean } = {},
    ) => {
      const shouldSnap = options.snap ?? false;
      const resolvedWidth = shouldSnap ? snapAdjustmentToGrid(nextWidth, gridSize) : nextWidth;
      const resolvedHeight = shouldSnap ? snapAdjustmentToGrid(nextHeight, gridSize) : nextHeight;

      updateDraftLayoutEntry(key, {
        width: clampAdjustment(resolvedWidth),
        height: clampAdjustment(resolvedHeight),
      });
    },
    [gridSize, updateDraftLayoutEntry],
  );

  const updateDraftVisibility = useCallback(
    (key: CatalogCardElementKey, nextVisible: boolean) => {
      updateDraftLayoutEntry(key, { visible: nextVisible });
    },
    [updateDraftLayoutEntry],
  );

  const nudgeSelectedElement = useCallback(
    (deltaX: number, deltaY: number) => {
      const currentLayout = draftLayout[selectedElement];
      updateDraftPosition(
        selectedElement,
        currentLayout.x + deltaX * nudgeStep,
        currentLayout.y + deltaY * nudgeStep,
      );
    },
    [draftLayout, nudgeStep, selectedElement, updateDraftPosition],
  );

  const resizeSelectedElement = useCallback(
    (deltaWidth: number, deltaHeight: number) => {
      const currentLayout = draftLayout[selectedElement];
      updateDraftSize(
        selectedElement,
        currentLayout.width + deltaWidth * nudgeStep,
        currentLayout.height + deltaHeight * nudgeStep,
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
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
      <SurfaceCard className="xl:sticky xl:top-24">
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
              Define the shared product-card structure once: move, resize, and show or hide reusable elements before applying the layout to every card.
            </p>
          </div>
        </SurfaceCardHeader>
        <SurfaceCardBody className="space-y-4">
          {styleSaveError ? (
            <StatusBanner tone="danger" title="Could not save master card" description={styleSaveError} />
          ) : hasUnappliedChanges ? (
            <StatusBanner tone="warning" title="Draft changes not applied" description="Apply the current draft layout before saving or moving to page design." />
          ) : (
            <StatusBanner tone="success" title="Master card is applied" description={styleStatusLabel} />
          )}

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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Editable elements</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-strong">Select any shared card element, then move it, resize its box, or hide it from the reusable layout.</p>
              </div>
              <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                {renderedElementCount}/{CATALOG_CARD_ELEMENT_KEYS.length} rendered
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATALOG_CARD_ELEMENT_KEYS.map((key) => {
                const isSelected = selectedElement === key;
                const isVisible = draftLayout[key].visible;
                const rect = resolvedRects?.[ELEMENT_LABELS[key].rectKey] ?? null;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedElement(key)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${isSelected ? "border-brand/30 bg-brand-soft/15 text-foreground" : "border-line bg-white text-muted-strong hover:border-brand/20"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{ELEMENT_LABELS[key].label}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${isVisible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                        {isVisible ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5">
                      {!isVisible
                        ? "Hidden from the shared layout"
                        : rect
                          ? `X ${draftLayout[key].x}px · Y ${draftLayout[key].y}px · W ${draftLayout[key].width}px · H ${draftLayout[key].height}px`
                          : `Not rendered in ${previewFlyerType} preview`}
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
              Apply master card
            </Button>
            <Button type="button" variant="secondary" className="h-10 gap-2" onClick={() => updateDraftLayoutEntry(selectedElement, createDefaultCatalogMasterCardElementLayout())}>
              <RefreshCw className="size-4" />
              Reset selected
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
              Reset all layout
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" className="h-10 gap-2" onClick={() => { void handleSave(); }} disabled={styleSaving || pageDesignPending}>
              {styleSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save layout
            </Button>
            <Button type="button" variant="secondary" className="h-10 gap-2" onClick={() => { void handleOpenPageDesign(); }} disabled={styleSaving || pageDesignPending}>
              {pageDesignPending ? <Loader2 className="size-4 animate-spin" /> : <Grip className="size-4" />}
              Open Page Design
            </Button>
          </div>
        </SurfaceCardBody>
      </SurfaceCard>

      <div className="space-y-5">
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
                  Zoom {editorCanvasZoom.toFixed(2)}×
                </span>
                <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted-strong">
                  {snapToGrid ? `Snap ${gridSize}px` : "Free drag"}
                </span>
              </div>
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
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
                          backgroundSize: `${gridSize}px ${gridSize}px`,
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
                          className="absolute"
                          style={{
                            left: `${rect.x}px`,
                            top: `${rect.y}px`,
                            width: `${rect.width}px`,
                            height: `${Math.max(rect.height, 12)}px`,
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`Move ${ELEMENT_LABELS[key].label}`}
                            onClick={() => setSelectedElement(key)}
                            onPointerDown={(event) => handlePointerDown(event, key)}
                            className={`absolute inset-0 cursor-grab rounded-xl border-2 border-dashed text-left transition active:cursor-grabbing ${isSelected ? "border-brand bg-brand/10 shadow-sm" : "border-sky-300/90 bg-sky-100/35 hover:border-brand/40 hover:bg-brand-soft/10"}`}
                          >
                            <span className={`absolute -top-6 left-0 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${isSelected ? "bg-brand text-white" : "bg-white text-foreground border border-line"}`}>
                              {ELEMENT_LABELS[key].label}
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Resize ${ELEMENT_LABELS[key].label}`}
                            onClick={() => setSelectedElement(key)}
                            onPointerDown={(event) => handleResizePointerDown(event, key)}
                            className={`absolute -bottom-3 -right-3 flex size-6 items-center justify-center rounded-full border text-[11px] font-bold shadow-sm ${isSelected ? "border-brand bg-brand text-white" : "border-line bg-white text-foreground hover:border-brand/30 hover:bg-brand-soft/10"}`}
                          >
                            ↘
                          </button>
                        </div>
                      );
                    }) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Selected element</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{ELEMENT_LABELS[selectedElement].label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-strong">
                      Move the element on the canvas, drag the corner handle to resize its box, or fine-tune the shared layout adjustments below.
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${selectedLayout.visible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                    {selectedLayout.visible ? "Visible" : "Hidden"}
                  </span>
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
                      <Button type="button" variant="secondary" className="h-10 text-xs" onClick={() => resizeSelectedElement(-1, 0)}>
                        Narrower
                      </Button>
                      <Button type="button" variant="secondary" className="h-10 text-xs" onClick={() => resizeSelectedElement(1, 0)}>
                        Wider
                      </Button>
                      <Button type="button" variant="secondary" className="h-10 text-xs" onClick={() => resizeSelectedElement(0, -1)}>
                        Shorter
                      </Button>
                      <Button type="button" variant="secondary" className="h-10 text-xs" onClick={() => resizeSelectedElement(0, 1)}>
                        Taller
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
                {selectedRect ? (
                  <div className="rounded-2xl border border-line bg-slate-50 px-3 py-3 text-[11px] text-muted-strong">
                    Resolved box: {Math.round(selectedRect.width)} × {Math.round(selectedRect.height)} px at {Math.round(selectedRect.x)}, {Math.round(selectedRect.y)} · Adjustments {selectedLayout.x}, {selectedLayout.y}, {selectedLayout.width}, {selectedLayout.height}
                  </div>
                ) : !selectedLayout.visible ? (
                  <div className="rounded-2xl border border-dashed border-line px-3 py-3 text-[11px] text-muted">
                    This element is hidden in the shared layout. Turn it back on to render it on the sample card.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line px-3 py-3 text-[11px] text-muted">
                    This element is not rendered in the current {previewFlyerType} preview. Switch preview mode to position it on canvas.
                  </div>
                )}
              </div>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard>
          <SurfaceCardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Applied to current job</p>
                <h2 className="mt-1 text-sm font-semibold text-foreground">Current job preview</h2>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${hasUnappliedChanges ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {hasUnappliedChanges ? "Waiting for Apply" : "Applied"}
              </span>
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody>
            <div className="mx-auto max-w-[620px]">
              <CatalogPageCanvas
                items={pagePreviewItems}
                options={style}
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
