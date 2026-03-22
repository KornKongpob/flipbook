"use client";

import type { ChangeEvent } from "react";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATALOG_STYLE_PRESETS,
  type CatalogStyleOptions,
  type EditorCatalogStyleOptions,
} from "@/lib/catalog/style-options";
import { CATALOG_LAYOUT_PRESETS } from "@/lib/catalog/layout";

interface CatalogStyleControlsProps {
  jobId: string;
  style: EditorCatalogStyleOptions;
  styleTransition: boolean;
  backgroundUploading: boolean;
  backgroundError: string | null;
  onStyleChange: (key: keyof EditorCatalogStyleOptions, value: string | number | boolean | null) => void;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
  onBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  formAction: (formData: FormData) => void;
}

const DISPLAY_FIELDS: Array<{ key: keyof CatalogStyleOptions; label: string }> = [
  { key: "showNormalPrice", label: "Normal price" },
  { key: "showPromoPrice", label: "Promo price" },
  { key: "showDiscountAmount", label: "Discount amount" },
  { key: "showDiscountPercent", label: "Percent off" },
  { key: "showSku", label: "SKU" },
  { key: "showPackSize", label: "Pack size" },
];

const COLOR_FIELDS: Array<{ key: keyof CatalogStyleOptions; label: string }> = [
  { key: "pageBackgroundColor", label: "Page background" },
  { key: "cardBackgroundColor", label: "Card background" },
  { key: "cardBorderColor", label: "Card border" },
  { key: "imageBackgroundColor", label: "Image background" },
  { key: "titleColor", label: "Title" },
  { key: "metaColor", label: "SKU / meta" },
  { key: "promoPriceColor", label: "Promo price" },
  { key: "normalPriceColor", label: "Normal price" },
  { key: "discountBadgeBackgroundColor", label: "Discount pill" },
  { key: "discountBadgeTextColor", label: "Discount pill text" },
];

const NUMBER_FIELDS: Array<{
  key: keyof CatalogStyleOptions;
  label: string;
  min: number;
  max: number;
  step?: number;
}> = [
  { key: "titleFontSize", label: "Title size", min: 10, max: 24 },
  { key: "skuFontSize", label: "SKU size", min: 8, max: 18 },
  { key: "promoPriceFontSize", label: "Promo price size", min: 16, max: 40 },
  { key: "normalPriceFontSize", label: "Normal price size", min: 8, max: 22 },
  { key: "headerSpace", label: "Header space", min: 0, max: 180 },
  { key: "footerSpace", label: "Footer space", min: 0, max: 120 },
  { key: "pagePadding", label: "Page padding", min: 8, max: 40 },
  { key: "pageGap", label: "Grid gap", min: 4, max: 24 },
  { key: "cardPadding", label: "Card padding", min: 6, max: 28 },
  { key: "cardRadius", label: "Card radius", min: 8, max: 32 },
  { key: "imageAreaHeight", label: "Image height", min: 64, max: 180 },
];

