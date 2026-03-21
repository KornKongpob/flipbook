"use client";

import { useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogCardPreview } from "@/components/catalog/catalog-card-preview";

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

interface StyleOptions {
  variant: string;
  showNormalPrice: boolean;
  showPromoPrice: boolean;
  showDiscountAmount: boolean;
  showDiscountPercent: boolean;
  showSku: boolean;
  showPackSize: boolean;
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

const ITEMS_PER_PAGE = 9;

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
  initialStyle: StyleOptions;
}) {
  const router = useRouter();
  const [items, setItems] = useState<EditorItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [style, setStyle] = useState<StyleOptions>(initialStyle);
  const [styleTransition, startStyleTransition] = useTransition();
  const [previewPage, setPreviewPage] = useState(0);

  const visibleItems = items.filter((i) => i.isVisible);
  const pages = chunk(visibleItems, ITEMS_PER_PAGE);
  const currentPageItems = pages[previewPage] ?? [];

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
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      {/* ── Left: product list + style panel ── */}
      <div className="space-y-4">
        {/* Style options */}
        <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
          <div className="border-b border-line bg-gray-50/50 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Style Options</p>
          </div>
          <form
            action={async (fd) => {
              startStyleTransition(async () => {
                await saveStyleOptionsAction(fd);
                router.refresh();
              });
            }}
            className="p-4 space-y-4"
          >
            <input type="hidden" name="jobId" value={jobId} />

            <div>
              <p className="mb-2 text-xs font-medium text-muted">Layout variant</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "promo", label: "Promo flyer" },
                  { value: "clean", label: "Clean grid" },
                ].map((v) => (
                  <label
                    key={v.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white p-2.5 text-xs has-[:checked]:border-brand has-[:checked]:bg-brand-soft/10 transition"
                  >
                    <input
                      type="radio"
                      name="variant"
                      value={v.value}
                      defaultChecked={style.variant === v.value}
                      onChange={() => setStyle((p) => ({ ...p, variant: v.value }))}
                      className="accent-brand"
                    />
                    {v.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">Display options</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["showNormalPrice", "Normal price"],
                    ["showPromoPrice", "Promo price"],
                    ["showDiscountAmount", "Discount amount"],
                    ["showDiscountPercent", "Percent off"],
                    ["showSku", "SKU"],
                    ["showPackSize", "Pack size"],
                  ] as [keyof StyleOptions, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-muted-strong has-[:checked]:border-brand/30 transition"
                  >
                    <input
                      type="checkbox"
                      name={key}
                      defaultChecked={Boolean(style[key])}
                      onChange={(e) =>
                        setStyle((p) => ({ ...p, [key]: e.target.checked }))
                      }
                      className="accent-brand"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-8 text-xs gap-1.5" disabled={styleTransition}>
              {styleTransition && <Loader2 className="size-3 animate-spin" />}
              Save style
            </Button>
          </form>
        </div>

        {/* Product list */}
        <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
          <div className="border-b border-line bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Products ({items.length})
            </p>
            <span className="text-xs text-muted">{visibleItems.length} visible</span>
          </div>

          <div className="divide-y divide-line max-h-[600px] overflow-y-auto thin-scrollbar">
            {items.map((item) => (
              <div key={item.id}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 transition ${
                    !item.isVisible ? "opacity-50" : ""
                  }`}
                >
                  {/* Order badge */}
                  <span className="flex size-5 shrink-0 items-center justify-center rounded bg-brand-soft text-[10px] font-bold text-brand">
                    {item.displayOrder + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-gray-50">
                    {item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff className="size-3 text-muted" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {item.displayName ?? item.productName}
                    </p>
                    <p className="truncate text-[10px] text-muted">{item.sku ?? "No SKU"}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-0.5">
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                      className={`flex size-6 items-center justify-center rounded transition ${
                        editingId === item.id
                          ? "bg-brand-soft text-brand"
                          : "text-muted hover:text-brand hover:bg-brand-soft"
                      }`}
                    >
                      {saving === item.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Pencil className="size-3" />
                      )}
                    </button>

                    {/* Move up */}
                    <form action={moveItemAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        className="flex size-6 items-center justify-center rounded text-muted hover:bg-gray-100 hover:text-foreground transition"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                    </form>

                    {/* Move down */}
                    <form action={moveItemAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        className="flex size-6 items-center justify-center rounded text-muted hover:bg-gray-100 hover:text-foreground transition"
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </form>

                    {/* Toggle visibility */}
                    <form action={toggleItemVisibilityAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="nextVisible" value={String(!item.isVisible)} />
                      <button
                        type="submit"
                        className={`flex size-6 items-center justify-center rounded transition ${
                          item.isVisible
                            ? "text-muted hover:bg-rose-50 hover:text-rose-500"
                            : "text-emerald-500 hover:bg-emerald-50"
                        }`}
                      >
                        {item.isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === item.id && (
                  <ItemEditPanel
                    item={item}
                    onSave={(fields) => handleSaveItem(item.id, fields)}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Live preview ── */}
      <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
        <div className="border-b border-line bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            A4 Preview — Page {previewPage + 1} of {Math.max(1, pages.length)}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={previewPage === 0}
              onClick={() => setPreviewPage((p) => p - 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-line bg-white text-muted hover:text-foreground disabled:opacity-30 transition"
            >
              <ChevronUp className="size-3" />
            </button>
            <button
              type="button"
              disabled={previewPage >= pages.length - 1}
              onClick={() => setPreviewPage((p) => p + 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-line bg-white text-muted hover:text-foreground disabled:opacity-30 transition"
            >
              <ChevronDown className="size-3" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {currentPageItems.length > 0 ? (
            <div className="catalog-page overflow-hidden p-3">
              <div className="grid h-full grid-cols-3 grid-rows-3 gap-2">
                {currentPageItems.map((item) => (
                  <div key={item.id} className="min-h-0 min-w-0 overflow-hidden">
                    <CatalogCardPreview
                      title={item.displayName ?? item.productName}
                      sku={item.sku}
                      packSize={item.packSize}
                      unit={item.unit}
                      normalPrice={item.normalPrice}
                      promoPrice={item.promoPrice}
                      discountAmount={item.discountAmount}
                      discountPercent={item.discountPercent}
                      imageUrl={item.previewUrl}
                      options={style}
                    />
                  </div>
                ))}
              </div>
            </div>
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
