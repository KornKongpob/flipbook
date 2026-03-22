"use client";

import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  ImageOff,
  Loader2,
} from "lucide-react";
import { moveItemAction, toggleItemVisibilityAction, saveStyleOptionsAction } from "@/app/(app)/actions";
import { CatalogPageCanvas } from "@/components/catalog/catalog-page-canvas";
import { CatalogStyleControls } from "@/components/catalog/catalog-style-controls";
import { Input } from "@/components/ui/input";
import { DEFAULT_STYLE_OPTIONS } from "@/lib/catalog/constants";
import {
  getCatalogItemsPerPage,
  getCatalogLayoutPresetDefinition,
} from "@/lib/catalog/layout";
import {
  CATALOG_STYLE_PRESETS,
  type EditorCatalogStyleOptions,
} from "@/lib/catalog/style-options";

interface EditorItem {
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

interface EditState {
  displayName: string;
  normalPrice: string;
  promoPrice: string;
  packSize: string;
  unit: string;
}

function ItemEditPanel({
  item,
  onSave,
  onCancel,
}: {
  item: EditorItem;
  onSave: (fields: Partial<EditState>) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<EditState>({
    displayName: item.displayName ?? item.productName,
    normalPrice: item.normalPrice != null ? String(item.normalPrice) : "",
    promoPrice: item.promoPrice != null ? String(item.promoPrice) : "",
    packSize: item.packSize ?? "",
    unit: item.unit ?? "",
  });

  return (
    <div className="border-t border-line bg-blue-50/40 px-4 py-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted">Display name</label>
          <Input
            value={fields.displayName}
            onChange={(e) => setFields((p) => ({ ...p, displayName: e.target.value }))}
            className="h-7 text-xs"
            placeholder={item.productName}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted">Normal price</label>
            <Input
              type="number"
              value={fields.normalPrice}
              onChange={(e) => setFields((p) => ({ ...p, normalPrice: e.target.value }))}
              className="h-7 text-xs"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted">Promo price</label>
            <Input
              type="number"
              value={fields.promoPrice}
              onChange={(e) => setFields((p) => ({ ...p, promoPrice: e.target.value }))}
              className="h-7 text-xs"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted">Pack size</label>
            <Input
              value={fields.packSize}
              onChange={(e) => setFields((p) => ({ ...p, packSize: e.target.value }))}
              className="h-7 text-xs"
              placeholder="e.g. 12x500ml"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted">Unit</label>
            <Input
              value={fields.unit}
              onChange={(e) => setFields((p) => ({ ...p, unit: e.target.value }))}
              className="h-7 text-xs"
              placeholder="e.g. แพ็ค"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 items-center gap-1 rounded-lg border border-line bg-white px-3 text-xs text-muted hover:text-foreground transition"
        >
          <X className="size-3" /> Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(fields)}
          className="flex h-7 items-center gap-1 rounded-lg bg-brand px-3 text-xs text-white hover:bg-brand/90 transition"
        >
          <Check className="size-3" /> Save
        </button>
      </div>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function EditorPanel({
  initialItems,
  jobId,
  initialStyle,
}: {
  initialItems: EditorItem[];
  jobId: string;
  initialStyle: EditorCatalogStyleOptions;
}) {
  const router = useRouter();
  const [items, setItems] = useState<EditorItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [style, setStyle] = useState<EditorCatalogStyleOptions>(initialStyle);
  const [styleTransition, startStyleTransition] = useTransition();
  const [previewPage, setPreviewPage] = useState(0);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<"products" | "design">("products");
  const [productFilter, setProductFilter] = useState<"all" | "visible" | "hidden">("all");

  const visibleItems = items.filter((i) => i.isVisible);
  const hiddenCount = items.length - visibleItems.length;
  const layoutPreset = getCatalogLayoutPresetDefinition(style.layoutPreset);
  const itemsPerPage = getCatalogItemsPerPage(style.layoutPreset);
  const pages = chunk(visibleItems, itemsPerPage);
  const currentPageItems = pages[previewPage] ?? [];
  const editingItem = items.find((item) => item.id === editingId) ?? null;
  const filteredItems = items.filter((item) => {
    if (productFilter === "visible") {
      return item.isVisible;
    }

    if (productFilter === "hidden") {
      return !item.isVisible;
    }

    return true;
  });

  useEffect(() => {
    setPreviewPage((current) => Math.min(current, Math.max(pages.length - 1, 0)));
  }, [pages.length]);

  function updateStyle(
    key: keyof EditorCatalogStyleOptions,
    value: string | number | boolean | null,
  ) {
    setStyle((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function applyPreset(presetId: string) {
    const preset = CATALOG_STYLE_PRESETS.find((entry) => entry.id === presetId);

    if (!preset) {
      return;
    }

    setStyle((previous) => ({
      ...previous,
      ...preset.options,
    }));
  }

  function resetStyle() {
    setStyle({
      ...DEFAULT_STYLE_OPTIONS,
      pageBackgroundPreviewUrl: null,
    });
    setBackgroundError(null);
  }

  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBackgroundUploading(true);
    setBackgroundError(null);

    try {
      const formData = new FormData();
      formData.append("background", file);

      const response = await fetch(`/api/jobs/${jobId}/background`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            storageBucket?: string;
            storagePath?: string;
            previewUrl?: string | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Background upload failed.");
      }

      setStyle((previous) => ({
        ...previous,
        pageBackgroundImageBucket: payload?.storageBucket ?? null,
        pageBackgroundImagePath: payload?.storagePath ?? null,
        pageBackgroundPreviewUrl: payload?.previewUrl ?? null,
      }));
    } catch (error) {
      setBackgroundError(error instanceof Error ? error.message : "Background upload failed.");
    } finally {
      event.target.value = "";
      setBackgroundUploading(false);
    }
  }

  async function handleSaveItem(itemId: string, fields: Partial<EditState>) {
    setSaving(itemId);
    try {
      const body: Record<string, unknown> = {};
      if (fields.displayName !== undefined) body.displayName = fields.displayName || null;
      if (fields.normalPrice !== undefined)
        body.normalPrice = fields.normalPrice ? parseFloat(fields.normalPrice) : null;
      if (fields.promoPrice !== undefined)
        body.promoPrice = fields.promoPrice ? parseFloat(fields.promoPrice) : null;
      if (fields.packSize !== undefined) body.packSize = fields.packSize || null;
      if (fields.unit !== undefined) body.unit = fields.unit || null;

      const res = await fetch(`/api/items/${itemId}/update`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it;
          return {
            ...it,
            displayName: fields.displayName !== undefined
              ? (fields.displayName || null)
              : it.displayName,
            normalPrice: fields.normalPrice !== undefined
              ? (fields.normalPrice ? parseFloat(fields.normalPrice) : null)
              : it.normalPrice,
            promoPrice: fields.promoPrice !== undefined
              ? (fields.promoPrice ? parseFloat(fields.promoPrice) : null)
              : it.promoPrice,
            packSize: fields.packSize !== undefined
              ? (fields.packSize || null)
              : it.packSize,
            unit: fields.unit !== undefined ? (fields.unit || null) : it.unit,
          };
        }),
      );

      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
          <div className="border-b border-line bg-gray-50/50 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Editor workspace</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Manage products and visual design</p>
              </div>
              <span className="rounded-full border border-line bg-white/80 px-2.5 py-1 text-[11px] text-muted-strong">
                {visibleItems.length} visible
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "products", label: "Products", description: `${items.length} items` },
                { key: "design", label: "Design", description: "Theme + layout" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSidebarMode(tab.key as "products" | "design")}
                  className={`rounded-xl border px-3 py-2 text-left transition ${sidebarMode === tab.key ? "border-brand/30 bg-brand-soft/15 text-brand shadow-sm" : "border-line bg-white text-muted-strong hover:border-brand/20 hover:text-foreground"}`}
                >
                  <p className="text-sm font-semibold">{tab.label}</p>
                  <p className="mt-0.5 text-[11px] opacity-80">{tab.description}</p>
                </button>
              ))}
            </div>
          </div>

          {sidebarMode === "design" ? (
            <div className="p-4">
              <CatalogStyleControls
                jobId={jobId}
                style={style}
                styleTransition={styleTransition}
                backgroundUploading={backgroundUploading}
                backgroundError={backgroundError}
                onStyleChange={updateStyle}
                onApplyPreset={applyPreset}
                onReset={resetStyle}
                onBackgroundUpload={handleBackgroundUpload}
                formAction={(fd) => {
                  startStyleTransition(async () => {
                    await saveStyleOptionsAction(fd);
                    router.refresh();
                  });
                }}
              />
            </div>
          ) : (
            <>
              <div className="border-b border-line bg-white/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "all", label: `All (${items.length})` },
                    { key: "visible", label: `Visible (${visibleItems.length})` },
                    { key: "hidden", label: `Hidden (${hiddenCount})` },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setProductFilter(filter.key as "all" | "visible" | "hidden")}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${productFilter === filter.key ? "border-brand/30 bg-brand-soft/15 text-brand" : "border-line bg-white text-muted-strong hover:border-brand/20 hover:text-foreground"}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  {editingId ? (
                    <span className="rounded-full border border-brand/20 bg-brand-soft/15 px-3 py-1 text-[11px] font-medium text-brand">
                      Editing item #{editingItem ? editingItem.displayOrder + 1 : "—"}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[740px] space-y-3 overflow-y-auto p-4 thin-scrollbar">
                {filteredItems.map((item) => (
                  <div key={item.id} className={`overflow-hidden rounded-2xl border bg-white/80 shadow-sm transition ${editingId === item.id ? "border-brand/30 ring-2 ring-brand/10" : "border-line hover:border-brand/20"} ${!item.isVisible ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3 px-4 py-4">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-[11px] font-bold text-brand">
                        {item.displayOrder + 1}
                      </span>

                      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-gray-50">
                        {item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.previewUrl} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <ImageOff className="size-4 text-muted" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.displayName ?? item.productName}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.isVisible ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-muted-strong"}`}>
                            {item.isVisible ? "Visible" : "Hidden"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted">{item.sku ?? "No SKU"}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-strong">
                          <span>Normal: {item.normalPrice != null ? item.normalPrice.toFixed(2) : "—"}</span>
                          <span>Promo: {item.promoPrice != null ? item.promoPrice.toFixed(2) : "—"}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                          className={`flex size-8 items-center justify-center rounded-lg transition ${editingId === item.id ? "bg-brand-soft text-brand" : "text-muted hover:text-brand hover:bg-brand-soft"}`}
                        >
                          {saving === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Pencil className="size-3.5" />
                          )}
                        </button>

                        <form action={moveItemAction}>
                          <input type="hidden" name="jobId" value={jobId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-gray-100 hover:text-foreground transition"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                        </form>

                        <form action={moveItemAction}>
                          <input type="hidden" name="jobId" value={jobId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-gray-100 hover:text-foreground transition"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </form>

                        <form action={toggleItemVisibilityAction}>
                          <input type="hidden" name="jobId" value={jobId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="nextVisible" value={String(!item.isVisible)} />
                          <button
                            type="submit"
                            className={`flex size-8 items-center justify-center rounded-lg transition ${item.isVisible ? "text-muted hover:bg-rose-50 hover:text-rose-500" : "text-emerald-500 hover:bg-emerald-50"}`}
                          >
                            {item.isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                          </button>
                        </form>
                      </div>
                    </div>

                    {editingId === item.id && (
                      <ItemEditPanel
                        item={item}
                        onSave={(fields) => handleSaveItem(item.id, fields)}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </div>
                ))}

                {!filteredItems.length ? (
                  <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
                    No items match the current filter.
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
        <div className="border-b border-line bg-gray-50/50 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">A4 live preview</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Page {previewPage + 1} of {Math.max(1, pages.length)}</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={previewPage === 0}
                onClick={() => setPreviewPage((p) => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-foreground disabled:opacity-30 transition"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={previewPage >= pages.length - 1}
                onClick={() => setPreviewPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-foreground disabled:opacity-30 transition"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-[11px] text-muted-strong">
              {visibleItems.length} visible items
            </span>
            <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-[11px] text-muted-strong">
              {hiddenCount} hidden items
            </span>
            <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-[11px] text-muted-strong">
              {layoutPreset.label} · {itemsPerPage} per page
            </span>
            <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-[11px] text-muted-strong">
              Header {style.headerSpace}px · Footer {style.footerSpace}px
            </span>
            <span className="rounded-full border border-line bg-white/80 px-3 py-1 text-[11px] text-muted-strong">
              {style.pageBackgroundPreviewUrl ? "Image background active" : "Color background only"}
            </span>
          </div>
        </div>

        <div className="p-4">
          {currentPageItems.length > 0 ? (
            <CatalogPageCanvas
              items={currentPageItems.map((item) => ({
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
              }))}
              options={style}
              pageBackgroundPreviewUrl={style.pageBackgroundPreviewUrl}
              showSafeAreaGuides
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line">
              <p className="text-sm text-muted">No visible items. Toggle items on to preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