export function CatalogStyleControls({
  jobId,
  style,
  styleTransition,
  backgroundUploading,
  backgroundError,
  onStyleChange,
  onApplyPreset,
  onReset,
  onBackgroundUpload,
  formAction,
}: CatalogStyleControlsProps) {
  return (
    <div className="rounded-xl border border-line bg-card shadow-sm overflow-hidden">
      <div className="border-b border-line bg-gray-50/50 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Style Options</p>
      </div>
      <form action={formAction} className="p-4 space-y-4">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="layoutPreset" value={style.layoutPreset} />
        <input type="hidden" name="pageBackgroundImageBucket" value={style.pageBackgroundImageBucket ?? ""} />
        <input type="hidden" name="pageBackgroundImagePath" value={style.pageBackgroundImagePath ?? ""} />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">Style presets</p>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] text-muted hover:text-foreground"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CATALOG_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.id)}
                className="rounded-lg border border-line bg-white px-2 py-2 text-[11px] font-medium text-foreground transition hover:border-brand/40 hover:bg-brand-soft/10"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">Layout preset</p>
            <span className="text-[11px] text-muted">Applies to the whole catalog job</span>
          </div>
          <div className="grid gap-2">
            {CATALOG_LAYOUT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onStyleChange("layoutPreset", preset.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${style.layoutPreset === preset.id ? "border-brand/30 bg-brand-soft/15 shadow-sm" : "border-line bg-white hover:border-brand/20"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{preset.label}</p>
                    <p className="mt-1 text-[11px] text-muted-strong">{preset.description}</p>
                  </div>
                  <span className="rounded-full border border-line bg-white/80 px-2 py-1 text-[10px] font-semibold text-muted-strong">
                    {preset.columns}×{preset.rows}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Layout variant</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "promo", label: "Promo flyer" },
              { value: "clean", label: "Clean grid" },
            ].map((variant) => (
              <label
                key={variant.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white p-2.5 text-xs has-[:checked]:border-brand has-[:checked]:bg-brand-soft/10 transition"
              >
                <input
                  type="radio"
                  name="variant"
                  value={variant.value}
                  checked={style.variant === variant.value}
                  onChange={() => onStyleChange("variant", variant.value)}
                  className="accent-brand"
                />
                {variant.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Display options</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DISPLAY_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-muted-strong has-[:checked]:border-brand/30 transition"
              >
                <input
                  type="checkbox"
                  name={field.key}
                  checked={Boolean(style[field.key])}
                  onChange={(event) => onStyleChange(field.key, event.target.checked)}
                  className="accent-brand"
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">A4 background</p>
            {backgroundUploading ? <Loader2 className="size-3 animate-spin text-muted" /> : null}
          </div>
          <div className="rounded-xl border border-line bg-white p-3 space-y-3">
            <div className="h-28 overflow-hidden rounded-lg border border-dashed border-line bg-gray-50">
              {style.pageBackgroundPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={style.pageBackgroundPreviewUrl} alt="Background preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted">No background image</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-foreground hover:border-brand/40">
                <Upload className="size-3" />
                Upload background
                <input type="file" accept="image/*" className="hidden" onChange={onBackgroundUpload} />
              </label>
              {style.pageBackgroundPreviewUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    onStyleChange("pageBackgroundImageBucket", null);
                    onStyleChange("pageBackgroundImagePath", null);
                    onStyleChange("pageBackgroundPreviewUrl", null);
                  }}
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  Remove image
                </button>
              ) : null}
            </div>
            {backgroundError ? <p className="text-[11px] text-rose-600">{backgroundError}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-[11px] text-muted">
                <span>Background color</span>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1.5">
                  <input
                    type="color"
                    name="pageBackgroundColor"
                    value={style.pageBackgroundColor}
                    onChange={(event) => onStyleChange("pageBackgroundColor", event.target.value)}
                    className="h-8 w-10 rounded border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-[11px] text-foreground">{style.pageBackgroundColor}</span>
                </div>
              </label>
              <label className="space-y-1 text-[11px] text-muted">
                <span>Background fit</span>
                <select
                  name="pageBackgroundFit"
                  value={style.pageBackgroundFit}
                  onChange={(event) => onStyleChange("pageBackgroundFit", event.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-xs text-foreground"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
              </label>
            </div>
            <label className="space-y-1 text-[11px] text-muted">
              <span>Background opacity ({style.pageBackgroundOpacity.toFixed(2)})</span>
              <input
                type="range"
                name="pageBackgroundOpacity"
                min="0"
                max="1"
                step="0.05"
                value={style.pageBackgroundOpacity}
                onChange={(event) => onStyleChange("pageBackgroundOpacity", Number(event.target.value))}
                className="w-full accent-brand"
              />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Color controls</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <label key={field.key} className="space-y-1 text-[11px] text-muted">
                <span>{field.label}</span>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1.5">
                  <input
                    type="color"
                    name={field.key}
                    value={String(style[field.key])}
                    onChange={(event) => onStyleChange(field.key, event.target.value)}
                    className="h-8 w-10 rounded border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-[11px] text-foreground">{style[field.key]}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Typography & layout</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {NUMBER_FIELDS.map((field) => (
              <label key={field.key} className="space-y-1 text-[11px] text-muted">
                <span>{field.label}</span>
                <Input
                  type="number"
                  name={field.key}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  value={String(style[field.key])}
                  onChange={(event) => onStyleChange(field.key, Number(event.target.value))}
                  className="h-9 text-xs"
                />
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full h-8 text-xs gap-1.5" disabled={styleTransition || backgroundUploading}>
          {styleTransition && <Loader2 className="size-3 animate-spin" />}
          Save style
        </Button>
      </form>
    </div>
  );
}
